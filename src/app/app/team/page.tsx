"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UsersIcon, PlusIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import type { TeamMember } from "@/lib/os/types";
import { inviteWorkspaceMember, resendWorkspaceInvite, revokeWorkspaceInvite, updateWorkspaceMember } from "./actions";
import { getPlanLimits, isAtMemberLimit } from "@/lib/os/plans";
import { UsageBanner } from "@/components/upgrade-prompt";
import {
  INVITABLE_WORKSPACE_ROLES,
  WORKSPACE_ROLE_CAPABILITIES,
  WORKSPACE_ROLE_DESCRIPTIONS,
  WORKSPACE_ROLE_LABELS,
  canManageMembers,
  canManageTarget,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/workspace-permissions";

export default function TeamPage() {
  const { state, inviteMember, updateMember } = useOS();
  const limits = getPlanLimits(state.workspace.plan);
  const activeMemberCount = state.teamMembers.filter((member) => member.active && member.status !== "pending").length;
  const atMemberLimit = isAtMemberLimit(state.workspace.plan, activeMemberCount);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string>("");
  const [savingMember, setSavingMember] = useState(false);
  const currentRole = normalizeWorkspaceRole(undefined, state.currentUser.roleLabel);
  const canManage = canManageMembers(currentRole);
  const isOwner = currentRole === "owner";

  const countLabel = useMemo(() => `${activeMemberCount} members`, [activeMemberCount]);

  const submitInvite = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setInviting(true);
    setInviteFeedback("");
    const normalizedEmail = email.trim().toLowerCase();
    const result = await inviteWorkspaceMember({
      workspaceId: state.workspace.id,
      workspaceName: state.workspace.name,
      inviterName: state.currentUser.name,
      inviterUserId: state.currentUser.id,
      name: inviteName.trim(),
      email: normalizedEmail,
      role,
    });
    if (!result.success) {
      setInviteFeedback(result.error);
      setInviting(false);
      return;
    }
    inviteMember({ name: inviteName.trim(), email: normalizedEmail, role, permissions: WORKSPACE_ROLE_CAPABILITIES[role] });
    setInviteFeedback(result.message);
    setInviteName("");
    setEmail("");
    setRole("viewer");
    setInviting(false);
    setShowInvite(false);
  };

  const saveMember = async () => {
    if (!editing) return;
    const memberRole = normalizeWorkspaceRole(undefined, editing.role);
    setSavingMember(true);
    const result = await updateWorkspaceMember({
      workspaceId: state.workspace.id,
      memberId: editing.id,
      role: memberRole,
      active: editing.active,
    });
    setSavingMember(false);
    if (!result.success) {
      setInviteFeedback(result.error);
      return;
    }
    updateMember(editing.id, { role: WORKSPACE_ROLE_LABELS[memberRole], access: WORKSPACE_ROLE_CAPABILITIES[memberRole], active: editing.active, status: editing.active ? editing.status === "pending" ? "pending" : "online" : "offline" });
    setInviteFeedback("");
    setEditing(null);
  };

  const resendInvite = async () => {
    if (!editing || editing.status !== "pending") return;
    setSavingMember(true);
    const result = await resendWorkspaceInvite({ workspaceId: state.workspace.id, email: editing.email });
    setSavingMember(false);
    setInviteFeedback(result.success ? result.message : result.error);
  };

  const revokeInvite = async () => {
    if (!editing || editing.status !== "pending") return;
    setSavingMember(true);
    const result = await revokeWorkspaceInvite({ workspaceId: state.workspace.id, email: editing.email });
    setSavingMember(false);
    if (!result.success) {
      setInviteFeedback(result.error);
      return;
    }
    updateMember(editing.id, { active: false, status: "offline" });
    setEditing(null);
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
          {!canManage ? null : atMemberLimit ? (
            <Link
              href="/plans"
              className="btn btn-sm"
              style={{ background: "rgba(77,232,225,0.08)", color: "#4DE8E1", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
            >
              <PlusIcon size={12} /> Upgrade to add members
            </Link>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}><PlusIcon size={12} /> Invite member</button>
          )}
        </div>
      </div>

      {limits.maxTeamMembers !== -1 && (
        <UsageBanner used={activeMemberCount} max={limits.maxTeamMembers} label="team members" planLabel={limits.name} />
      )}

      <div className="p">
        <div className="p-head">
          <h3><UsersIcon size={13} /> Workspace members</h3>
          <div className="p-meta">{activeMemberCount} active</div>
        </div>
        {state.teamMembers.map((m) => (
          <div className="team-member-row" key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid var(--line)", opacity: m.active ? 1 : 0.65 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}40, ${m.color}15)`, boxShadow: `inset 0 0 0 1px ${m.color}55`, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: m.color, flexShrink: 0 }}>{m.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-mute)" }}>{WORKSPACE_ROLE_LABELS[normalizeWorkspaceRole(undefined, m.role)]}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {WORKSPACE_ROLE_CAPABILITIES[normalizeWorkspaceRole(undefined, m.role)].map((a) => <span key={a} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "var(--text-dim)", boxShadow: "inset 0 0 0 1px var(--line)" }}>{a}</span>)}
            </div>
            <div style={{ minWidth: 84, textAlign: "right", color: m.active ? "var(--text-mute)" : "#F5C26B", fontSize: 11 }}>{m.active ? m.status === "pending" ? "Pending invite" : "Active" : "Disabled"}</div>
            {canManage && canManageTarget(currentRole, normalizeWorkspaceRole(undefined, m.role)) && <button className="appr-btn edit" onClick={() => { setInviteFeedback(""); setEditing({ ...m, role: WORKSPACE_ROLE_LABELS[normalizeWorkspaceRole(undefined, m.role)] }); }}>Manage</button>}
          </div>
        ))}
      </div>

      {(showInvite || editing) && (
        <div className="os-modal-backdrop" onClick={() => { setShowInvite(false); setEditing(null); }}>
          <div className="os-modal team-access-modal" style={{ maxWidth: 620, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>{editing ? "Edit member" : "Invite member"}</h3>
              <button className="appr-btn deny" onClick={() => { setShowInvite(false); setEditing(null); }}>Close</button>
            </div>
            {editing ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div><div className="lab">{editing.name}</div><div style={{ color: "var(--text-mute)", fontSize: 12 }}>{editing.email}</div></div>
                <label className="os-profile-field"><span>Role</span><select value={normalizeWorkspaceRole(undefined, editing.role)} onChange={(e) => setEditing({ ...editing, role: WORKSPACE_ROLE_LABELS[e.target.value as WorkspaceRole] })} className="os-input">
                  {INVITABLE_WORKSPACE_ROLES.filter((option) => canManageTarget(currentRole, option) || option === normalizeWorkspaceRole(undefined, editing.role)).map((option) => <option key={option} value={option}>{WORKSPACE_ROLE_LABELS[option]}</option>)}
                </select></label>
                <div><div className="lab">Access</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{WORKSPACE_ROLE_CAPABILITIES[normalizeWorkspaceRole(undefined, editing.role)].map((item) => <span key={item} className="appr-btn edit" style={{ cursor: "default" }}>{item}</span>)}</div><div style={{ color: "var(--text-mute)", fontSize: 11.5, marginTop: 7 }}>{WORKSPACE_ROLE_DESCRIPTIONS[normalizeWorkspaceRole(undefined, editing.role)]}</div></div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  {editing.status === "pending" && <><button className="btn btn-ghost btn-sm" disabled={savingMember} onClick={() => void resendInvite()}>Resend invitation</button><button className="appr-btn deny" disabled={savingMember} onClick={() => void revokeInvite()}>Revoke invitation</button></>}
                  <button className={editing.active ? "appr-btn deny" : "btn btn-ghost btn-sm"} onClick={() => setEditing({ ...editing, active: !editing.active })}>{editing.active ? "Disable access" : "Re-enable access"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={savingMember} onClick={() => void saveMember()}>{savingMember ? "Saving..." : "Save changes"}</button>
                </div>
                {inviteFeedback && <div style={{ fontSize: 12, color: "#ff8f8f" }}>{inviteFeedback}</div>}
              </div>
            ) : (
              <div className="team-invite-form">
                <div className="team-invite-intro">
                  <span>WORKSPACE ACCESS</span>
                  <p>They&apos;ll receive one secure invitation for <strong>{state.workspace.name}</strong>.</p>
                </div>
                <div className="team-invite-fields">
                  <label>
                    <span>Name <em>optional</em></span>
                    <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Maya Laurent" autoComplete="name" className="os-input" />
                  </label>
                  <label>
                    <span>Work email</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maya@company.com" autoComplete="email" inputMode="email" className="os-input" autoFocus />
                  </label>
                </div>
                <fieldset className="team-role-picker">
                  <legend>Choose access level</legend>
                  <div className="team-role-list">
                    {INVITABLE_WORKSPACE_ROLES.filter((option) => isOwner || option !== "admin").map((option) => (
                      <button key={option} type="button" className={`team-role-row${role === option ? " active" : ""}`} onClick={() => setRole(option)}>
                        <span className="trr-dot" aria-hidden="true" />
                        <span className="trr-copy">
                          <strong>{WORKSPACE_ROLE_LABELS[option]}</strong>
                          <small>{WORKSPACE_ROLE_DESCRIPTIONS[option]}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="team-invite-summary">
                  <div><span>ACCESS INCLUDED</span><strong>{WORKSPACE_ROLE_CAPABILITIES[role].join(" · ")}</strong></div>
                  <p>Access can be changed or revoked at any time.</p>
                </div>
                <div className="team-invite-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={submitInvite} disabled={!email.includes("@") || inviting}>{inviting ? "Sending invitation..." : "Send invitation"}</button>
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
