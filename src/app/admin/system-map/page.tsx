import type { Metadata } from "next";
import { SystemMapCanvas } from "./SystemMapCanvas";
import { SYSTEM_MAP_BRANCHES, systemMapEdges, systemMapNodes, type SystemMapBranchId } from "@/lib/admin/system-map";
import { getSystemMapLiveData } from "@/lib/admin/system-map-live";

export const metadata: Metadata = { title: "System map | Auterim Admin", robots: { index: false, follow: false } };

export default async function SystemMapPage() {
  const live = await getSystemMapLiveData();
  const branchLookup = Object.fromEntries(SYSTEM_MAP_BRANCHES.map((branch) => [branch.id, branch.label])) as Record<SystemMapBranchId, string>;

  return <SystemMapCanvas nodes={systemMapNodes} edges={systemMapEdges} branchLookup={branchLookup} initialLive={live} />;
}
