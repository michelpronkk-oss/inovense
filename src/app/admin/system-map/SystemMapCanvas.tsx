"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnNodeDrag,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./system-map.css";
import { CheckIcon, SearchIcon, XIcon } from "@/components/dashboard/icons";
import type {
  SystemMapBranchId,
  SystemMapEdge,
  SystemMapNode as SystemMapNodeData,
  SystemMapStatus,
} from "@/lib/admin/system-map";
import type { SystemMapLiveContext, SystemMapLiveData, SystemMapRuntimeStatus } from "@/lib/admin/system-map-live";
import type { OperationalIncident, OperationalSeverity } from "@/lib/admin/operational-incidents";

const STORAGE_KEY = "auterim-admin-system-map-positions-v1";

type SystemMapNote = { id: string; node_id: string | null; title: string; body: string; updated_at: string };
type FlowData = SystemMapNodeData & { live?: SystemMapLiveContext; impact?: boolean; incidentMode?: boolean };
type FlowNode = Node<FlowData, "systemMapNode">;

function loadStoredPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, { x: number; y: number }>;
  } catch {
    // Corrupt or unavailable storage — fall back to the deterministic layout.
  }
  return {};
}

function statusLabel(status?: SystemMapStatus): string {
  if (status === "live") return "Live";
  if (status === "partial") return "Partial";
  if (status === "planned") return "Planned";
  if (status === "needs_attention") return "Needs attention";
  return "";
}

function statusTone(status?: SystemMapStatus): string {
  if (status === "live") return "live";
  if (status === "partial") return "partial";
  if (status === "planned") return "planned";
  if (status === "needs_attention") return "attention";
  return "";
}
function runtimeTone(status?: SystemMapRuntimeStatus) {
  if (status === "healthy") return "live";
  if (["failing", "blocked", "reconnect_required", "permission_required", "needs_attention", "stale"].includes(status ?? "")) return "attention";
  if (status === "degraded") return "partial";
  return "planned";
}
function severityLabel(severity?: OperationalSeverity) { return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : "None"; }

function SystemMapNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const tone = statusTone(data.status);
  const isCollapsible = data.kind === "category";
  return (
    <div
      className={`sysmap-node kind-${data.kind}${selected ? " is-selected" : ""}${data.live?.severity ? ` severity-${data.live.severity}` : ""}${data.impact ? " is-affected" : ""}${data.incidentMode && data.live?.severity ? " is-issue" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${data.label}${data.live ? `, operational status ${data.live.status.replaceAll("_", " ")}` : data.status ? `, product state ${statusLabel(data.status)}` : ""}`}
    >
      {/* Custom node types get no default connection points in @xyflow/react --
          without these, edges have nowhere to anchor and silently never
          render, no matter how the edge itself is styled. Visually hidden
          via .react-flow__handle in system-map.css; only the anchor matters. */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      {selected && (
        <span className="sysmap-node-check" aria-hidden>
          <CheckIcon size={10} stroke={2.4} />
        </span>
      )}
      <div className="sysmap-node-head">
        <span className="sysmap-node-label">{data.label}</span>
        {(data.live || data.status) && <span className={`admin-status-dot ${data.live ? runtimeTone(data.live.status) : tone} ${data.live?.severity === "critical" ? "sysmap-status-incident" : ""}`} aria-hidden />}
      </div>
      {data.subtitle && <span className="sysmap-node-subtitle">{data.subtitle}</span>}
      {data.live && <span className={`sysmap-node-badge ${runtimeTone(data.live.status)}`}>{data.live.status.replaceAll("_", " ")}</span>}
      {isCollapsible && (
        <span className="sysmap-node-subtitle" aria-hidden>
          Click to expand / collapse
        </span>
      )}
    </div>
  );
}

const nodeTypes = { systemMapNode: SystemMapNodeCard };

function toFlowNodes(nodes: SystemMapNodeData[], positions: Record<string, { x: number; y: number }>, liveByNode = new Map<string, SystemMapLiveContext>()): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "systemMapNode" as const,
    position: positions[node.id] ?? node.position,
    data: { ...node, live: liveByNode.get(node.id) },
    draggable: true,
    focusable: true,
  }));
}

function toFlowEdges(edges: SystemMapEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    className: edge.kind === "dependency" ? "sysmap-edge-dependency" : "sysmap-edge-hierarchy",
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: edge.kind === "dependency" ? "#4de7df" : "#94a3b8" },
  }));
}

function DetailsPanel({ node, branchLabel, live, incident, nodeLookup, notes, onClose, onCreateNote, onEditNote, onDeleteNote }: { node: SystemMapNodeData | null; branchLabel?: string; live?: SystemMapLiveContext; incident?: OperationalIncident; nodeLookup: Map<string, SystemMapNodeData>; notes: SystemMapNote[]; onClose: () => void; onCreateNote: (title: string, body: string) => Promise<void>; onEditNote: (note: SystemMapNote, title: string, body: string) => Promise<void>; onDeleteNote: (id: string) => Promise<void> }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(""); const [editBody, setEditBody] = useState("");

  useEffect(() => {
    if (node) closeRef.current?.focus();
  }, [node]);

  useEffect(() => {
    if (!node) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [node, onClose]);

  if (!node) {
    return (
      <aside className="sysmap-panel sysmap-panel-empty" aria-label="System Map inspector">
        <div className="sysmap-panel-head">
          <div>
            <div className="admin-eyebrow">System Map</div>
            <h3>Architecture inspector</h3>
          </div>
        </div>
        <div className="sysmap-panel-body">
          <div className="sysmap-inspector-empty">
            <span className="admin-status-dot live" aria-hidden />
            <div>
              <strong>Select a node</strong>
              <p>Inspect its live state, relationships, dependencies, and founder notes without leaving the map.</p>
            </div>
          </div>
          <div className="sysmap-panel-section">
            <span>Workspace controls</span>
            <p>Drag to explore, use the canvas controls to zoom, or fit the current architecture to the available workspace.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sysmap-panel" aria-label={`Details for ${node.label}`} role="dialog" aria-modal="false">
      <div className="sysmap-panel-head">
        <div>
          <div className="admin-eyebrow">{branchLabel ?? node.kind}</div>
          <h3>{node.label}</h3>
        </div>
        <button ref={closeRef} type="button" className="sysmap-panel-close" aria-label="Close details panel" onClick={onClose}>
          <XIcon size={14} />
        </button>
      </div>
      <div className="sysmap-panel-body">
        {node.status && (
          <div className="sysmap-panel-section">
            <span>Product state</span>
            <span className={`admin-status-pill ${statusTone(node.status)}`}>{statusLabel(node.status)}</span>
          </div>
        )}
        {live ? <div className="sysmap-panel-section sysmap-diagnostic"><span>Operational state</span><div className="sysmap-diagnostic-status"><span className={`admin-status-pill ${runtimeTone(live.status)}`}>{live.status.replaceAll("_", " ")}</span><b className={`sysmap-severity ${live.severity ?? "none"}`}>{severityLabel(live.severity)}</b></div><p>{live.summary}</p><dl className="sysmap-facts"><div><dt>Last checked</dt><dd>{live.lastCheckedAt ? new Date(live.lastCheckedAt).toLocaleString("en-GB") : "Unknown"}</dd></div><div><dt>Last success</dt><dd>{live.lastSuccessAt ? new Date(live.lastSuccessAt).toLocaleString("en-GB") : "Not recorded"}</dd></div><div><dt>Last failure</dt><dd>{live.lastFailureAt ? new Date(live.lastFailureAt).toLocaleString("en-GB") : "None recorded"}</dd></div></dl>{live.reasonCode && <><span>Why</span><p>{live.reasonCode.replaceAll("_", " ")}</p></>}{live.blockingIssue && <p className="sysmap-panel-warning">{live.blockingIssue}</p>}{live.affectedNodeIds.length > 0 && <><span>Affects</span><div className="sysmap-panel-tags">{live.affectedNodeIds.map((id) => <span key={id}>{nodeLookup.get(id)?.label ?? id}</span>)}</div></>}{live.recommendedAction && <><span>Next action</span><p>{live.recommendedAction}</p></>}{incident?.startedAt && <small>First observed {new Date(incident.startedAt).toLocaleString("en-GB")}</small>}</div> : <div className="sysmap-panel-section"><span>Operational state</span><span className="admin-status-pill planned">Not measured</span><p>No reliable live health source is attached to this architecture node.</p></div>}
        {node.subtitle && (
          <div className="sysmap-panel-section">
            <span>Type</span>
            <p>{node.subtitle}</p>
          </div>
        )}
        <div className="sysmap-panel-section">
          <span>Description</span>
          <p>{node.description}</p>
        </div>
        {node.responsibility && (
          <div className="sysmap-panel-section">
            <span>Responsibility</span>
            <p>{node.responsibility}</p>
          </div>
        )}
        {node.dependencies && node.dependencies.length > 0 && (
          <div className="sysmap-panel-section">
            <span>Dependencies</span>
            <div className="sysmap-panel-tags">
              {node.dependencies.map((dep) => (
                <span key={dep}>{dep}</span>
              ))}
            </div>
          </div>
        )}
        {node.notes && (
          <div className="sysmap-panel-section">
            <span>Notes</span>
            <p>{node.notes}</p>
          </div>
        )}
        {node.relatedRoute && (
          <div className="sysmap-panel-section">
            <span>Related admin route</span>
            <a className="sysmap-panel-link" href={node.relatedRoute}>
              {node.relatedRoute}
            </a>
          </div>
        )}
        <div className="sysmap-panel-section"><span>Founder notes</span><div className="sysmap-notes">{notes.map((note) => <div className="sysmap-note" key={note.id}>{editingId === note.id ? <form className="sysmap-note-form" onSubmit={async (event) => { event.preventDefault(); if (!editTitle.trim() || !editBody.trim()) return; setSaving(true); await onEditNote(note, editTitle, editBody); setSaving(false); setEditingId(null); }}><input aria-label="Note title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} /><textarea aria-label="Note body" value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={1000} rows={3} /><div><button className="sysmap-btn" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button><button type="button" className="sysmap-note-cancel" onClick={() => setEditingId(null)}>Cancel</button></div></form> : <><strong>{note.title}</strong><p>{note.body}</p><small>{new Date(note.updated_at).toLocaleString("en-GB")}</small><div><button type="button" onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditBody(note.body); }}>Edit</button><button type="button" onClick={() => { if (window.confirm("Delete this note?")) void onDeleteNote(note.id); }}>Delete</button></div></>}</div>)}</div><form className="sysmap-note-form" onSubmit={async (event) => { event.preventDefault(); if (!title.trim() || !body.trim()) return; setSaving(true); await onCreateNote(title, body); setTitle(""); setBody(""); setSaving(false); }}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title" maxLength={120} /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a concise note" maxLength={1000} rows={3} /><button className="sysmap-btn" disabled={saving}>{saving ? "Saving..." : "Add note"}</button></form></div>
      </div>
    </aside>
  );
}

function SystemMapInner({
  initialNodes,
  initialEdges,
  branchLookup,
  initialLive,
}: {
  initialNodes: SystemMapNodeData[];
  initialEdges: SystemMapEdge[];
  branchLookup: Record<SystemMapBranchId, string>;
  initialLive: SystemMapLiveData;
}) {
  const { fitView, setCenter, getZoom } = useReactFlow<FlowNode, Edge>();
  const [liveData, setLiveData] = useState<SystemMapLiveData>(initialLive);
  const [notes, setNotes] = useState<SystemMapNote[]>([]);
  const [showIssues, setShowIssues] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const liveByNode = useMemo(() => new Map(liveData.nodes.map((item) => [item.nodeId, item])), [liveData]);
  const nodeLookup = useMemo(() => new Map(initialNodes.map((node) => [node.id, node])), [initialNodes]);
  const [rfNodes, setRfNodes] = useState<FlowNode[]>(() => toFlowNodes(initialNodes, {}, new Map(initialLive.nodes.map((item) => [item.nodeId, item]))));
  const [collapsedBranches, setCollapsedBranches] = useState<Set<SystemMapBranchId>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = loadStoredPositions();
    if (Object.keys(stored).length > 0) setRfNodes(toFlowNodes(initialNodes, stored, new Map(initialLive.nodes.map((item) => [item.nodeId, item]))));
    // Only runs once on mount — deliberately excludes initialNodes from deps
    // since the data source is static for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLive = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/system-map", { cache: "no-store" });
      if (!response.ok) throw new Error("snapshot_unavailable");
      setLiveData(await response.json() as SystemMapLiveData);
      setLiveError(false);
    } catch {
      // Preserve the last successful snapshot and never turn an endpoint
      // failure into a false platform outage.
      setLiveError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);
  const refreshNotes = useCallback(async () => { const response = await fetch("/api/admin/system-map/notes", { cache: "no-store" }); if (response.ok) { const json = await response.json() as { notes?: SystemMapNote[] }; setNotes(json.notes ?? []); } }, []);
  useEffect(() => { void refreshNotes(); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshLive(); }, 60_000); return () => window.clearInterval(timer); }, [refreshLive, refreshNotes]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 10_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setRfNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, live: liveByNode.get(node.id) } }))); }, [liveByNode]);

  const flowEdges = useMemo(() => toFlowEdges(initialEdges), [initialEdges]);

  const visibleNodes = useMemo(
    () =>
      rfNodes.filter((node) => {
        const branch = node.data.branch;
        if (!branch) return true;
        if (node.data.kind === "category") return true;
        return !collapsedBranches.has(branch);
      }),
    [rfNodes, collapsedBranches],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const selectedIncident = useMemo(() => liveData.incidents.find((incident) => incident.nodeKey === selectedId), [liveData.incidents, selectedId]);
  const selectedImpact = useMemo(() => new Set(selectedIncident?.affectedNodeKeys ?? []), [selectedIncident]);
  const incidentNodeIds = useMemo(() => new Set(liveData.incidents.map((incident) => incident.nodeKey)), [liveData.incidents]);
  const visibleEdges = useMemo(
    () => flowEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map((edge) => ({ ...edge, className: `${edge.className ?? ""}${selectedIncident && ((edge.source === selectedIncident.nodeKey && selectedImpact.has(edge.target)) || (edge.target === selectedIncident.nodeKey && selectedImpact.has(edge.source))) ? " sysmap-edge-impact" : ""}` })),
    [flowEdges, visibleIds, selectedIncident, selectedImpact],
  );

  const flowNodesWithSelection = useMemo(
    () => visibleNodes.map((node) => ({ ...node, selected: node.id === selectedId, data: { ...node.data, impact: selectedImpact.has(node.id), incidentMode: showIssues && incidentNodeIds.has(node.id) } })),
    [visibleNodes, selectedId, selectedImpact, showIssues, incidentNodeIds],
  );

  const selectedNode = useMemo(() => initialNodes.find((node) => node.id === selectedId) ?? null, [initialNodes, selectedId]);
  const selectedBranchLabel = selectedNode?.branch ? branchLookup[selectedNode.branch] : undefined;

  const onNodesChange = useCallback<OnNodesChange<FlowNode>>((changes) => {
    setRfNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const handleNodeDragStop = useCallback<OnNodeDrag<FlowNode>>((_event, node) => {
    setRfNodes((current) => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const item of current) positions[item.id] = item.id === node.id ? node.position : item.position;
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      return current;
    });
  }, []);

  const handleNodeClick = useCallback<NodeMouseHandler<FlowNode>>((_event, node) => {
    setSelectedId(node.id);
    if (node.data.kind === "category" && node.data.branch) {
      const branch = node.data.branch;
      setCollapsedBranches((prev) => {
        const next = new Set(prev);
        if (next.has(branch)) next.delete(branch);
        else next.add(branch);
        return next;
      });
    }
  }, []);

  const handleSelectionChange = useCallback<OnSelectionChangeFunc<FlowNode, Edge>>(({ nodes: selected }) => {
    if (selected.length > 0) setSelectedId(selected[0].id);
  }, []);

  const handleResetLayout = useCallback(() => {
    setRfNodes(toFlowNodes(initialNodes, {}, liveByNode));
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setCollapsedBranches(new Set());
    window.requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [fitView, initialNodes, liveByNode]);

  const handleFitView = useCallback(() => fitView({ duration: 300 }), [fitView]);
  const handleExpandAll = useCallback(() => setCollapsedBranches(new Set()), []);
  const handleCollapseAll = useCallback(() => {
    const branchIds = initialNodes.filter((node) => node.kind === "category" && node.branch).map((node) => node.branch as SystemMapBranchId);
    setCollapsedBranches(new Set(branchIds));
  }, [initialNodes]);

  const focusNode = useCallback(
    (id: string) => {
      const match = initialNodes.find((node) => node.id === id);
      if (!match) return;
      setSelectedId(match.id);
      if (match.branch) setCollapsedBranches((prev) => { const next = new Set(prev); next.delete(match.branch as SystemMapBranchId); return next; });
      const current = rfNodes.find((node) => node.id === match.id);
      const target = current?.position ?? match.position;
      window.requestAnimationFrame(() => setCenter(target.x + 90, target.y + 30, { zoom: Math.max(getZoom(), 0.9), duration: 300 }));
    },
    [initialNodes, rfNodes, setCenter, getZoom],
  );

  const handleSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const term = search.trim().toLowerCase();
      if (!term) return;
      const incident = liveData.incidents.find((item) => [item.title, item.summary, item.reasonCode, item.nodeKey].join(" ").toLowerCase().includes(term));
      const match = incident ? nodeLookup.get(incident.nodeKey) : initialNodes.find((node) => [node.label, node.subtitle, node.kind, node.description].filter(Boolean).join(" ").toLowerCase().includes(term));
      if (match) focusNode(match.id);
    },
    [search, liveData.incidents, nodeLookup, initialNodes, focusNode],
  );
  const saveNote = useCallback(async (method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown> | null, id?: string) => { const response = await fetch(`/api/admin/system-map/notes${id ? `?id=${encodeURIComponent(id)}` : ""}`, { method, headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined }); if (response.ok) await refreshNotes(); }, [refreshNotes]);
  const selectedNotes = notes.filter((note) => note.node_id === selectedId);
  const snapshotAgeSeconds = Math.max(0, Math.floor((clock - new Date(liveData.generatedAt).getTime()) / 1000));
  const snapshotStale = snapshotAgeSeconds > 90;
  const snapshotUnavailable = liveError || !liveData.sourceAvailable;
  const updatedLabel = snapshotAgeSeconds < 10 ? "Updated just now" : snapshotAgeSeconds < 60 ? `Updated ${snapshotAgeSeconds}s ago` : `Updated ${Math.floor(snapshotAgeSeconds / 60)}m ago`;

  return (
    <div className="sysmap-shell">
      <div className="sysmap-toolbar" role="toolbar" aria-label="System map controls">
        <div className="sysmap-toolbar-group">
          <button type="button" className="sysmap-btn" onClick={handleFitView}>
            Fit view
          </button>
          <button type="button" className="sysmap-btn" onClick={handleResetLayout}>
            Reset layout
          </button>
          <button type="button" className="sysmap-btn" onClick={handleExpandAll}>
            Expand all
          </button>
          <button type="button" className="sysmap-btn" onClick={handleCollapseAll}>
            Collapse all
          </button>
          <button type="button" className="sysmap-btn" disabled={refreshing} onClick={() => void refreshLive()}>
            {refreshing ? "Updating..." : "Refresh health"}
          </button>
        </div>
        <div className="sysmap-health-summary" aria-label="System health summary">
          <span>System health</span>
          <b>{liveData.summary.healthy} healthy</b>
          <b className="warning">{liveData.summary.warning} warning{liveData.summary.warning === 1 ? "" : "s"}</b>
          <b className="critical">{liveData.summary.critical} critical</b>
          <b className="unknown">{liveData.summary.unknown} unknown</b>
          <button type="button" onClick={() => setShowIssues((open) => !open)} aria-expanded={showIssues}>{showIssues ? "Hide issues" : "Show issues"}</button>
        </div>
        <div className={`sysmap-freshness${snapshotStale || snapshotUnavailable ? " stale" : ""}`} title={new Date(liveData.generatedAt).toLocaleString("en-GB")}>
          {liveError ? `Live status unavailable · Last successful update ${updatedLabel.toLowerCase().replace("updated ", "")}` : !liveData.sourceAvailable ? "Live status unavailable · No successful snapshot yet" : snapshotStale ? `${updatedLabel} · Status may be stale` : updatedLabel}
        </div>
        <form className="sysmap-search" role="search" onSubmit={handleSearch}>
          <SearchIcon size={13} />
          <label className="sr-only" htmlFor="sysmap-search-input">
            Search the system map
          </label>
          <input
            id="sysmap-search-input"
            type="text"
            placeholder="Search node, incident, or reason"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
      </div>
      {showIssues && (
        <section className="sysmap-issues" aria-label="Active operational issues">
          <div className="sysmap-issues-head"><div><span>Operational issues</span><strong>{liveData.incidents.length ? "What needs attention now" : "No active incidents"}</strong></div><button type="button" aria-label="Close issue list" onClick={() => setShowIssues(false)}><XIcon size={13} /></button></div>
          <div className="sysmap-issues-list">
            {liveData.incidents.length ? liveData.incidents.map((incident) => <button type="button" key={incident.id} onClick={() => focusNode(incident.nodeKey)}><span className={`sysmap-issue-severity ${incident.severity}`}>{incident.severity}</span><span><strong>{nodeLookup.get(incident.nodeKey)?.label ?? incident.nodeKey}</strong><small>{incident.title}</small><small>{incident.summary}</small></span></button>) : <p>Measured systems are clear. Unknown services remain explicitly unmeasured.</p>}
          </div>
        </section>
      )}
      <div className="sysmap-workspace">
        <div className="sysmap-canvas-wrap">
          <ReactFlow
            nodes={flowNodesWithSelection}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={handleNodeClick}
            onSelectionChange={handleSelectionChange}
            fitView
            fitViewOptions={{ padding: 0.06, maxZoom: 1.15 }}
            minZoom={0.35}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesFocusable
            elementsSelectable
          >
            <Background variant={BackgroundVariant.Dots} gap={26} size={1.4} color="rgba(148,163,184,0.16)" />
            <Controls position="bottom-left" showInteractive={false} className="sysmap-controls" />
          </ReactFlow>
        </div>
        <DetailsPanel node={selectedNode} branchLabel={selectedBranchLabel} live={selectedId ? liveByNode.get(selectedId) : undefined} incident={selectedIncident} nodeLookup={nodeLookup} notes={selectedNotes} onClose={() => setSelectedId(null)} onCreateNote={(title, body) => saveNote("POST", { nodeId: selectedId, title, body })} onEditNote={(note, title, body) => saveNote("PATCH", { id: note.id, title, body })} onDeleteNote={(id) => saveNote("DELETE", null, id)} />
      </div>
    </div>
  );
}

export function SystemMapCanvas(props: { nodes: SystemMapNodeData[]; edges: SystemMapEdge[]; branchLookup: Record<SystemMapBranchId, string>; initialLive: SystemMapLiveData }) {
  return (
    <ReactFlowProvider>
      <SystemMapInner initialNodes={props.nodes} initialEdges={props.edges} branchLookup={props.branchLookup} initialLive={props.initialLive} />
    </ReactFlowProvider>
  );
}
