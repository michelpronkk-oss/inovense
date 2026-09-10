"use client";

import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
  hint?: string;
  /**
   * When provided, the modal shows an explicit "Start 3-day trial" action
   * instead of the plan-required links below - used whenever the workspace
   * still has an unused trial available, so it is never told to "choose a
   * plan" while a free trial is genuinely still on offer.
   */
  onStartTrial?: () => void;
  startTrialLabel?: string;
  startTrialBusy?: boolean;
  secondaryLabel?: string;
}

export function UpgradeModal({
  open,
  onClose,
  title = "Activate real execution",
  body = "Preview mode lets you configure your operating layer. Activate a plan to connect real tools, run operators live and execute approved actions.",
  hint = "Foundation includes 3 operators, 3 connected systems and a 3-day trial.",
  onStartTrial,
  startTrialLabel = "Start 3-day trial",
  startTrialBusy = false,
  secondaryLabel = "Not now",
}: UpgradeModalProps) {
  if (!open) return null;
  return (
    <div className="os-modal-backdrop" onClick={onClose}>
      <div className="os-modal" style={{ maxWidth: 620, width: "92%" }} onClick={(e) => e.stopPropagation()}>
        <div className="os-modal-head">
          <h3>{title}</h3>
          <button className="appr-btn deny" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6 }}>
            {body}
          </p>
          <div style={{ borderRadius: 10, background: "rgba(77,232,225,0.06)", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.2)", padding: "10px 12px", fontSize: 12.5, color: "#9DEFEA" }}>
            {hint}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {onStartTrial ? (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{secondaryLabel}</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={onStartTrial} disabled={startTrialBusy}>{startTrialBusy ? "Starting…" : startTrialLabel}</button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" href="/plans">View plans</Link>
                <Link className="btn btn-primary btn-sm" href="/plans">Choose Foundation</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
