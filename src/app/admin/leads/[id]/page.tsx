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
  DeleteLeadButton,
} from "./lead-editor";
import { EmailActionsPanel } from "./email-composer";
import { ProposalEditor, PaymentEditor, ProjectStatusEditor } from "./commercial-editor";
import { getFieldsForLane } from "@/app/onboarding/fields";

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
      <div className="border-b border-zinc-800/60 bg-zinc-900/60 px-5 py-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-600">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function formatEuro(value: number) {
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
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
            <h1 className="text-xl font-semibold text-zinc-50">
              {lead.full_name}
            </h1>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Left: data */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Active project banner */}
          {(lead.status === "active" || lead.status === "won") && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-emerald-600">
                    {lead.status === "won" ? "Project complete" : "Active project"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-emerald-400">
                    {lead.company_name} &middot; {lead.service_lane}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                  {effectiveDepositAmount != null && (
                    <span>
                      <span className="mr-1 text-zinc-700">Deposit</span>
                      <span className="font-medium text-zinc-400">
                        {formatEuro(Number(effectiveDepositAmount))}
                      </span>
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

          <Section title="Contact">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
          </Section>

          <Section title="Project">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Service lane" value={lead.service_lane} />
              <Field label="Project type" value={lead.project_type} />
              <Field label="Budget range" value={lead.budget_range} />
              <Field label="Timeline" value={lead.timeline} />
            </div>
          </Section>

          <Section title="Project brief">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
              {lead.project_details}
            </p>
          </Section>

          {/* Onboarding brief — visible when completed */}
          {onboardingFields && lead.onboarding_data && (
            <Section title="Onboarding brief">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

        {/* Right: actions */}
        <div className="flex flex-col gap-4">

          <Section title="Status">
            <StatusUpdater id={lead.id} currentStatus={lead.status} />
          </Section>

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
            />
          </Section>

          <Section title="Proposal">
            <ProposalEditor
              id={lead.id}
              currentUrl={null}
              currentBody={lead.proposal_intro ?? null}
              currentNotes={lead.proposal_notes ?? null}
              currentProposalPrice={lead.proposal_price}
              currentProposalDeposit={lead.proposal_deposit}
              proposalToken={lead.proposal_token}
              proposalSentAt={lead.proposal_sent_at}
            />
          </Section>

          <Section title="Contract">
            <Link
              href={`/admin/leads/${lead.id}/contract`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700/40 hover:text-zinc-100"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M7 1v8M4 6l3 3 3-3M2 11h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate contract PDF
            </Link>
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
              Project, retainer, or collaboration agreement.
            </p>
          </Section>

          <Section title="Payment">
            <PaymentEditor
              id={lead.id}
              currentPaymentLink={lead.payment_link}
              currentInvoiceReference={lead.invoice_reference}
              proposalDeposit={lead.proposal_deposit}
              currentDepositAmount={lead.deposit_amount}
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

          <Section title="Onboarding">
            <OnboardingManager
              id={lead.id}
              onboardingStatus={lead.onboarding_status}
              onboardingToken={lead.onboarding_token}
              onboardingSentAt={lead.onboarding_sent_at}
              onboardingCompletedAt={lead.onboarding_completed_at}
            />
          </Section>

          <Section title="Next step">
            <NextStepEditor
              id={lead.id}
              currentNextStep={lead.internal_next_step}
            />
          </Section>

          <Section title="Internal notes">
            <NotesEditor id={lead.id} currentNotes={lead.notes} />
          </Section>

          <Section title="Details">
            <div className="space-y-4">
              <Field label="Submitted">
                <p className="text-sm tabular-nums text-zinc-400">
                  {format(new Date(lead.created_at), "PPpp")}
                </p>
              </Field>
              {lead.lead_source && (
                <Field
                  label="Source"
                  value={LEAD_SOURCE_LABELS[lead.lead_source] ?? lead.lead_source}
                />
              )}
              <Field label="Lead ID">
                <p className="font-mono text-xs text-zinc-600">{lead.id}</p>
              </Field>
              <div className="border-t border-zinc-800/60 pt-3">
                <DeleteLeadButton id={lead.id} />
              </div>
            </div>
          </Section>

          {/* Email log — visible once emails have been sent */}
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
      </div>
    </>
  );
}
