import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createSupabaseServerClient,
  type Lead,
  type EmailLog,
} from "@/lib/supabase-server";
import { format } from "date-fns";
import { STATUS_CONFIG, LANE_COLORS, EMAIL_TYPE_LABELS, LEAD_SOURCE_LABELS } from "@/app/admin/config";
import {
  StatusUpdater,
  NotesEditor,
  NextStepEditor,
  OnboardingManager,
  ClientPortalLinkManager,
  DeleteLeadButton,
} from "./lead-editor";
import { EmailActionsPanel } from "./email-composer";
import { ProposalEditor, PaymentEditor, ProjectStatusEditor } from "./commercial-editor";
import { getFieldsForLane } from "@/app/onboarding/fields";
import { IntelligencePanel } from "./intelligence-panel";
import { RevenueCard } from "./revenue-card";
import type { LeadResearchOutput } from "@/lib/agents/lead-research/schema";
import type { ProposalAngleOutput } from "@/lib/agents/proposal-angle/schema";
import type { ProposalWriterOutput } from "@/lib/agents/proposal-writer/schema";
import { formatUsdPrimaryWithLocalSecondary } from "@/lib/currency";
import { MarketMarker } from "@/app/admin/market-marker";
import { formatReminderAge, getLifecycleReminders } from "@/lib/lifecycle-reminders";
import { snoozeReminder } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("leads")
      .select("full_name, company_name")
      .eq("id", id)
      .single();
    if (data) {
      return {
        title: `${data.full_name} / ${data.company_name} | Inovense CRM`,
      };
    }
  } catch {}
  return { title: "Lead | Inovense CRM" };
}

function SectionGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-0.5 pt-1">
      <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-700">
        {children}
      </p>
      <div className="h-px flex-1 bg-zinc-800/50" />
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
        {label}
      </p>
      {children ?? (
        <p className="text-sm text-zinc-300">
          {value || <span className="text-zinc-600">Not provided</span>}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lead: Lead | null = null;
  let emailLogs: EmailLog[] = [];

  try {
    const supabase = createSupabaseServerClient();

    const [leadResult, logResult] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase
        .from("lead_email_log")
        .select("*")
        .eq("lead_id", id)
        .order("sent_at", { ascending: false })
        .limit(20),
    ]);

    if (leadResult.error || !leadResult.data) return notFound();
    lead = leadResult.data as Lead;
    emailLogs = (logResult.data ?? []) as EmailLog[];
  } catch {
    return notFound();
  }

  const onboardingFields =
    lead.onboarding_status === "completed" && lead.onboarding_data
      ? getFieldsForLane(lead.service_lane)
      : null;

  const firstName = lead.full_name.split(" ")[0];
  const effectiveDepositAmount = lead.deposit_amount ?? lead.proposal_deposit;
  const effectiveDepositDisplay = formatUsdPrimaryWithLocalSecondary({
    amountLocal: effectiveDepositAmount,
    localCurrencyCode: lead.local_currency_code,
    usdFxRateLocked: lead.usd_fx_rate_locked,
  });
  const lifecycleReminders = getLifecycleReminders(lead);

  return (
    <>
      {/* Back nav */}
      <div className="mb-6">
        <Link
          href="/admin/leads"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to leads
        </Link>

        {/* Lead header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-zinc-50">
                {lead.full_name}
              </h1>
              <MarketMarker
                countryCode={lead.country_code}
                countrySource={lead.country_source}
                leadSource={lead.lead_source}
              />
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {lead.company_name}
              <span className="mx-2 text-zinc-700">&middot;</span>
              {format(new Date(lead.created_at), "MMM d, yyyy, h:mm a")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                LANE_COLORS[lead.service_lane] ?? LANE_COLORS.default
              }`}
            >
              {lead.service_lane}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                STATUS_CONFIG[lead.status]?.color ?? STATUS_CONFIG.new.color
              }`}
            >
              {STATUS_CONFIG[lead.status]?.label ?? lead.status}
            </span>
            {lead.lead_source && (
              <span className="inline-flex items-center rounded-full border border-zinc-700/50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
                {LEAD_SOURCE_LABELS[lead.lead_source] ?? lead.lead_source}
              </span>
            )}
          </div>
        </div>
      </div>

      {/*
        Grid layout:
        - Mobile: single column, actions column first (Revenue/Status/Email visible immediately)
        - Desktop: data left (2 cols), actions right (1 col)
        Achieved by placing actions div first in DOM with lg:col-start-3,
        and data div second with lg:col-span-2 lg:col-start-1.
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Actions (mobile: top, desktop: right column) ───────────────── */}
        <div className="flex flex-col gap-3 lg:col-start-3 lg:row-start-1">

          <RevenueCard
            leadId={lead.id}
            proposalPrice={lead.proposal_price}
            proposalDeposit={lead.proposal_deposit}
            depositAmount={lead.deposit_amount}
            depositPaidAt={lead.deposit_paid_at ?? null}
            initialFinalPaymentPaidAt={lead.final_payment_paid_at ?? null}
            localCurrencyCode={lead.local_currency_code}
            usdFxRateLocked={lead.usd_fx_rate_locked}
          />

          {lifecycleReminders.length > 0 && (
            <Section title="Needs attention">
              <div className="space-y-2.5">
                {lifecycleReminders.map((reminder) => {
                  const isStalled = reminder.urgency === "stalled";
                  return (
                    <div
                      key={reminder.kind}
                      className={`rounded-lg border px-3 py-2.5 ${
                        isStalled
                          ? "border-orange-500/25 bg-orange-500/8"
                          : "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-medium ${isStalled ? "text-orange-100" : "text-amber-100"}`}>
                          {reminder.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`text-[10px] font-medium uppercase tracking-[0.08em] ${isStalled ? "text-orange-300/85" : "text-amber-200/85"}`}>
                            {formatReminderAge(reminder)}
                          </span>
                          <form action={snoozeReminder}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="kind" value={reminder.kind} />
                            <input type="hidden" name="days" value="3" />
                            <button type="submit" className="text-[10px] text-zinc-700 transition-colors hover:text-zinc-400">
                              · 3d
                            </button>
                          </form>
                          <form action={snoozeReminder}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="kind" value={reminder.kind} />
                            <input type="hidden" name="days" value="7" />
                            <button type="submit" className="text-[10px] text-zinc-700 transition-colors hover:text-zinc-400">
                              · 7d
                            </button>
                          </form>
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{reminder.summary}</p>
                      <p className="mt-1 text-[11px] text-zinc-600">{reminder.nextAction}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-4 py-3">
            <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Stage
            </p>
            <StatusUpdater id={lead.id} currentStatus={lead.status} />
          </div>

          <Section title="Send email">
            <EmailActionsPanel
              leadId={lead.id}
              firstName={firstName}
              company={lead.company_name}
              workEmail={lead.work_email}
              leadSource={lead.lead_source}
              onboardingToken={lead.onboarding_token}
              proposalToken={lead.proposal_token}
              proposalDeposit={lead.proposal_deposit}
              paymentDepositAmount={lead.deposit_amount}
              localCurrencyCode={lead.local_currency_code}
              proposalWriterDraft={
                lead.proposal_writer
                  ? (lead.proposal_writer as ProposalWriterOutput)
                      .proposal_email_prefill
                  : null
              }
            />
          </Section>

          <IntelligencePanel
            leadId={lead.id}
            research={(lead.research_audit as LeadResearchOutput | null) ?? null}
            angle={(lead.proposal_angle as ProposalAngleOutput | null) ?? null}
            writer={(lead.proposal_writer as ProposalWriterOutput | null) ?? null}
            angleAppliedAt={lead.proposal_angle_applied_at ?? null}
            writerAppliedAt={lead.proposal_writer_applied_at ?? null}
          />

          <SectionGroup>Commercial</SectionGroup>

          <Section title="Proposal">
            <ProposalEditor
              id={lead.id}
              currentUrl={null}
              currentTitle={lead.proposal_title ?? null}
              currentBody={lead.proposal_intro ?? null}
              currentScope={lead.proposal_scope ?? null}
              currentDeliverables={lead.proposal_deliverables ?? null}
              currentTimeline={lead.proposal_timeline ?? null}
              currentNotes={lead.proposal_notes ?? null}
              currentProposalPrice={lead.proposal_price}
              currentProposalDeposit={lead.proposal_deposit}
              localCurrencyCode={lead.local_currency_code}
              usdFxRateLocked={lead.usd_fx_rate_locked}
              proposalToken={lead.proposal_token}
              proposalSentAt={lead.proposal_sent_at}
            />
          </Section>

          <div className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
              Contract
            </p>
            <Link
              href={`/admin/leads/${lead.id}/contract`}
              className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M7 1v8M4 6l3 3 3-3M2 11h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate PDF
            </Link>
          </div>

          <Section title="Payment">
            <PaymentEditor
              id={lead.id}
              currentPaymentLink={lead.payment_link}
              currentInvoiceReference={lead.invoice_reference}
              proposalDeposit={lead.proposal_deposit}
              currentDepositAmount={lead.deposit_amount}
              currentLocalCurrencyCode={lead.local_currency_code}
              currentUsdFxRateLocked={lead.usd_fx_rate_locked}
              currentCountryCode={lead.country_code}
              depositPaidAt={lead.deposit_paid_at}
              currentProjectStartDate={lead.project_start_date}
            />
          </Section>

          <Section title="Project status">
            <ProjectStatusEditor
              id={lead.id}
              currentProjectStatus={lead.project_status}
              depositPaidAt={lead.deposit_paid_at}
              onboardingStatus={lead.onboarding_status}
              projectStartDate={lead.project_start_date}
            />
          </Section>

          <SectionGroup>Delivery</SectionGroup>

          <Section title="Onboarding">
            <OnboardingManager
              id={lead.id}
              onboardingStatus={lead.onboarding_status}
              onboardingToken={lead.onboarding_token}
              onboardingSentAt={lead.onboarding_sent_at}
              onboardingCompletedAt={lead.onboarding_completed_at}
            />
          </Section>

          <Section title="Client portal">
            <ClientPortalLinkManager
              id={lead.id}
              proposalToken={lead.proposal_token}
            />
          </Section>

          <SectionGroup>Notes</SectionGroup>

          <Section title="Next step">
            <NextStepEditor
              id={lead.id}
              currentNextStep={lead.internal_next_step}
            />
          </Section>

          <Section title="Internal notes">
            <NotesEditor id={lead.id} currentNotes={lead.notes} />
          </Section>

          <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/20">
            <div className="divide-y divide-zinc-800/40 px-4">
              <div className="flex items-center justify-between py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-700">
                  Submitted
                </p>
                <p className="text-[11px] tabular-nums text-zinc-500">
                  {format(new Date(lead.created_at), "MMM d, yyyy, h:mm a")}
                </p>
              </div>
              {lead.lead_source && (
                <div className="flex items-center justify-between py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-700">
                    Source
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {LEAD_SOURCE_LABELS[lead.lead_source] ?? lead.lead_source}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-700">
                  Lead ID
                </p>
                <p className="font-mono text-[10px] text-zinc-700">{lead.id}</p>
              </div>
            </div>
            <div className="border-t border-zinc-800/60 px-4 py-3">
              <DeleteLeadButton id={lead.id} />
            </div>
          </div>

          {/* Attribution context — only shown when at least one field is present */}
          {(lead.first_touch_source ||
            lead.landing_path ||
            lead.referrer_host ||
            lead.utm_source) && (
            <Section title="Attribution">
              <div className="space-y-3.5">
                {lead.first_touch_source && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                      First touch
                    </p>
                    <p className="text-xs text-zinc-400 capitalize">{lead.first_touch_source}</p>
                  </div>
                )}
                {lead.last_touch_source &&
                  lead.last_touch_source !== lead.first_touch_source && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                        Last touch
                      </p>
                      <p className="text-xs text-zinc-400 capitalize">{lead.last_touch_source}</p>
                    </div>
                  )}
                {lead.landing_path && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                      Landing page
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500">{lead.landing_path}</p>
                  </div>
                )}
                {lead.referrer_host && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                      Referrer
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500">{lead.referrer_host}</p>
                  </div>
                )}
                {lead.utm_source && (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                      UTM
                    </p>
                    <p className="text-right font-mono text-[11px] text-zinc-500">
                      {[lead.utm_source, lead.utm_medium, lead.utm_campaign]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </div>
                )}
                {lead.attribution_captured_at && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                      Captured
                    </p>
                    <p className="text-[11px] tabular-nums text-zinc-600">
                      {format(new Date(lead.attribution_captured_at), "MMM d, yyyy, h:mm a")}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {emailLogs.length > 0 && (
            <Section title="Emails sent">
              <ul className="space-y-3">
                {emailLogs.map((log) => (
                  <li key={log.id} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-400">
                        {EMAIL_TYPE_LABELS[log.email_type] ?? log.email_type}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-zinc-700">
                        {format(new Date(log.sent_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-zinc-600">
                      {log.subject}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* ── Data (mobile: below actions, desktop: left 2-col span) ─────── */}
        <div className="flex flex-col gap-3 lg:col-span-2 lg:col-start-1 lg:row-start-1">

          {/* Active project banner */}
          {(lead.status === "active" || lead.status === "won") && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-emerald-600">
                    {lead.status === "won" ? "Project complete" : "Active project"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-emerald-400">
                    {lead.company_name} &middot; {lead.service_lane}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 sm:gap-4">
                  {effectiveDepositAmount != null && (
                    <span>
                      <span className="mr-1 text-zinc-700">Deposit</span>
                      <span className="font-medium text-zinc-400">
                        {effectiveDepositDisplay.primary}
                      </span>
                      {!effectiveDepositDisplay.conversionUnavailable && (
                        <span className="ml-1 text-[11px] text-zinc-600">
                          {effectiveDepositDisplay.secondary}
                        </span>
                      )}
                    </span>
                  )}
                  {lead.project_start_date && (
                    <span>
                      <span className="mr-1 text-zinc-700">Started</span>
                      <span className="font-medium text-zinc-400 tabular-nums">
                        {format(
                          new Date(lead.project_start_date + "T12:00:00"),
                          "MMM d, yyyy"
                        )}
                      </span>
                    </span>
                  )}
                  {lead.deposit_paid_at && (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                      <span className="text-emerald-600/80">Deposit paid</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
                Client
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <Field label="Full name" value={lead.full_name} />
              <Field label="Company" value={lead.company_name} />
              <Field label="Work email">
                <a
                  href={`mailto:${lead.work_email}`}
                  className="text-sm text-brand transition-colors hover:text-brand/80"
                >
                  {lead.work_email}
                </a>
              </Field>
              <Field label="Website or social" value={lead.website_or_social} />
            </div>
            <div className="grid grid-cols-1 gap-4 border-t border-zinc-800/50 p-4 sm:grid-cols-2">
              <Field label="Lane" value={lead.service_lane} />
              <Field label="Type" value={lead.project_type} />
              <Field label="Budget" value={lead.budget_range} />
              <Field label="Timeline" value={lead.timeline} />
            </div>
          </div>

          <Section title="Project brief">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
              {lead.project_details}
            </p>
          </Section>

          {onboardingFields && lead.onboarding_data && (
            <Section title="Onboarding brief">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {onboardingFields.map((field) => {
                  const value = lead.onboarding_data![field.key];
                  if (!value) return null;
                  return (
                    <div
                      key={field.key}
                      className={
                        field.type === "textarea" ? "sm:col-span-2" : ""
                      }
                    >
                      <Field label={field.label} value={value} />
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
