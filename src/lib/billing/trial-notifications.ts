import "server-only";

import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanByTier, type CheckoutPlanTier } from "@/lib/pricing";
import { appHref } from "@/lib/urls";

export type TrialNotificationType = "trial_started" | "trial_ending" | "trial_expired" | "trial_converted" | "payment_failed" | "subscription_canceled";

type Supabase = SupabaseClient;

function subjectFor(type: TrialNotificationType): string {
  return {
    trial_started: "Your Auterim trial is active",
    trial_ending: "Your Auterim trial ends tomorrow",
    trial_expired: "Your Auterim trial has ended",
    trial_converted: "Your Auterim workspace is now active",
    payment_failed: "Payment needs attention for Auterim",
    subscription_canceled: "Your Auterim subscription was cancelled",
  }[type];
}

function textFor(input: { type: TrialNotificationType; plan?: CheckoutPlanTier; trialEndsAt?: string }): string {
  const plan = input.plan ? getPlanByTier(input.plan) : undefined;
  const planLine = plan ? `${plan.plan_name} is ${plan.price}/month.` : "";
  const end = input.trialEndsAt ? ` Trial access ends ${new Date(input.trialEndsAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.` : "";
  const app = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.auterim.com"}${appHref("/plans")}`;
  const copy: Record<TrialNotificationType, string> = {
    trial_started: `Your three-day Auterim trial is active.${end} ${planLine} Connect the systems you need and keep consequential work under approval.`,
    trial_ending: `Your Auterim trial ends in about 24 hours.${end} ${planLine} Choose how you want to continue before live execution pauses.`,
    trial_expired: "Your trial has ended and live execution is paused. Your workspace configuration is still available whenever you choose a plan.",
    trial_converted: `Your Auterim workspace is active. ${planLine} Your approval policies and connected systems stay in place.`,
    payment_failed: "We could not confirm your latest Auterim payment. Live execution may pause until billing is resolved.",
    subscription_canceled: "Your Auterim subscription was cancelled. Your workspace configuration remains available, while live execution is paused when the current access period ends.",
  };
  return `${copy[input.type]}\n\nManage your workspace: ${app}`;
}

async function workspaceRecipient(supabase: Supabase, workspaceId: string): Promise<string | null> {
  const result = await supabase.from("os_workspace_members").select("email,role_key,active,status").eq("workspace_id", workspaceId).in("role_key", ["owner", "admin"]).limit(20);
  if (result.error || !Array.isArray(result.data)) return null;
  const member = result.data.find((row: Record<string, unknown>) => row.role_key === "owner" && typeof row.email === "string")
    ?? result.data.find((row: Record<string, unknown>) => typeof row.email === "string");
  return typeof member?.email === "string" ? member.email : null;
}

export async function sendTrialLifecycleEmail(input: { supabase: Supabase; workspaceId: string; eventKey: string; type: TrialNotificationType; plan?: CheckoutPlanTier; trialEndsAt?: string }) {
  const reserved = await input.supabase.from("os_billing_notifications").insert({ workspace_id: input.workspaceId, notification_type: input.type, event_key: input.eventKey }).select("id").maybeSingle();
  if (reserved.error || !reserved.data?.id) return { sent: false, reason: "deduplicated_or_unavailable" };

  const recipient = await workspaceRecipient(input.supabase, input.workspaceId);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !recipient) {
    await input.supabase.from("os_billing_notifications").update({ delivery_status: "skipped" }).eq("id", reserved.data.id);
    return { sent: false, reason: !apiKey ? "resend_unconfigured" : "recipient_unavailable" };
  }
  try {
    await new Resend(apiKey).emails.send({ from: process.env.RESEND_FROM_EMAIL ?? "Auterim <onboarding@resend.dev>", to: recipient, subject: subjectFor(input.type), text: textFor(input) });
    await input.supabase.from("os_billing_notifications").update({ delivery_status: "sent", sent_at: new Date().toISOString() }).eq("id", reserved.data.id);
    return { sent: true };
  } catch (error) {
    await input.supabase.from("os_billing_notifications").update({ delivery_status: "failed", failure_message: error instanceof Error ? error.message.slice(0, 400) : "email_delivery_failed" }).eq("id", reserved.data.id);
    console.error("[billing.email] lifecycle delivery failed", { workspaceId: input.workspaceId, type: input.type });
    return { sent: false, reason: "delivery_failed" };
  }
}
