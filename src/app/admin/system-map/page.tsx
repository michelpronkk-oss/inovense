import type { Metadata } from "next";
import { SystemMapCanvas } from "./SystemMapCanvas";
import { getSystemMapCounts, SYSTEM_MAP_BRANCHES, systemMapEdges, systemMapNodes, type SystemMapBranchId } from "@/lib/admin/system-map";

export const metadata: Metadata = { title: "System map | Auterim Admin", robots: { index: false, follow: false } };

export default async function SystemMapPage() {
  const counts = getSystemMapCounts();
  const branchLookup = Object.fromEntries(SYSTEM_MAP_BRANCHES.map((branch) => [branch.id, branch.label])) as Record<SystemMapBranchId, string>;

  return (
    <div className="admin-command-center admin-system-map-page">
      <div className="admin-page-intro">
        <div>
          <div className="admin-kicker">
            <span className="admin-status-dot live" />
            Auterim / internal architecture
          </div>
          <h1>System map</h1>
          <p>Every real product surface, operator, connector, and control layer Auterim runs on today, rooted at the founder account. Drag, zoom, and click a node for details.</p>
        </div>
        <div className="admin-intro-meta">
          <span className="admin-status-pill live">{counts.liveOperators} live operators</span>
          <span className="admin-status-pill live">{counts.liveConnectors} live connectors</span>
          <span className="admin-status-pill planned">{counts.plannedConnectors} planned connectors</span>
          <span>{counts.infrastructureServices} infrastructure services</span>
        </div>
      </div>
      <SystemMapCanvas nodes={systemMapNodes} edges={systemMapEdges} branchLookup={branchLookup} />
    </div>
  );
}
