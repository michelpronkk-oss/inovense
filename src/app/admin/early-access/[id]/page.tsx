import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllowedEarlyAccessTransition, getEarlyAccessRequest, earlyAccessPriority, type EarlyAccessStatus } from "@/lib/admin/early-access";
import { PLAN_LABELS } from "@/lib/plan-identity";
import { updateEarlyAccessNotes, updateEarlyAccessStatus } from "../actions";

export const metadata: Metadata = { title: "Applicant | Early Access | Auterim Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const statusLabel: Record<EarlyAccessStatus, string> = { requested: "Requested", reviewing: "Reviewing", invited: "Invited", accepted: "Accepted", declined: "Declined" };
const displayDate = (value: string | null) => value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : "Not recorded";
const feedback: Record<string, string> = {
  "status-updated": "Request status updated.", "notes-saved": "Private note saved.",
  "invalid-transition": "That status transition is not allowed.", invalid: "The requested update could not be validated.",
  unavailable: "This request is no longer available.", conflict: "The request changed in another session. Refresh and try again.",
  "save-failed": "The note could not be saved.", "invalid-notes": "Notes must be 5,000 characters or fewer.",
};

function Value({ children }: { children: React.ReactNode }) { return <div className="ea-detail-value">{children || <span className="ea-muted-value">Not provided</span>}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="ea-detail-field"><small>{label}</small><Value>{children}</Value></div>; }

export default async function EarlyAccessDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const row = await getEarlyAccessRequest(id);
  if (!row) notFound();
  const result = query.result ? feedback[query.result] : null;
  const next = (to: EarlyAccessStatus) => getAllowedEarlyAccessTransition(row.status, to);
  const priority = earlyAccessPriority(row);
  const plan = row.interested_plan ? PLAN_LABELS[row.interested_plan] ?? row.interested_plan : "No plan selected";
  const confirmationState = row.confirmation_sent_at ? "Confirmation sent" : row.confirmation_attempted_at ? "Attempted · delivery unconfirmed" : "Not attempted";

  return <div className="admin-command-center ea-detail-page">
    <div className="ea-detail-back"><Link href="/early-access">← Back to applicants</Link><span>Request ID <code>{row.id}</code></span></div>
    <div className="admin-page-intro">
      <div><div className="admin-kicker"><span className="admin-status-dot live" />Early Access applicant</div><h1>{row.name}</h1><p>{row.company} · requested {displayDate(row.created_at)}</p></div>
      <div className="ea-detail-head-state"><span className={`ea-priority ${priority === "High" ? "high" : "normal"}`}>{priority} priority</span><span className={`ea-status ea-status-${row.status}`}>{statusLabel[row.status]}</span></div>
    </div>
    {result && <div className={`ea-feedback ${query.result?.includes("invalid") || query.result === "save-failed" || query.result === "conflict" ? "warning" : "success"}`} role="status">{result}</div>}

    <div className="ea-detail-grid">
      <section className="ea-detail-section">
        <div className="ea-detail-section-heading"><div><div className="admin-eyebrow">Applicant</div><h2>Company and team</h2></div></div>
        <div className="ea-detail-fields">
          <Field label="Name">{row.name}</Field><Field label="Work email"><a href={`mailto:${row.email}`}>{row.email}</a></Field>
          <Field label="Company">{row.company}</Field><Field label="Role">{row.role}</Field><Field label="Team size">{row.team_size}</Field>
        </div>
      </section>
      <section className="ea-detail-section">
        <div className="ea-detail-section-heading"><div><div className="admin-eyebrow">Request</div><h2>Use case and intent</h2></div><span className="ea-plan-label">{plan}</span></div>
        <div className="ea-use-case">{row.use_case}</div>
        <div className="ea-detail-fields ea-request-facts"><Field label="Requested">{displayDate(row.created_at)}</Field><Field label="Plan interest">{plan}</Field><Field label="Qualification rule">{priority} · transparent rule</Field></div>
        <p className="ea-priority-explainer">High means 3 or more clear signals: business email, team of 6+, a detailed use case, and Workforce or Scale interest. This is a sorting aid, not a prediction.</p>
      </section>
      <section className="ea-detail-section ea-detail-attribution">
        <div className="ea-detail-section-heading"><div><div className="admin-eyebrow">Attribution</div><h2>Acquisition context</h2></div></div>
        <div className="ea-detail-fields">
          <Field label="Source">{row.source}</Field><Field label="Source path"><code>{row.source_path}</code></Field>
          <Field label="Referrer">{row.referrer ? <a href={row.referrer} rel="noreferrer" target="_blank">{row.referrer}</a> : null}</Field>
          <Field label="UTM source">{row.utm_source}</Field><Field label="UTM medium">{row.utm_medium}</Field><Field label="UTM campaign">{row.utm_campaign}</Field>
          <Field label="UTM content">{row.utm_content}</Field><Field label="UTM term">{row.utm_term}</Field>
        </div>
      </section>
      <section className="ea-detail-section">
        <div className="ea-detail-section-heading"><div><div className="admin-eyebrow">Confirmation email</div><h2>Delivery state</h2></div></div>
        <div className="ea-detail-fields ea-request-facts"><Field label="State">{confirmationState}</Field><Field label="Sent at">{displayDate(row.confirmation_sent_at)}</Field><Field label="Last attempted">{displayDate(row.confirmation_attempted_at)}</Field></div>
        <p className="ea-detail-help">A recorded send means the mail provider accepted it; no downstream mailbox delivery receipt is stored.</p>
      </section>
      <section className="ea-detail-section ea-detail-status-section">
        <div className="ea-detail-section-heading"><div><div className="admin-eyebrow">Controlled lifecycle</div><h2>Request status</h2></div></div>
        <div className="ea-lifecycle-steps">{["requested", "reviewing", "invited", "accepted", "declined"].map((status) => <span key={status} className={`ea-lifecycle-step${status === row.status ? " current" : ""}`}>{statusLabel[status as EarlyAccessStatus]}</span>)}</div>
        <div className="ea-status-actions">
          {next("reviewing") && <form action={updateEarlyAccessStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="reviewing" /><button type="submit" className="ea-button-primary">Begin review</button></form>}
          {next("invited") && <form action={updateEarlyAccessStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="invited" /><button type="submit" className="ea-button-primary">Invite to Early Access</button></form>}
          {next("declined") && <form action={updateEarlyAccessStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="declined" /><button type="submit" className="ea-button-secondary">Decline request</button></form>}
          {next("accepted") && <form action={updateEarlyAccessStatus}><input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="accepted" /><button type="submit" className="ea-button-primary">Mark accepted</button></form>}
          {!next("reviewing") && !next("invited") && !next("declined") && !next("accepted") && <span className="ea-detail-help">This request is in a terminal state. No further transition is available.</span>}
        </div>
        {row.status === "reviewing" && <p className="ea-invite-limit">This records an invite decision only. The existing workspace invitation flow requires an authenticated workspace and does not safely support Early Access applicants, so no invite email or account is created here.</p>}
        <div className="ea-review-meta"><span>Last reviewed <strong>{displayDate(row.reviewed_at)}</strong></span><span>Reviewed by <strong>{row.reviewerEmail || row.reviewed_by || "Not recorded"}</strong></span></div>
      </section>
      <section className="ea-detail-section ea-notes-section">
        <div className="ea-detail-section-heading"><div><div className="admin-eyebrow">Private internal context</div><h2>Founder notes</h2></div><span>Visible to internal admins</span></div>
        <form action={updateEarlyAccessNotes} className="ea-notes-form"><input type="hidden" name="id" value={row.id} /><label htmlFor="early-access-notes">Notes</label><textarea id="early-access-notes" name="notes" maxLength={5000} rows={6} defaultValue={row.notes ?? ""} placeholder="Context, follow-up, and decision rationale…" /><div className="ea-notes-form-footer"><span>Up to 5,000 characters</span><button type="submit" className="ea-button-primary">Save private note</button></div></form>
      </section>
    </div>
  </div>;
}
