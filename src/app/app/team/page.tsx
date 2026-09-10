"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UsersIcon, PlusIcon, XIcon } from "@/components/dashboard/icons";
import { useOS } from "@/lib/os/app-provider";
import type { TeamMember } from "@/lib/os/types";
import { inviteWorkspaceMember, removeWorkspaceMember, resendWorkspaceInvite, revokeWorkspaceInvite, updateWorkspaceMember } from "./actions";
import { getPlanLimits, isAtMemberLimit } from "@/lib/os/plans";
import { UsageBanner } from "@/components/upgrade-prompt";
import { PageHeader } from "@/components/product-ui/page-primitives";
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
  const limits = getPlanLimits(state.workspace.planTier ?? state.workspace.plan);
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

  const feedbackIsError = (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes("failed") || lower.includes("permission") || lower.includes("cannot") || lower.includes("valid");
  };

  return (
    <div className="os-page team-page">
      <PageHeader
        eyebrow={countLabel}
        title="Team"
        description="Manage who can view, approve, and configure operators in this workspace."
        actions={
          !canManage ? undefined : atMemberLimit ? (
            <Link
              href="/plans"
              className="btn btn-sm"
              style={{ background: "rgba(77,232,225,0.08)", color: "#4DE8E1", boxShadow: "inset 0 0 0 1px rgba(77,232,225,0.22)" }}
            >
              <PlusIcon size={12} /> Upgrade to add members
            </Link>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}><PlusIcon size={12} /> Invite member</button>
          )
        }
      />

      {limits.maxTeamMembers !== -1 && (
        <UsageBanner used={activeMemberCount} max={limits.maxTeamMembers} label="team members" planLabel={limits.name} />
      )}

      <section className="card sec">
        <div className="card-head">
          <h3 className="t-section"><UsersIcon size={13} /> Workspace members</h3>
          <span className="t-meta">{activeMemberCount} active</span>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Person</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {state.teamMembers.map((m) => {
              const memberRole = normalizeWorkspaceRole(undefined, m.role);
              // Three real states, three distinct treatments. "Pending invite"
              // previously rendered in the same green as an active member, which
              // read as though an unaccepted invite already had access.
              const statusTone = !m.active ? "disabled" : m.status === "pending" ? "pending" : "active";
              const statusLabel = statusTone === "pending" ? "Pending invite" : statusTone === "disabled" ? "Disabled" : "Active";
              const badgeTone = statusTone === "active" ? "green" : statusTone === "pending" ? "amber" : "muted";
              return (
                <tr key={m.id}>
                  <td className="ink">
                    <span className="op-id">
                      <span
                        className="op-av s28"
                        style={{ display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${m.color}40, ${m.color}15)`, boxShadow: `inset 0 0 0 1px ${m.color}55`, color: m.color, fontSize: 11 }}
                      >
                        {m.initials}
                      </span>
                      <span className="nm"><b>{m.name}</b></span>
                    </span>
                  </td>
                  <td className="mono">{m.email}</td>
                  <td>{WORKSPACE_ROLE_LABELS[memberRole]}</td>
                  <td><span className={`badge ${badgeTone}`}><i />{statusLabel}</span></td>
                  <td className="right">
                    {canManage && canManageTarget(currentRole, memberRole) && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setInviteFeedback(""); setEditing({ ...m, role: WORKSPACE_ROLE_LABELS[memberRole] }); }}>Manage</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {(showInvite || editing) && (
        <div className="scrim" onClick={() => { setShowInvite(false); setEditing(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {editing ? (
              <>
                <div className="modal-head">
                  <div className="tt">
                    <h3>Edit member</h3>
                    <p>{editing.name} · {editing.email}</p>
                  </div>
                  <button className="btn-icon" onClick={() => setEditing(null)} aria-label="Close">
                    <XIcon size={13} />
                  </button>
                </div>

                <div className="modal-body stack">
                  <div className="field">
                    <label className="label">Role</label>
                    <select
                      value={normalizeWorkspaceRole(undefined, editing.role)}
                      onChange={(e) => setEditing({ ...editing, role: WORKSPACE_ROLE_LABELS[e.target.value as WorkspaceRole] })}
                      className="select"
                      style={{ width: "100%" }}
                    >
                      {INVITABLE_WORKSPACE_ROLES.filter((option) => canManageTarget(currentRole, option) || option === normalizeWorkspaceRole(undefined, editing.role)).map((option) => <option key={option} value={option}>{WORKSPACE_ROLE_LABELS[option]}</option>)}
                    </select>
                    <p className="hint">{WORKSPACE_ROLE_DESCRIPTIONS[normalizeWorkspaceRole(undefined, editing.role)]}</p>
                  </div>

                  <dl className="kv">
                    <div>
                      <dt>Access</dt>
                      <dd><span className="inline">{WORKSPACE_ROLE_CAPABILITIES[normalizeWorkspaceRole(undefined, editing.role)].map((item) => <span key={item} className="badge muted">{item}</span>)}</span></dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className="inline">
                          <span className="t-compact">{editing.active ? (editing.status === "pending" ? "Pending invite" : "Active") : "Disabled"}</span>
                          {editing.status === "pending" && (
                            <button className="btn btn-ghost btn-sm" disabled={savingMember} onClick={() => void resendInvite()}>Resend invitation</button>
                          )}
                          {!editing.active && editing.status !== "pending" && (
                            <button className="btn btn-ghost btn-sm" disabled={savingMember} onClick={() => void toggleActive()}>Re-enable access</button>
                          )}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="field">
                    <span className="label">Danger zone</span>
                    <div className="inline">
                      {editing.status === "pending" && (
                        <button className="btn btn-danger btn-sm" disabled={savingMember} onClick={() => void revokeInvite()}>Revoke invitation</button>
                      )}
                      {editing.status !== "pending" && editing.active && (
                        <button className="btn btn-ghost btn-sm" disabled={savingMember} onClick={() => void toggleActive()}>Disable access</button>
                      )}
                      {editing.status !== "pending" && (
                        <button className="btn btn-danger btn-sm" disabled={savingMember} onClick={() => { setRemoveError(""); setRemovingMember(editing); }}>Remove member</button>
                      )}
                    </div>
                  </div>

                  {inviteFeedback && <p className="hint" style={{ color: feedbackIsError(inviteFeedback) ? "#ff8f8f" : "var(--text-mute)" }}>{inviteFeedback}</p>}
                </div>

                <div className="modal-foot">
                  <button className="btn btn-primary btn-sm" disabled={savingMember} onClick={() => void saveMember()}>{savingMember ? "Saving…" : "Save changes"}</button>
                </div>
              </>
            ) : (
              <>
                {/* Icon close in the header, Cancel in the footer -- the text
                    "Close" button that used to sit here competed with Cancel
                    for the same job. Matches the edit/remove modals below. */}
                <div className="modal-head">
                  <div className="tt">
                    <h3>Invite member</h3>
                    <p>They&apos;ll receive one secure invitation for <strong>{state.workspace.name}</strong>.</p>
                  </div>
                  <button className="btn-icon" onClick={() => setShowInvite(false)} aria-label="Close">
                    <XIcon size={13} />
                  </button>
                </div>
                <div className="modal-body stack">
                  <div className="grid2">
                    <div className="field">
                      <label className="label">Name <em>optional</em></label>
                      <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Maya Laurent" autoComplete="name" className="input" />
                    </div>
                    <div className="field">
                      <label className="label">Work email</label>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maya@company.com" autoComplete="email" inputMode="email" className="input" autoFocus />
                    </div>
                  </div>
                  <div className="field">
                    <span className="label">Choose access level</span>
                    <div className="stack" style={{ gap: 8 }}>
                      {INVITABLE_WORKSPACE_ROLES.filter((option) => isOwner || option !== "admin").map((option) => (
                        <button key={option} type="button" className={`radio-card${role === option ? " on" : ""}`} onClick={() => setRole(option)}>
                          <span className={`rdo${role === option ? " on" : ""}`} aria-hidden="true" />
                          <span>
                            <b>{WORKSPACE_ROLE_LABELS[option]}</b>
                            <span>{WORKSPACE_ROLE_DESCRIPTIONS[option]}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* The capability list is real information the role rows
                      don't carry, so it stays -- but as a quiet line rather
                      than a third bordered panel stacked in a small modal. */}
                  <p className="hint">
                    Includes {WORKSPACE_ROLE_CAPABILITIES[role].join(" · ")}. Access can be changed or revoked at any time.
                  </p>
                  {inviteFeedback && <p className="hint" style={{ color: feedbackIsError(inviteFeedback) ? "#ff8f8f" : "#64ffd7" }}>{inviteFeedback}</p>}
                </div>
                <div className="modal-foot">
                  <button className="btn btn-primary btn-sm" onClick={submitInvite} disabled={!email.includes("@") || inviting}>{inviting ? "Sending invitation…" : "Send invitation"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {removingMember && (
        <div className="scrim" onClick={() => { if (!removing) setRemovingMember(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="tt"><h3>Remove member</h3></div>
              <button className="btn-icon" onClick={() => setRemovingMember(null)} aria-label="Close" disabled={removing}>
                <XIcon size={13} />
              </button>
            </div>
            <div className="modal-body">
              <p className="t-compact">Are you sure you want to remove <strong>{removingMember.name}</strong> from this workspace? They will lose access immediately.</p>
              <p className="t-mono" style={{ marginTop: 8 }}>{removingMember.email}</p>
              {removeError && <p className="hint" style={{ color: "#ff8f8f" }}>{removeError}</p>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-danger btn-sm" disabled={removing} onClick={() => void confirmRemove()}>{removing ? "Removing…" : "Remove member"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
