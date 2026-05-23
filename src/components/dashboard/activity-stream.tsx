import { ZapIcon } from "@/components/dashboard/icons";

const EVENTS = [
  { t: "14:02", agent: "RV", color: "#4DE8E1", text: "Approval requested · Reply to Aiko Tanaka", target: "run #4812" },
  { t: "14:01", agent: "MK", color: "#A78BFA", text: "Published Q3 SEO brief (1,420w)", target: "draft b-188" },
  { t: "13:58", agent: "CF", color: "#5B8DEF", text: "Created onboarding kit · Northwind", target: "kit #221" },
  { t: "13:54", agent: "RV", color: "#4DE8E1", text: "Enriched 6 new leads from inbound form", target: "batch #88" },
  { t: "13:47", agent: "OP", color: "#51D88A", text: "Scheduled Monday digest · 9:00 AM", target: "task t-19" },
  { t: "13:31", agent: "RV", color: "#4DE8E1", text: "Updated opportunity stage · $184k Northwind", target: "opp 7C-4B" },
  { t: "13:20", agent: "MK", color: "#A78BFA", text: "Paused outbound campaign - reply rate 3.1%", target: "camp #41" },
];

export function ActivityStream() {
  return (
    <div className="p">
      <div className="p-head">
        <h3><ZapIcon size={13} /> Activity</h3>
        <div className="p-meta">last 60 min · live</div>
      </div>
      <div>
        {EVENTS.map((e, i) => (
          <div className="act-row" key={i}>
            <span className="act-time">{e.t}</span>
            <span
              className="act-mark"
              style={{
                color: e.color,
                background: `${e.color}18`,
                boxShadow: `inset 0 0 0 1px ${e.color}55`,
              }}
            >
              {e.agent}
            </span>
            <span>{e.text}</span>
            <span className="act-target">{e.target}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
