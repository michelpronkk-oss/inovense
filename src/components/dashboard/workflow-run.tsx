"use client";

import { useRouter } from "next/navigation";
import { FlowIcon, CheckIcon } from "@/components/dashboard/icons";

const STEPS = [
  { n: "01", name: "Enrich record", sub: "Clearbit + memory", state: "done" },
  { n: "02", name: "Qualify lead", sub: "Revenue agent", state: "done" },
  { n: "03", name: "Draft reply", sub: "GPT · brand voice", state: "active" },
  { n: "04", name: "Human approval", sub: "Slack #revops", state: "pending" },
  { n: "05", name: "Send & log", sub: "Gmail · HubSpot", state: "pending" },
] as const;

export function WorkflowRunPanel() {
  const router = useRouter();

  return (
    <div className="p">
      <div className="p-head">
        <h3><FlowIcon size={13} /> Current workflow run · #4,812</h3>
        <div className="p-meta">
          <span className="dot dot-cyan pulsing" /> running · 00:00:14 · Revenue Operator
        </div>
      </div>
      <div className="wfx-card">
        <div className="wfx-head">
          <div className="wfx-title-row">
            <span className="pill pill-cyan">inbound</span>
            <div>
              <div className="wfx-title">New inbound lead - Northwind Co.</div>
              <div className="wfx-sub">workflow/inbound-revenue · v8</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/logs")}>View logs</button>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/app/workflows")}>Open workflow</button>
          </div>
        </div>
        <div className="wfx-progress">
          <div className="wfx-progress-bar" />
        </div>
        <div className="wfx-steps">
          {STEPS.map((s) => (
            <div className={`wfx-step ${s.state}`} key={s.n}>
              <span className="num">
                {s.state === "done" && <CheckIcon size={10} />}
                {s.state === "active" && <span className="dot dot-cyan pulsing" />}
                {s.state === "pending" && (
                  <span style={{ width: 6, height: 6, borderRadius: 50, background: "currentColor", display: "inline-block" }} />
                )}
                step {s.n}
              </span>
              <div className="wfx-step-name">{s.name}</div>
              <div className="wfx-step-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
