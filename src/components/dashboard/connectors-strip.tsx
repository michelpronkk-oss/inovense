import { LinkIcon } from "@/components/dashboard/icons";

const TILES = [
  { name: "Salesforce", color: "#00A1E0", letter: "SF", status: "synced 2m ago" },
  { name: "Gmail", color: "#EA4335", letter: "G", status: "live" },
  { name: "Slack", color: "#A77FBC", letter: "Sl", status: "live" },
  { name: "Notion", color: "#ECEFF3", letter: "N", status: "synced 8m" },
  { name: "Stripe", color: "#635BFF", letter: "S", status: "live" },
  { name: "Linear", color: "#5E6AD2", letter: "L", status: "synced 1m" },
  { name: "Postgres", color: "#336791", letter: "Pg", status: "synced 30s" },
];

export function ConnectorsStrip() {
  return (
    <div className="p">
      <div className="p-head">
        <h3><LinkIcon size={13} /> Connectors</h3>
        <div className="p-meta">7 connected · all healthy</div>
      </div>
      <div className="conn-strip">
        {TILES.map((t) => (
          <div className="conn-tile" key={t.name}>
            <div
              className="conn-logo"
              style={{
                color: t.color,
                background: `${t.color}15`,
                boxShadow: `inset 0 0 0 1px ${t.color}40`,
              }}
            >
              {t.letter}
            </div>
            <div className="conn-name">{t.name}</div>
            <div className="conn-meta">
              <span className="dot dot-green" /> {t.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
