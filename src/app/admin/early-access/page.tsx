import type { Metadata } from "next";
import Link from "next/link";
import { EARLY_ACCESS_STATUSES, EARLY_ACCESS_TEAM_SIZES, getEarlyAccessList, earlyAccessPriority, type EarlyAccessFilters, type EarlyAccessRow } from "@/lib/admin/early-access";
import { PLAN_LABELS } from "@/lib/plan-identity";

export const metadata: Metadata = { title: "Early Access | Auterim Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = { requested: "Requested", reviewing: "Reviewing", invited: "Invited", accepted: "Accepted", declined: "Declined" };
const displayDate = (value: string) => new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function queryHref(filters: EarlyAccessFilters, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) if (value !== undefined && value !== "") query.set(key, String(value));
  return `/early-access?${query.toString()}`;
}

function planLabel(value: string | null) { return value ? PLAN_LABELS[value as keyof typeof PLAN_LABELS] ?? value : "No plan"; }

function RequestSummary({ row }: { row: EarlyAccessRow }) {
  const status = row.status === "accepted" && row.acceptanceVerified !== true ? "Accepted · unverified legacy" : statusLabel[row.status] ?? row.status;
  return <>
    <span className={`ea-priority ${earlyAccessPriority(row) === "High" ? "high" : "normal"}`}>{earlyAccessPriority(row)} priority</span>
    <span className={`ea-status ea-status-${row.status}`}>{status}</span>
  </>;
}

export default async function EarlyAccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  const filters: EarlyAccessFilters = {
    status: param(search.status), plan: param(search.plan), teamSize: param(search.teamSize),
    source: param(search.source), utmSource: param(search.utmSource), from: param(search.from), to: param(search.to),
    search: param(search.search), sort: param(search.sort), page: Number(param(search.page) ?? "1"),
  };
  const list = await getEarlyAccessList(filters);
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return <div className="admin-command-center ea-command-center">
    <div className="admin-page-intro">
      <div><div className="admin-kicker"><span className={`admin-status-dot ${list.available ? "live" : "partial"}`} />Auterim / Early Access</div><h1>Applicant review.</h1><p>Evaluate demand, record internal context, and move requests through the controlled Early Access lifecycle.</p></div>
      <div className="admin-intro-meta"><span className={`admin-status-pill ${list.available ? "live" : "partial"}`}>{list.available ? `${list.total.toLocaleString()} requests` : "Source unavailable"}</span><Link className="ea-back-link" href="/">Command center</Link></div>
    </div>

    {!list.available ? <section className="admin-panel"><div className="admin-empty-compact">Early Access records are unavailable. Check the service database connection and table migration.</div></section> : <>
      <form className="ea-filter-panel" method="get" action="/early-access">
        <label className="ea-search"><span>Search applicants</span><input type="search" name="search" defaultValue={filters.search ?? ""} placeholder="Name, company, or work email" /></label>
        <label><span>Status</span><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option>{EARLY_ACCESS_STATUSES.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></label>
        <label><span>Plan interest</span><select name="plan" defaultValue={filters.plan ?? ""}><option value="">All plans</option><option value="foundation">Foundation</option><option value="workforce">Workforce</option><option value="scale">Scale</option><option value="none">No plan</option></select></label>
        <label><span>Team size</span><select name="teamSize" defaultValue={filters.teamSize ?? ""}><option value="">Any team size</option>{EARLY_ACCESS_TEAM_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <label><span>Source</span><input name="source" defaultValue={filters.source ?? ""} placeholder="e.g. homepage" /></label>
        <label><span>UTM source</span><input name="utmSource" defaultValue={filters.utmSource ?? ""} placeholder="e.g. x" /></label>
        <label><span>From</span><input type="date" name="from" defaultValue={filters.from ?? ""} /></label>
        <label><span>To</span><input type="date" name="to" defaultValue={filters.to ?? ""} /></label>
        <label><span>Sort</span><select name="sort" defaultValue={filters.sort ?? "newest"}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="company">Company</option><option value="status">Status</option><option value="team">Team size</option><option value="plan">Plan interest</option></select></label>
        <div className="ea-filter-actions"><button type="submit">Apply filters</button><Link href="/early-access">Clear</Link></div>
      </form>

      <section className="ea-list-panel" aria-label="Early Access requests">
        <div className="ea-list-heading"><div><div className="admin-eyebrow">Application queue</div><h2>{list.total.toLocaleString()} matching requests</h2></div><span>Page {list.page} of {totalPages} · newest first by default</span></div>
        {list.rows.length ? <>
          <div className="ea-desktop-table-wrap"><table className="ea-table"><thead><tr><th>Requested</th><th>Applicant</th><th>Company / role</th><th>Team</th><th>Plan</th><th>Source</th><th>UTM source</th><th>Status</th><th aria-label="Review" /></tr></thead>
            <tbody>{list.rows.map((row) => <tr key={row.id}>
              <td><time dateTime={row.created_at}>{displayDate(row.created_at)}</time></td>
              <td><Link className="ea-applicant-link" href={`/early-access/${row.id}`}>{row.name}<small>{row.email}</small></Link></td>
              <td><strong>{row.company}</strong><small>{row.role || "Role not provided"}</small></td>
              <td>{row.team_size}</td><td>{planLabel(row.interested_plan)}</td>
              <td>{row.source || "Direct"}</td><td>{row.utm_source || "—"}</td>
              <td><RequestSummary row={row} /></td><td><Link className="ea-review-link" href={`/early-access/${row.id}`} aria-label={`Review ${row.name}`}>Review <span aria-hidden>↗</span></Link></td>
            </tr>)}</tbody>
          </table></div>
          <div className="ea-mobile-list">{list.rows.map((row) => <article className="ea-mobile-card" key={row.id}>
            <div className="ea-mobile-card-top"><RequestSummary row={row} /><time dateTime={row.created_at}>{displayDate(row.created_at)}</time></div>
            <Link className="ea-applicant-link" href={`/early-access/${row.id}`}>{row.name}<small>{row.email}</small></Link>
            <strong className="ea-mobile-company">{row.company}<small>{row.role || "Role not provided"}</small></strong>
            <div className="ea-mobile-meta"><span><small>Team</small>{row.team_size}</span><span><small>Plan</small>{planLabel(row.interested_plan)}</span><span><small>Source</small>{row.utm_source || row.source || "Direct"}</span></div>
            <Link className="ea-mobile-open" href={`/early-access/${row.id}`}>Open request <span aria-hidden>→</span></Link>
          </article>)}</div>
        </> : <div className="ea-empty">No requests match these filters. Adjust the search or clear the filters.</div>}
        <nav className="ea-pagination" aria-label="Applicant list pages">
          <Link aria-disabled={list.page <= 1} href={queryHref(filters, Math.max(1, list.page - 1))}>← Previous</Link>
          <span>{list.total === 0 ? "0 requests" : `${((list.page - 1) * list.pageSize + 1).toLocaleString()}–${Math.min(list.page * list.pageSize, list.total).toLocaleString()} of ${list.total.toLocaleString()}`}</span>
          <Link aria-disabled={list.page >= totalPages} href={queryHref(filters, Math.min(totalPages, list.page + 1))}>Next →</Link>
        </nav>
      </section>
    </>}
  </div>;
}
