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

const STORAGE_KEY = "auterim-admin-system-map-positions-v1";

type FlowNode = Node<SystemMapNodeData, "systemMapNode">;

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

function SystemMapNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const tone = statusTone(data.status);
  const isCollapsible = data.kind === "category";
  return (
    <div
      className={`sysmap-node kind-${data.kind}${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${data.label}${data.status ? `, ${statusLabel(data.status)}` : ""}`}
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
        {data.status && <span className={`admin-status-dot ${tone}`} aria-hidden />}
      </div>
      {data.subtitle && <span className="sysmap-node-subtitle">{data.subtitle}</span>}
      {isCollapsible && (
        <span className="sysmap-node-subtitle" aria-hidden>
          Click to expand / collapse
        </span>
      )}
    </div>
  );
}

const nodeTypes = { systemMapNode: SystemMapNodeCard };

function toFlowNodes(nodes: SystemMapNodeData[], positions: Record<string, { x: number; y: number }>): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "systemMapNode" as const,
    position: positions[node.id] ?? node.position,
    data: node,
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

function DetailsPanel({ node, branchLabel, onClose }: { node: SystemMapNodeData | null; branchLabel?: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

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

  // No overlay at all when nothing is selected -- the graph should get the
  // full canvas by default, not a permanently-reserved empty panel hiding
  // whatever nodes happen to sit under it (previously the Infrastructure
  // column was invisible behind an idle "Select a node..." placeholder).
  if (!node) return null;

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
            <span>Status</span>
            <span className={`admin-status-pill ${statusTone(node.status)}`}>{statusLabel(node.status)}</span>
          </div>
        )}
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
      </div>
    </aside>
  );
}

function SystemMapInner({
  initialNodes,
  initialEdges,
  branchLookup,
}: {
  initialNodes: SystemMapNodeData[];
  initialEdges: SystemMapEdge[];
  branchLookup: Record<SystemMapBranchId, string>;
}) {
  const { fitView, setCenter, getZoom } = useReactFlow<FlowNode, Edge>();
  const [rfNodes, setRfNodes] = useState<FlowNode[]>(() => toFlowNodes(initialNodes, {}));
  const [collapsedBranches, setCollapsedBranches] = useState<Set<SystemMapBranchId>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = loadStoredPositions();
    if (Object.keys(stored).length > 0) setRfNodes(toFlowNodes(initialNodes, stored));
    // Only runs once on mount — deliberately excludes initialNodes from deps
    // since the data source is static for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const visibleEdges = useMemo(
    () => flowEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [flowEdges, visibleIds],
  );

  const flowNodesWithSelection = useMemo(
    () => visibleNodes.map((node) => ({ ...node, selected: node.id === selectedId })),
    [visibleNodes, selectedId],
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
    setRfNodes(toFlowNodes(initialNodes, {}));
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setCollapsedBranches(new Set());
    window.requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [fitView, initialNodes]);

  const handleFitView = useCallback(() => fitView({ duration: 300 }), [fitView]);
  const handleExpandAll = useCallback(() => setCollapsedBranches(new Set()), []);
  const handleCollapseAll = useCallback(() => {
    const branchIds = initialNodes.filter((node) => node.kind === "category" && node.branch).map((node) => node.branch as SystemMapBranchId);
    setCollapsedBranches(new Set(branchIds));
  }, [initialNodes]);

  const handleSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const term = search.trim().toLowerCase();
      if (!term) return;
      const match = initialNodes.find((node) => node.label.toLowerCase().includes(term));
      if (!match) return;
      setSelectedId(match.id);
      if (match.branch) {
        const branch = match.branch;
        setCollapsedBranches((prev) => {
          const next = new Set(prev);
          next.delete(branch);
          return next;
        });
      }
      const current = rfNodes.find((node) => node.id === match.id);
      const target = current?.position ?? match.position;
      window.requestAnimationFrame(() => setCenter(target.x + 90, target.y + 30, { zoom: Math.max(getZoom(), 0.9), duration: 300 }));
    },
    [search, initialNodes, rfNodes, setCenter, getZoom],
  );

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
        </div>
        <form className="sysmap-search" role="search" onSubmit={handleSearch}>
          <SearchIcon size={13} />
          <label className="sr-only" htmlFor="sysmap-search-input">
            Search the system map
          </label>
          <input
            id="sysmap-search-input"
            type="text"
            placeholder="Search operator, connector, or section"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
      </div>
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
          minZoom={0.35}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesFocusable
          elementsSelectable
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1.4} color="rgba(148,163,184,0.16)" />
          <Controls position="bottom-left" showInteractive={false} className="sysmap-controls" />
        </ReactFlow>
        <DetailsPanel node={selectedNode} branchLabel={selectedBranchLabel} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}

export function SystemMapCanvas(props: { nodes: SystemMapNodeData[]; edges: SystemMapEdge[]; branchLookup: Record<SystemMapBranchId, string> }) {
  return (
    <ReactFlowProvider>
      <SystemMapInner initialNodes={props.nodes} initialEdges={props.edges} branchLookup={props.branchLookup} />
    </ReactFlowProvider>
  );
}
