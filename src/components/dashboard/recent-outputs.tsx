import { DocIcon, ArrowIcon } from "@/components/dashboard/icons";

const OUTPUTS = [
  {
    tag: "proposal", tagCls: "pill-cyan",
    agent: "Client Flow", color: "#5B8DEF",
    title: "Northwind onboarding kit",
    body: "12-page kit - pricing, SOW, kickoff checklist. Pulled from Acme Industries memory.",
    meta: "drafted 4m ago · 1,840w",
  },
  {
    tag: "brief", tagCls: "pill-amber",
    agent: "Marketing", color: "#A78BFA",
    title: "Q3 SEO content plan",
    body: "10 article angles across 3 clusters. Includes search volumes and competitor gap analysis.",
    meta: "published 23m ago · 1,420w",
  },
  {
    tag: "report", tagCls: "pill-rose",
    agent: "Operations", color: "#51D88A",
    title: "Weekly operating digest - W21",
    body: "Pipeline +18%, content +24%, ops -1.4h. Highlights 3 stalled deals worth $96k.",
    meta: "compiled 1h ago · 6 sources",
  },
];

export function RecentOutputs() {
  return (
    <div className="p">
      <div className="p-head">
        <h3><DocIcon size={13} /> Recent outputs</h3>
        <button className="appr-btn edit">All outputs</button>
      </div>
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {OUTPUTS.map((o) => (
          <div className="out-card" key={o.title}>
            <div className="out-card-head">
              <span className={`pill ${o.tagCls}`}>{o.tag}</span>
              <span className="out-card-meta" style={{ marginLeft: "auto" }}>
                <span style={{ color: o.color }}>● </span>{o.agent}
              </span>
            </div>
            <div className="out-card-title">{o.title}</div>
            <div className="out-card-body">{o.body}</div>
            <div className="out-card-foot">
              <span className="out-card-meta">{o.meta}</span>
              <button className="lnk-open">
                Open <ArrowIcon size={10} style={{ verticalAlign: -1 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
