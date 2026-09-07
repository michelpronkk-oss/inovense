import "server-only";

import { requireInternalAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/server/supabase-admin";

type Row = Record<string, unknown>;
type Availability = "connected" | "partial" | "unavailable";

export type RevenueData = {
  sourceStatus: Availability;
  mrr: number | null;
  mrrNote: string;
  subscriptionStates: { active: number | null; trialing: number | null; pastDue: number | null };
  billingEvents: { received: number | null; processed: number | null; needsReview: number | null; failed: number | null };
  workspaces: Array<{ id: string; name: string; plan: string; billingStatus: string; updatedAt: string | null }>;
  subscriptionsAvailable: boolean;
  unavailable?: string;
};

const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object") : [];

async function safely(query: () => PromiseLike<{ data: unknown; error: unknown }>) {
  try {
    const result = await query();
    return { rows: asRows(result.data), available: !result.error };
  } catch {
    return { rows: [], available: false };
  }
}

function monthlyAmount(minor: number, count: number, interval: string): number | null {
  if (!Number.isFinite(minor) || !Number.isFinite(count) || count <= 0) return null;
  if (interval === "month") return minor / count;
  if (interval === "year") return minor / (count * 12);
  if (interval === "week") return (minor * 52) / (count * 12);
  if (interval === "day") return (minor * 365) / (count * 12);
  return null;
}

function unavailable(message: string): RevenueData {
  return {
    sourceStatus: "unavailable", mrr: null, mrrNote: message,
    subscriptionStates: { active: null, trialing: null, pastDue: null },
    billingEvents: { received: null, processed: null, needsReview: null, failed: null },
    workspaces: [], subscriptionsAvailable: false, unavailable: message,
  };
}

export async function getRevenueData(): Promise<RevenueData> {
  await requireInternalAdmin();
  if (!hasSupabaseAdminConfig()) return unavailable("Supabase is not configured.");

  const db = createSupabaseAdmin();
  const [workspaceResult, eventResult, subscriptionResult] = await Promise.all([
    safely(() => db.from("os_workspaces").select("id,name,plan_tier,billing_status,billing_updated_at").order("billing_updated_at", { ascending: false }).limit(100)),
    safely(() => db.from("os_billing_events").select("event_type,processing_status,created_at").order("created_at", { ascending: false }).limit(250)),
    safely(() => db.from("os_billing_subscriptions").select("status,currency,recurring_amount_minor,frequency_count,frequency_interval")),
  ]);

  const sourceFlags = [workspaceResult.available, eventResult.available, subscriptionResult.available];
  const sourceStatus: Availability = sourceFlags.every(Boolean) ? "connected" : sourceFlags.some(Boolean) ? "partial" : "unavailable";
  if (sourceStatus === "unavailable") return unavailable("Billing sources are unavailable in the current database.");

  const states = (state: string) => workspaceResult.rows.filter((row) => String(row.billing_status) === state).length;
  const activeSubscriptions = subscriptionResult.rows.filter((row) => String(row.status).toLowerCase() === "active");
  const onlyUsd = activeSubscriptions.every((row) => String(row.currency).toUpperCase() === "USD");
  const amounts = activeSubscriptions.map((row) => monthlyAmount(Number(row.recurring_amount_minor), Number(row.frequency_count), String(row.frequency_interval)));
  const mrrHasCompleteFacts = amounts.every((amount) => amount !== null);
  const mrrAvailable = subscriptionResult.available && onlyUsd && mrrHasCompleteFacts && (activeSubscriptions.length > 0 || states("active") === 0);
  const mrr = mrrAvailable ? amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0) / 100 : null;
  const events = eventResult.rows;
  const statusContains = (text: string) => (row: Row) => String(row.processing_status).toLowerCase().includes(text);

  return {
    sourceStatus,
    mrr,
    mrrNote: mrrAvailable
      ? "Normalized from active Dodo subscription facts."
      : !subscriptionResult.available
        ? "Apply the subscription reporting migration to normalize recurring billing facts."
        : !onlyUsd
          ? "A reporting currency is needed before multi-currency MRR can be shown."
          : "Active workspace billing exists, but recurring amount or interval is not normalized yet.",
    subscriptionStates: {
      active: workspaceResult.available ? states("active") : null,
      trialing: workspaceResult.available ? states("trialing") : null,
      pastDue: workspaceResult.available ? states("past_due") : null,
    },
    billingEvents: {
      received: eventResult.available ? events.length : null,
      processed: eventResult.available ? events.filter((row) => String(row.processing_status) === "processed").length : null,
      needsReview: eventResult.available ? events.filter(statusContains("warning")).length : null,
      failed: eventResult.available ? events.filter(statusContains("failed")).length : null,
    },
    workspaces: workspaceResult.rows.slice(0, 16).map((row) => ({
      id: String(row.id ?? "workspace"), name: String(row.name ?? "Unnamed workspace"), plan: String(row.plan_tier ?? "preview"),
      billingStatus: String(row.billing_status ?? "preview"), updatedAt: typeof row.billing_updated_at === "string" ? row.billing_updated_at : null,
    })),
    subscriptionsAvailable: subscriptionResult.available,
  };
}
