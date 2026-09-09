"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UsersIcon, PlusIcon, XIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import type { TeamMember } from "@/lib/os/types";
import { inviteWorkspaceMember, removeWorkspaceMember, resendWorkspaceInvite, revokeWorkspaceInvite, updateWorkspaceMember } from "./actions";
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
  const { state, inviteMember, updateMember, removeMember } = useOS();
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
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);
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

  // Disable/re-enable persists immediately -- it is a distinct, reversible
  // action, not something staged behind the Role dropdown's Save changes.
  const toggleActive = async () => {
    if (!editing) return;
    const nextActive = !editing.active;
    const memberRole = normalizeWorkspaceRole(undefined, editing.role);
    setSavingMember(true);
    const result = await updateWorkspaceMember({
      workspaceId: state.workspace.id,
      memberId: editing.id,
      role: memberRole,
      active: nextActive,
    });
    setSavingMember(false);
    if (!result.success) {
      setInviteFeedback(result.error);
      return;
    }
    const patch = { active: nextActive, status: nextActive ? "online" as const : "offline" as const };
    setEditing({ ...editing, ...patch });
    updateMember(editing.id, patch);
    setInviteFeedback(nextActive ? "Access re-enabled." : "Access disabled.");
  };

  const confirmRemove = async () => {
    if (!removingMember) return;
    setRemoving(true);
    setRemoveError("");
    const result = await removeWorkspaceMember({ workspaceId: state.workspace.id, memberId: removingMember.id });
    setRemoving(false);
    if (!result.success) {
      setRemoveError(result.error);
      return;
    }
    removeMember(removingMember.id);
    setRemovingMember(null);
    setEditing(null);
  };

  return (
    <div className="os-page team-page">
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
        <div className="team-member-table-head" aria-hidden="true"><span>Person</span><span>Email</span><span>Role</span><span>Status</span><span>Actions</span></div>
        {state.teamMembers.map((m) => {
          const memberRole = normalizeWorkspaceRole(undefined, m.role);
          const statusLabel = m.active ? (m.status === "pending" ? "Pending invite" : "Active") : "Disabled";
          return (
            <div className="team-member-row" key={m.id} style={{ opacity: m.active ? 1 : 0.6 }}>
              <div className="team-member-person"><span style={{ background: `linear-gradient(135deg, ${m.color}40, ${m.color}15)`, boxShadow: `inset 0 0 0 1px ${m.color}55`, color: m.color }}>{m.initials}</span><strong>{m.name}</strong></div>
              <span className="team-member-email">{m.email}</span>
              <span className="p-chip">{WORKSPACE_ROLE_LABELS[memberRole]}</span>
              <span className="team-member-status" data-disabled={!m.active || undefined}>{statusLabel}</span>
              <div className="team-member-actions">{canManage && canManageTarget(currentRole, memberRole) && (
                <button className="appr-btn edit" onClick={() => { setInviteFeedback(""); setEditing({ ...m, role: WORKSPACE_ROLE_LABELS[memberRole] }); }}>Manage</button>
              )}</div>
            </div>
          );
        })}
      </div>

      {(showInvite || editing) && (
        <div className="os-modal-backdrop" onClick={() => { setShowInvite(false); setEditing(null); }}>
          <div className="os-modal team-access-modal" style={{ maxWidth: 620, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            {editing ? (
              <>
                <div className="os-modal-head" style={{ alignItems: "flex-start" }}>
                  <div>
                    <h3>Edit member</h3>
                    <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 500 }}>{editing.name}</div>
                    <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{editing.email}</div>
                  </div>
                  <button className="os-iconbtn" onClick={() => setEditing(null)} aria-label="Close">
                    <XIcon size={13} />
                  </button>
                </div>

                <div className="team-detail-section">
                  <label className="os-profile-field"><span>Role</span>
                    <select value={normalizeWorkspaceRole(undefined, editing.role)} onChange={(e) => setEditing({ ...editing, role: WORKSPACE_ROLE_LABELS[e.target.value as WorkspaceRole] })} className="os-input">
                      {INVITABLE_WORKSPACE_ROLES.filter((option) => canManageTarget(currentRole, option) || option === normalizeWorkspaceRole(undefined, editing.role)).map((option) => <option key={option} value={option}>{WORKSPACE_ROLE_LABELS[option]}</option>)}
                    </select>
                  </label>
                  <p className="team-detail-helper">{WORKSPACE_ROLE_DESCRIPTIONS[normalizeWorkspaceRole(undefined, editing.role)]}</p>
                </div>

                <div className="team-detail-section">
                  <span className="team-detail-label">Access</span>
                  <div className="team-access-chips">
                    {WORKSPACE_ROLE_CAPABILITIES[normalizeWorkspaceRole(undefined, editing.role)].map((item) => <span key={item} className="p-chip">{item}</span>)}
                  </div>
                </div>

                <div className="team-detail-section">
                  <span className="team-detail-label">Status</span>
                  <div className="team-status-row">
                    <span className="team-status-value">{editing.active ? (editing.status === "pending" ? "Pending invite" : "Active") : "Disabled"}</span>
                    {editing.status === "pending" && (
                      <button className="btn btn-ghost btn-sm" disabled={savingMember} onClick={() => void resendInvite()}>Resend invitation</button>
                    )}
                    {!editing.active && editing.status !== "pending" && (
                      <button className="btn btn-ghost btn-sm" disabled={savingMember} onClick={() => void toggleActive()}>Re-enable access</button>
                    )}
                  </div>
                </div>

                <div className="team-detail-section team-danger-zone">
                  <span className="team-detail-label">Danger zone</span>
                  <div className="team-danger-actions">
                    {editing.status === "pending" && (
                      <button className="team-danger-btn severe" disabled={savingMember} onClick={() => void revokeInvite()}>Revoke invitation</button>
                    )}
                    {editing.status !== "pending" && editing.active && (
                      <button className="team-danger-btn" disabled={savingMember} onClick={() => void toggleActive()}>Disable access</button>
                    )}
                    {editing.status !== "pending" && (
                      <button className="team-danger-btn severe" disabled={savingMember} onClick={() => { setRemoveError(""); setRemovingMember(editing); }}>Remove member</button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 15, borderTop: "1px solid var(--line)" }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={savingMember} onClick={() => void saveMember()}>{savingMember ? "Saving..." : "Save changes"}</button>
                </div>
                {inviteFeedback && <div style={{ marginTop: 10, fontSize: 12, color: inviteFeedback.toLowerCase().includes("failed") || inviteFeedback.toLowerCase().includes("permission") || inviteFeedback.toLowerCase().includes("cannot") ? "#ff8f8f" : "var(--text-mute)" }}>{inviteFeedback}</div>}
              </>
            ) : (
              <>
                <div className="os-modal-head">
                  <h3>Invite member</h3>
                  <button className="appr-btn deny" onClick={() => setShowInvite(false)}>Close</button>
                </div>
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
              </>
            )}
          </div>
        </div>
      )}

      {removingMember && (
        <div className="os-modal-backdrop" onClick={() => { if (!removing) setRemovingMember(null); }}>
          <div className="os-modal" style={{ maxWidth: 420, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="os-modal-head">
              <h3>Remove member</h3>
              <button className="os-iconbtn" onClick={() => setRemovingMember(null)} aria-label="Close" disabled={removing}>
                <XIcon size={13} />
              </button>
            </div>
            <div className="team-remove-confirm">
              <p>Are you sure you want to remove <strong>{removingMember.name}</strong> from this workspace? They will lose access immediately.</p>
              <span className="team-remove-email">{removingMember.email}</span>
            </div>
            {removeError && <div style={{ marginTop: 12, fontSize: 12, color: "#ff8f8f" }}>{removeError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost btn-sm" disabled={removing} onClick={() => setRemovingMember(null)}>Cancel</button>
              <button className="team-danger-btn severe" disabled={removing} onClick={() => void confirmRemove()}>{removing ? "Removing..." : "Remove member"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
