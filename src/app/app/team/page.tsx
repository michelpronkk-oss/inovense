"use client";

import { useMemo, useState } from "react";
import { UsersIcon, PlusIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import type { TeamMember } from "@/lib/os/types";
import { inviteWorkspaceMember } from "./actions";

const rolePerms: Record<string, string[]> = {
  "Operator - Admin": ["All operators", "Approvals", "Settings"],
  "Operator - Reviewer": ["Approvals", "Outputs"],
  "Operator - Viewer": ["Insights", "Outputs"],
};

export default function TeamPage() {
  const { state, inviteMember, updateMember } = useOS();
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Operator - Viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string>("");

  const countLabel = useMemo(() => `${state.teamMembers.length} members`, [state.teamMembers.length]);

  const submitInvite = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setInviting(true);
    setInviteFeedback("");
    const normalizedEmail = email.trim().toLowerCase();
    const permissions = rolePerms[role] ?? ["Outputs"];
    const result = await inviteWorkspaceMember({
      workspaceId: state.workspace.id,
      workspaceName: state.workspace.name,
      inviterName: state.currentUser.name,
      inviterUserId: state.currentUser.id,
      email: normalizedEmail,
      role: role as "Operator - Admin" | "Operator - Reviewer" | "Operator - Viewer",
      permissions,
    });
    if (!result.success) {
      setInviteFeedback(result.error);
      setInviting(false);
      return;
    }
    inviteMember({ email: normalizedEmail, role, permissions });
    setInviteFeedback(result.message);
    setEmail("");
    setRole("Operator - Viewer");
    setInviting(false);
    setShowInvite(false);
  };

  return (
    <div className="os-page">
      <div className="os-page-head">
        <div>
          <span className="os-greet">Team - {countLabel}</span>
          <h1>Team</h1>
          <div className="os-page-sub">Manage who can view, approve, and configure operators in this workspace.</div>
        </div>
        <div className="os-page-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}><PlusIcon size={12} /> Invite member</button>
        </div>
      </div>

      <div className="p">
        <div className="p-head">
          <h3><UsersIcon size={13} /> Workspace members</h3>
          <div className="p-meta">{state.teamMembers.length} total</div>
        </div>
        {state.teamMembers.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)", opacity: m.active ? 1 : 0.65 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}40, ${m.color}15)`, boxShadow: `inset 0 0 0 1px ${m.color}55`, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: m.color, flexShrink: 0 }}>{m.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</span>
                <span className={`dot${m.status === "online" ? " dot-green" : ""}`} style={{ background: m.status === "online" ? "var(--green)" : "var(--text-faint)" }} />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{m.role}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {m.access.map((a) => <span key={a} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "var(--text-dim)", boxShadow: "inset 0 0 0 1px var(--line)" }}>{a}</span>)}
            </div>
            <button className="appr-btn edit" onClick={() => setEditing(m)}>Edit</button>
            <button className="appr-btn deny" onClick={() => updateMember(m.id, { active: !m.active, status: m.active ? "offline" : "online" })}>{m.active ? "Disable" : "Enable"}</button>
          </div>
        ))}
      </div>

      {(showInvite || editing) && (
        <div className="os-modal-backdrop" onClick={() => { setShowInvite(false); setEditing(null); }}>
          <div className="os-modal" style={{ maxWidth: 560, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{editing ? "Edit member" : "Invite member"}</h3>
              <button className="appr-btn deny" onClick={() => { setShowInvite(false); setEditing(null); }}>Close</button>
            </div>
            {editing ? (
              <div style={{ display: "grid", gap: 10 }}>
                <input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="os-input" />
                <input value={editing.access.join(", ")} onChange={(e) => setEditing({ ...editing, access: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="os-input" />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { updateMember(editing.id, { role: editing.role, access: editing.access }); setEditing(null); }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="os-input" />
                <select value={role} onChange={(e) => setRole(e.target.value)} className="os-input">
                  <option>Operator - Viewer</option>
                  <option>Operator - Reviewer</option>
                  <option>Operator - Admin</option>
                </select>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={submitInvite} disabled={!email.includes("@") || inviting} style={{ opacity: email.includes("@") && !inviting ? 1 : 0.55 }}>{inviting ? "Inviting..." : "Invite"}</button>
                </div>
                {inviteFeedback && <div style={{ fontSize: 12, color: inviteFeedback.toLowerCase().includes("failed") || inviteFeedback.toLowerCase().includes("valid") ? "#ff8f8f" : "#64ffd7" }}>{inviteFeedback}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
