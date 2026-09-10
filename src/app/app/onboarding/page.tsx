"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { marketingHref } from "@/lib/urls";
import { useOS } from "@/lib/os/app-provider";
import { completeOnboardingAction, getOnboardingDraftAction, saveOnboardingDraftAction, type OnboardingDraft } from "./actions";
import { markOnboardingReturn } from "@/lib/onboarding/return-contract";
import { ProviderLogo } from "@/components/connectors/provider-logo";
import "./styles-onboarding.css";

type Priority = Exclude<OnboardingDraft["priority"], "">;
type ConnectorKey = OnboardingDraft["systems"][number];
type ConnectorAccount = { connectorKey: string; displayName: string; status: string; executable: boolean; statusMessage: string | null };
type Readiness = { operatorKey: string; status: string; canRunManual: boolean; nextSetupStep: string; executionEligibility?: { eligible?: boolean; reason?: string } };
type PolicyMode = "approval_first" | "guarded";

const priorities: Record<Priority, { n: string; title: string; operator: string; avatar: string; description: string; core: ConnectorKey[]; optional: ConnectorKey[] }> = {
  revenue: { n: "01", title: "Sales and revenue", operator: "Revenue Operator", avatar: "/operators/revenue-operator.png", description: "Notices commercial follow-up and prepares the next response before momentum is lost.", core: ["gmail", "microsoft"], optional: ["hubspot"] },
  client_flow: { n: "02", title: "Customer communication", operator: "Client Flow Operator", avatar: "/operators/client-flow-operator.png", description: "Keeps customer requests, handoffs, and commitments moving with the right context.", core: ["gmail", "microsoft"], optional: ["google_drive"] },
  operations: { n: "03", title: "Project delivery", operator: "Operations Operator", avatar: "/operators/operations-operator.png", description: "Surfaces blocked delivery work and prepares the internal next step before delays spread.", core: ["trello", "asana", "jira"], optional: ["slack"] },
  support: { n: "04", title: "Customer support", operator: "Support Operator", avatar: "/operators/support-operator.png", description: "Finds unresolved customer work and prepares a controlled response before it waits.", core: ["zendesk", "intercom", "gmail", "microsoft"], optional: ["google_drive"] },
};

const connectorCatalog: Record<ConnectorKey, { name: string; mark: string; color: string; purpose: string }> = {
  gmail: { name: "Gmail", mark: "G", color: "#EA4335", purpose: "Customer conversations and approval-gated follow-up" },
  microsoft: { name: "Microsoft 365", mark: "M", color: "#61A8FF", purpose: "Email context and approval-gated follow-up" },
  google_drive: { name: "Google Drive", mark: "GD", color: "#70D77B", purpose: "Read-only document context" },
  hubspot: { name: "HubSpot", mark: "Hs", color: "#FF7A59", purpose: "CRM context and approved revenue follow-through" },
  trello: { name: "Trello", mark: "Tr", color: "#4BA3E8", purpose: "Project signals and approved task follow-through" },
  asana: { name: "Asana", mark: "As", color: "#F276A5", purpose: "Project signals and approved task follow-through" },
  jira: { name: "Jira", mark: "Ji", color: "#5B8DEF", purpose: "Delivery signals and approved issue follow-through" },
  zendesk: { name: "Zendesk", mark: "Zd", color: "#4DD8B2", purpose: "Customer tickets and approval-gated support responses" },
  intercom: { name: "Intercom", mark: "In", color: "#FF8D72", purpose: "Customer conversations and approval-gated support responses" },
  slack: { name: "Slack", mark: "Sl", color: "#A77FBC", purpose: "Optional internal coordination context" },
};

const labels = ["WELCOME", "WHAT TO WATCH", "CONNECT SYSTEMS", "WORKFORCE READINESS", "CONTROL BOUNDARY", "START MONITORING"];
const blank: OnboardingDraft = { fullName: "", workspaceName: "", websiteUrl: "", industry: "", teamSize: "", priority: "", systems: [], noSupportedConnector: false, step: 1 };

function normalizedWebsite(value: string) { const text = value.trim(); return !text ? "" : /^https?:\/\//i.test(text) ? text : `https://${text}`; }
function statusLabel(status: string) { return status === "ready" ? "Ready to activate" : status === "draft_only" ? "Active with limited context" : status === "missing_connector" ? "Available to unlock" : status === "upgrade_required" ? "Plan required" : status === "needs_attention" ? "Needs attention" : "Available to unlock"; }
function connected(account: ConnectorAccount | undefined) { return Boolean(account && ["connected", "healthy"].includes(account.status)); }

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state } = useOS();
  const [draft, setDraft] = useState<OnboardingDraft>(blank);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [accounts, setAccounts] = useState<ConnectorAccount[]>([]);
  const [readiness, setReadiness] = useState<Readiness[]>([]);
  const [policyMode, setPolicyMode] = useState<PolicyMode>("approval_first");
  const submitting = useRef(false);
  const choice = draft.priority ? priorities[draft.priority] : null;
  const identityParams = useMemo(() => new URLSearchParams({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }), [state.currentUser.email, state.currentUser.id, state.workspace.id]);
  const byConnector = useMemo(() => new Map(accounts.map((account) => [account.connectorKey, account])), [accounts]);
  const priorityReadiness = readiness.find((item) => item.operatorKey === draft.priority) ?? null;
  const hasCoreConnected = Boolean(choice?.core.some((key) => connected(byConnector.get(key))));
  // Truthful, not just declared: only genuinely limited when the user said
  // none of the supported systems apply AND none actually got connected
  // since (e.g. they changed their mind and connected one after all).
  const limitedMode = draft.noSupportedConnector && !hasCoreConnected;

  const refreshLiveState = useCallback(async () => {
    if (!state.workspace.id || !state.currentUser.id) return;
    const [accountResult, readinessResult, policyResult] = await Promise.all([
      fetch(`/api/connectors/accounts?${identityParams.toString()}`, { cache: "no-store" }),
      fetch(`/api/operators/readiness?${identityParams.toString()}`, { cache: "no-store" }),
      fetch(`/api/policies?${identityParams.toString()}`, { cache: "no-store" }),
    ]);
    const accountJson = await accountResult.json().catch(() => []);
    const readinessJson = await readinessResult.json().catch(() => ({}));
    const policyJson = await policyResult.json().catch(() => ({}));
    if (accountResult.ok && Array.isArray(accountJson)) setAccounts(accountJson as ConnectorAccount[]);
    if (readinessResult.ok && Array.isArray(readinessJson.readiness)) setReadiness(readinessJson.readiness as Readiness[]);
    if (policyResult.ok && (policyJson.policy?.autonomyMode === "approval_first" || policyJson.policy?.autonomyMode === "guarded")) setPolicyMode(policyJson.policy.autonomyMode);
  }, [identityParams, state.currentUser.id, state.workspace.id]);

  useEffect(() => { let active = true; getOnboardingDraftAction().then((result) => { if (!active) return; if (result.ok) setDraft(result.draft); else setError(result.error); setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void refreshLiveState(); }, 0); return () => window.clearTimeout(timer); }, [refreshLiveState]);
  useEffect(() => { const connector = searchParams.get("connector"); const status = searchParams.get("connector_status"); if (!connector || !status) return; const timer = window.setTimeout(() => { setNotice(status === "connected" ? `${connectorCatalog[connector as ConnectorKey]?.name ?? "System"} is connected. Readiness has been refreshed.` : "The connection was not completed. No access was added. You can try again when ready."); void refreshLiveState(); router.replace("/onboarding"); }, 0); return () => window.clearTimeout(timer); }, [refreshLiveState, router, searchParams]);

  const update = (patch: Partial<OnboardingDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const valid = () => draft.step === 1 ? Boolean(draft.fullName.trim() && draft.workspaceName.trim()) : draft.step === 2 ? Boolean(draft.priority) : draft.step === 3 ? Boolean(hasCoreConnected || draft.noSupportedConnector) : true;
  async function continueStep() { if (!valid()) { setError(draft.step === 1 ? "Add your name and workspace name to continue." : draft.step === 2 ? "Choose the first business area Auterim should watch." : "Connect one core system, or choose \"I use another system\" to continue with limited context."); return; } setError(""); setBusy(true); const next = Math.min(6, draft.step + 1); const result = await saveOnboardingDraftAction({ ...draft, websiteUrl: normalizedWebsite(draft.websiteUrl), step: next }); setBusy(false); if (!result.ok) return setError(result.error); update({ step: next, websiteUrl: normalizedWebsite(draft.websiteUrl) }); }
  async function openConnector(key: ConnectorKey) { setBusy(true); setError(""); const systems = Array.from(new Set([...draft.systems, key])); const result = await saveOnboardingDraftAction({ ...draft, systems, noSupportedConnector: false, step: 3 }); setBusy(false); if (!result.ok) return setError(result.error); update({ systems, noSupportedConnector: false }); markOnboardingReturn(); router.push(`/connectors?setup=${encodeURIComponent(key)}&onboarding=1`); }
  async function chooseNoSupportedConnector() { setBusy(true); setError(""); const result = await saveOnboardingDraftAction({ ...draft, noSupportedConnector: true, step: 3 }); setBusy(false); if (!result.ok) return setError(result.error); update({ noSupportedConnector: true }); }
  async function saveControlBoundary(mode: PolicyMode) { setPolicyMode(mode); setBusy(true); setError(""); try { const response = await fetch("/api/policies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email, autonomyMode: mode }) }); const json = await response.json().catch(() => ({})); if (!response.ok) throw new Error(json.error || "Could not save the control boundary."); setNotice(mode === "approval_first" ? "Review most actions is active." : "Low-risk internal work is allowed where the live policy permits it."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the control boundary."); } finally { setBusy(false); } }
  async function startMonitoring() { if (!draft.priority || !priorityReadiness) return setError("We could not verify workforce readiness. Refresh and try again."); setBusy(true); setError(""); try { const activation = await fetch(`/api/operators/${draft.priority}/activate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: state.workspace.id, userId: state.currentUser.id, userEmail: state.currentUser.email }) }); const activationJson = await activation.json().catch(() => ({})); if (!activation.ok) throw new Error(activationJson.error || priorityReadiness.nextSetupStep || "This operator is not ready to start monitoring."); const complete = await completeOnboardingAction({ ...draft, websiteUrl: normalizedWebsite(draft.websiteUrl), step: 6 }); if (!complete.ok) throw new Error(complete.error); router.replace("/"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Monitoring could not be started."); } finally { setBusy(false); submitting.current = false; } }
  // Limited-mode completion: no supported connector, so no operator
  // activation is attempted and monitoring never starts. Onboarding still
  // completes honestly - the dashboard shows the real, unconnected state.
  async function completeLimitedOnboarding() { setBusy(true); setError(""); try { const complete = await completeOnboardingAction({ ...draft, websiteUrl: normalizedWebsite(draft.websiteUrl), step: 6 }); if (!complete.ok) throw new Error(complete.error); router.replace("/"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not finish setup."); } finally { setBusy(false); submitting.current = false; } }
  async function signInWithAnotherAccount() { setSwitchingAccount(true); setError(""); try { const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); if (!response.ok) throw new Error(); router.replace("/login?from=%2F"); router.refresh(); } catch { setError("We could not switch accounts. Please try again."); setSwitchingAccount(false); } }
  const back = () => { if (draft.step > 1) update({ step: draft.step - 1 }); };
  const canStart = limitedMode || Boolean(priorityReadiness && (priorityReadiness.status === "ready" || priorityReadiness.status === "draft_only") && priorityReadiness.canRunManual && priorityReadiness.executionEligibility?.eligible !== false);

  if (!ready) return <div className="onboarding-shell onboarding-loading">Preparing your workspace…</div>;
  return <div className="onboarding-shell">
    <header className="onboarding-header"><div className="onboarding-brand"><Image src="/brand/auterim-mark-live.svg" alt="" width={22} height={22} priority /><span>AUTERIM</span><span>/ workforce launch</span></div><div className="onboarding-progress" aria-label={`Step ${draft.step} of 6`}><span>{labels[draft.step - 1]}</span><i><b style={{ width: `${draft.step * 16.67}%` }} /></i><em>{String(draft.step).padStart(2, "0")} / 06</em></div><div className="onboarding-header-actions"><button type="button" className="switch-account" onClick={signInWithAnotherAccount} disabled={switchingAccount}>{switchingAccount ? "Switching…" : "Use another account"}</button><button type="button" onClick={() => window.location.assign(marketingHref("/"))}>Exit</button></div></header>
    <main className={`onboarding-main step-${draft.step}`}><section className="onboarding-content"><p className="onboarding-kicker"><i /> {labels[draft.step - 1]}</p>
      {draft.step === 1 && <><h1>Your business should not have to find the work first.</h1><p className="onboarding-lead">Auterim watches connected systems, notices work that needs attention, and prepares the next step within your policies.</p><div className="onboarding-fields"><label>YOUR NAME<input value={draft.fullName} onChange={(event) => update({ fullName: event.target.value })} autoComplete="name" /></label><label>WORKSPACE NAME<input value={draft.workspaceName} onChange={(event) => update({ workspaceName: event.target.value })} autoComplete="organization" /></label><label>WEBSITE <small>OPTIONAL</small><input value={draft.websiteUrl} onChange={(event) => update({ websiteUrl: event.target.value })} placeholder="yourcompany.com" inputMode="url" autoComplete="url" /></label></div></>}
      {draft.step === 2 && <><h1>What should Auterim watch first?</h1><p className="onboarding-lead">Start with one business capability. The right operator and supported systems follow from it.</p><div className="priority-list" role="radiogroup" aria-label="Business capability">{(Object.keys(priorities) as Priority[]).map((key) => { const item = priorities[key]; const selected = draft.priority === key; return <button key={key} role="radio" aria-checked={selected} className={selected ? "selected" : ""} type="button" onClick={() => update({ priority: key })}><b>{item.n}</b><span><strong>{item.title}</strong><small>{item.description}</small></span><i /></button>; })}</div></>}
      {draft.step === 3 && choice && <><h1>Connect the system that gives {choice.operator.replace(" Operator", "")} useful evidence.</h1><p className="onboarding-lead">Auterim works best with connected systems, but you can continue if your current tools are not supported yet.</p><div className="connector-section"><span>RECOMMENDED SYSTEMS</span><div className="connector-grid">{choice.core.map((key) => { const item = connectorCatalog[key]; const isConnected = connected(byConnector.get(key)); return <button type="button" key={key} className={isConnected ? "selected connected" : ""} onClick={() => !isConnected && void openConnector(key)} disabled={busy || isConnected}><ProviderLogo connectorKey={key} name={item.name} fallbackLetter={item.mark} fallbackColor={item.color} box={31} size={20} radius={7} /><span><strong>{item.name}</strong><small>{isConnected ? "Connected and available to Auterim" : item.purpose}</small></span><i aria-hidden>{isConnected ? "✓" : "→"}</i></button>; })}</div></div><div className="connector-section optional"><span>OPTIONAL CONTEXT</span><div className="connector-grid">{choice.optional.map((key) => { const item = connectorCatalog[key]; const isConnected = connected(byConnector.get(key)); return <button type="button" key={key} className={isConnected ? "selected connected" : ""} onClick={() => !isConnected && void openConnector(key)} disabled={busy || isConnected}><ProviderLogo connectorKey={key} name={item.name} fallbackLetter={item.mark} fallbackColor={item.color} box={31} size={20} radius={7} /><span><strong>{item.name}</strong><small>{isConnected ? "Connected" : item.purpose}</small></span><i aria-hidden>{isConnected ? "✓" : "→"}</i></button>; })}</div></div><div className="connector-section alt"><button type="button" className={`connector-alt${draft.noSupportedConnector ? " selected" : ""}`} onClick={() => void chooseNoSupportedConnector()} disabled={busy}><span>{draft.noSupportedConnector ? "✓" : "→"}</span>I use another system</button>{draft.noSupportedConnector && <p className="onboarding-note">You can continue with limited context. Auterim will show what becomes available when you connect a supported system later.</p>}</div><p className="onboarding-note">Auterim only receives the access you approve. External and higher-risk actions remain controlled.</p></>}
      {draft.step === 4 && <><h1>Your workforce readiness.</h1><p className="onboarding-lead">These are live results from your connected systems. Roles do not become active until you start monitoring.</p><div className="readiness-list">{(Object.keys(priorities) as Priority[]).map((key) => { const item = priorities[key]; const status = readiness.find((entry) => entry.operatorKey === key); return <div className={`readiness-row ${key === draft.priority ? "primary" : ""}`} key={key}><Image src={item.avatar} alt="" width={38} height={38} /><span><strong>{item.operator}</strong><small>{status?.nextSetupStep ?? "Checking connected systems…"}</small></span><b>{status ? statusLabel(status.status) : "Checking"}</b></div>; })}</div>{priorityReadiness?.status === "missing_connector" && !limitedMode && <p className="onboarding-error" role="alert">Connect a core system before this operator can begin monitoring.</p>}{limitedMode && <p className="onboarding-note">Continuing with limited context. Connect a supported system anytime to activate live monitoring.</p>}</>}
      {draft.step === 5 && <><h1>Choose how work stays controlled.</h1><p className="onboarding-lead">You stay in control. Auterim acts only within your workspace policies, and sensitive work remains gated.</p><div className="control-options" role="radiogroup" aria-label="Control boundary"><button type="button" role="radio" aria-checked={policyMode === "approval_first"} className={policyMode === "approval_first" ? "selected" : ""} onClick={() => void saveControlBoundary("approval_first")} disabled={busy}><b>Review most actions</b><small>Auterim prepares work and asks before external or higher-risk actions.</small></button><button type="button" role="radio" aria-checked={policyMode === "guarded"} className={policyMode === "guarded" ? "selected" : ""} onClick={() => void saveControlBoundary("guarded")} disabled={busy}><b>Allow low-risk internal work</b><small>Only permitted internal actions may proceed within the live safety limits.</small></button></div><p className="control-boundary"><i /> Customer communication, CRM changes, and project moves still require approval where production policy requires it.</p></>}
      {draft.step === 6 && choice && <><h1>{limitedMode ? "Your workspace is ready." : "Your workforce is ready to start watching."}</h1><p className="onboarding-lead">{limitedMode ? "No supported system is connected yet, so nothing will be marked active. Connect a system anytime from the dashboard to start real monitoring." : canStart ? `${choice.operator} will monitor ${choice.title.toLowerCase()} through your connected systems. If no real signal exists yet, the dashboard will show exactly what it is watching.` : priorityReadiness?.nextSetupStep ?? "Finish the required connection before monitoring can start."}</p><div className="launch-summary"><div><span>CONNECTED CAPABILITY</span><b>{choice.core.filter((key) => connected(byConnector.get(key))).map((key) => connectorCatalog[key].name).join(" · ") || (limitedMode ? "Not connected yet" : "Not connected")}</b></div><div><span>OPERATOR</span><b>{limitedMode ? `${choice.operator} · Available to unlock` : choice.operator}</b></div><div><span>CONTROL</span><b>{policyMode === "approval_first" ? "Review most actions" : "Low-risk internal work"}</b></div></div><p className="control-boundary"><i /> {limitedMode ? "Nothing is activated until a supported system is connected." : "Nothing is fabricated. Auterim will show a real signal when one is found."}</p></>}
      {notice && <p className="onboarding-notice" role="status">{notice}</p>}{error && <p className="onboarding-error" role="alert">{error}</p>}
    </section>{(draft.step === 2 || draft.step === 4 || draft.step === 6) && choice && <aside className="operator-recommendation"><div><span>{draft.step === 4 ? "LIVE READINESS" : "FIRST OPERATOR"}</span><b><i /> {priorityReadiness ? statusLabel(priorityReadiness.status).toUpperCase() : "SELECTED"}</b></div><section><figure><Image src={choice.avatar} alt="" width={112} height={112} /></figure><p><span>{choice.title.toUpperCase()}</span><strong>{choice.operator}</strong><small>{choice.description}</small></p></section><footer><i /> Prepared work stays within your workspace policy.</footer></aside>}</main>
    <footer className="onboarding-footer"><span><i /> LIVE WORKSPACE STATE</span><p>{draft.step === 3 ? "Connect only what gives the first operator useful evidence." : "Sensitive actions wait for the control boundary you choose."}</p><div>{draft.step > 1 && <button type="button" className="back" onClick={back} disabled={busy}>Back</button>}{draft.step === 3 && <button type="button" className="skip" onClick={continueStep} disabled={busy}>Continue without optional context</button>}<button type="button" className="primary" onClick={draft.step === 6 ? () => { if (!submitting.current) { submitting.current = true; void (limitedMode ? completeLimitedOnboarding() : startMonitoring()); } } : continueStep} disabled={busy || (draft.step === 6 && !canStart)}>{busy ? "Saving…" : draft.step === 6 ? (limitedMode ? "Continue to dashboard" : "Start monitoring") : "Continue →"}</button></div></footer>
  </div>;
}
