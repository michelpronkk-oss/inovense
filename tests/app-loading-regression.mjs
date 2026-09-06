import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const layout = read("src/app/app/layout.tsx");
const shell = read("src/app/app/app-shell.tsx");
const provider = read("src/lib/os/app-provider.tsx");
const overview = read("src/components/dashboard/overview.tsx");
const overviewRoute = read("src/app/api/dashboard/overview/route.ts");
const stateRoute = read("src/app/api/os/state/route.ts");
const workspaceAccess = read("src/lib/server/workspace-access.ts");
const stateGetRoute = stateRoute.slice(
  stateRoute.indexOf("export async function GET"),
  stateRoute.indexOf("export async function POST"),
);

// 1. Unknown workspace state is explicit loading, never forbidden.
assert.match(provider, /initialContext \? "loading" : "ready"/);
assert.match(shell, /bootstrapStatus === "loading"/);
assert.ok(
  shell.indexOf('bootstrapStatus === "loading"') < shell.indexOf('bootstrapStatus === "forbidden"'),
  "the shell must resolve loading before considering a forbidden state",
);

// 2. The verified server gateway context seeds the client bootstrap.
assert.match(layout, /workspaceId: gateway\.workspaceId/);
assert.match(layout, /<AppProvider initialContext=\{initialContext\}>/);

// 3. A definitive 403 remains a real forbidden state.
assert.match(provider, /status === 403/);
assert.match(provider, /status: "forbidden"/);
assert.match(shell, /bootstrapStatus === "forbidden"/);

// 4. Pending dashboard data renders geometry-matched skeletons.
assert.match(overview, /loading && !overview\) return <DashboardLoadingState \/>/);
assert.match(shell, /return <AppLoadingShell \/>/);

// 5. Dashboard error UI is reached only after the pending branch.
assert.ok(
  overview.indexOf("loading && !overview") < overview.indexOf("if (!overview)"),
  "dashboard loading must be handled before the terminal error branch",
);

// 6. Internal authorization codes are not customer-facing shell/overview copy.
for (const source of [shell, overview]) {
  assert.doesNotMatch(source, /workspace_forbidden|missing_membership/);
}
assert.doesNotMatch(overviewRoute, /error:\s*"dashboard_overview_failed"/);
assert.doesNotMatch(overviewRoute, /error:\s*context\.(?:error|code)/);
assert.doesNotMatch(stateGetRoute, /NextResponse\.json\(\{\s*error:\s*message\s*\}/);

// 7. Server and client must agree on the active workspace before hydration.
assert.match(provider, /payload\.workspaceId !== initialContext\.workspaceId/);
assert.match(provider, /workspaceId: initialContext\.workspaceId/);

// 8. Security checks remain server-authoritative and precede parallel data reads.
assert.match(layout, /resolveAppGateway/);
assert.match(overviewRoute, /resolveWorkspaceContext/);
assert.match(overviewRoute, /allowDevFallback: false/);
assert.match(stateRoute, /const context = await resolveWorkspaceContext/);
assert.match(stateRoute, /await Promise\.all\(\[/);
assert.match(workspaceAccess, /const \[memberships, profileResult\] = await Promise\.all/);
assert.ok(
  workspaceAccess.indexOf("memberships.some((m) => m.workspace_id === saved)") < workspaceAccess.indexOf('m.role_key === "owner"')
    && workspaceAccess.indexOf('m.role_key === "owner"') < workspaceAccess.indexOf("memberships[0].workspace_id"),
  "active workspace priority must remain saved valid workspace, owner workspace, then oldest membership",
);
assert.ok(
  stateRoute.indexOf("await resolveWorkspaceContext") < stateRoute.indexOf("await Promise.all"),
  "parallel workspace reads must begin only after authorization",
);

console.log("Authenticated app loading-state regression contracts passed.");
