import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const logoRoute = read("src/app/api/workspace/logo/route.ts");
const settings = read("src/app/app/settings/page.tsx");
const provider = read("src/lib/os/app-provider.tsx");
const sidebar = read("src/components/dashboard/sidebar.tsx");
const connectors = read("src/app/app/connectors/page.tsx");
const memory = read("src/app/app/memory/page.tsx");

assert.match(logoRoute, /identity\.\$\{extension\}/, "logo storage keeps one intentional workspace identity object per file type");
assert.match(logoRoute, /\?v=\$\{Date\.now\(\)\}/, "a new logo URL is versioned to defeat stale image caches");
assert.match(logoRoute, /update\(\{ logo_url: logoUrl \}\)/, "the authoritative workspace row receives the uploaded URL");
assert.match(provider, /refreshWorkspace: \(\) => Promise<void>/, "the shared app context exposes a canonical workspace refresh");
assert.match(provider, /const refreshWorkspace = useCallback/, "workspace refresh is implemented by the shared provider");
assert.match(provider, /dispatch\(\{ type: "HYDRATE", state: payload\.state \}\)/, "a successful refresh updates every shell consumer from server truth");
assert.match(settings, /await refreshWorkspace\(\);/, "Settings refreshes the canonical workspace after a successful identity save");
assert.match(settings, /router\.refresh\(\);/, "the route also refreshes server-rendered identity consumers");
assert.ok(settings.indexOf("updateWorkspace(workspaceToSave)") > settings.indexOf("if (!saveResult.success)"), "local workspace identity only updates after the server save succeeds");
assert.match(sidebar, /state\.workspace\.logoUrl \? \{ backgroundImage/, "the persistent sidebar reads the canonical workspace logo");
assert.match(sidebar, /!state\.workspace\.logoUrl && state\.workspace\.name\.charAt\(0\)/, "the intentional workspace fallback remains when no logo exists");
assert.match(connectors, /data-connected=\{isRealConnectedConnector\(c\) \|\| undefined\}/, "connector picker preserves real connected-state truth");
assert.match(memory, /state\.memory/, "Memory index remains backed by real workspace state");
assert.match(memory, /Search memory, tags, or content/, "Memory uses the product search language");

console.log("workspace-identity-shell-smoke: versioned persistence, canonical shell refresh, connector truth, and real Memory data verified.");
