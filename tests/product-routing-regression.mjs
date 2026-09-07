import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const middleware = read("src/middleware.ts");
const layout = read("src/app/app/layout.tsx");
const shell = read("src/app/app/app-shell.tsx");
const urls = read("src/lib/urls.ts");
const callback = read("src/app/app/auth/callback/route.ts");
const team = read("src/app/app/team/actions.ts");
const onboarding = read("src/app/app/onboarding/page.tsx");

assert.match(middleware, /originalPathname === "\/app" \|\| originalPathname\.startsWith\("\/app\/"\)/, "legacy /app paths must be canonicalized at the edge");
assert.match(middleware, /NextResponse\.redirect\(canonicalUrl, \{ status: 308 \}\)/, "legacy paths need a single permanent redirect");
assert.match(middleware, /Historical product links occasionally used the marketing host/, "legacy marketing-host links must move directly to the app host");
assert.match(middleware, /originalPathname === "\/" \? "\/app" : `\/app\$\{originalPathname\}`/, "canonical app-host paths must rewrite internally");

assert.match(layout, /const PUBLIC_APP_PATHS = new Set\(\[\s*"\/login"/, "server guard must use canonical public routes");
assert.match(layout, /redirect\(`\/login\?from=/, "unauthenticated users must go to canonical login");
assert.match(layout, /redirect\("\/onboarding"\)/, "incomplete onboarding must have one canonical target");
assert.match(layout, /redirect\("\/"\)/, "completed onboarding must return to the overview");

assert.doesNotMatch(shell, /router\.replace\(/, "client shell must not compete with the server routing authority");
assert.match(urls, /if \(normalized === "\/app"\) return "\/"/, "production helpers must remove legacy prefix");
assert.match(callback, /\? next : "\/"/, "verified auth links must default into the app gateway, which alone decides onboarding vs. product");
// Invite emails link straight to /invite/accept?token=... (no /auth/callback
// hop, no /app prefix) -- workspace invites are never routed through a
// Supabase-generated auth link, so existing users are never forced through
// a signup-only flow. See getAppUrl() usage in deliverInviteEmail().
assert.match(team, /\$\{getAppUrl\(\)\}\/invite\/accept\?token=/, "invite email must link directly to the invite accept page, not through /auth/callback");
assert.doesNotMatch(team, /auth\.admin\.generateLink/, "invite delivery must not depend on Supabase Auth user creation");
assert.match(onboarding, /router\.replace\("\/"\)/, "onboarding completion must return to the overview");

console.log("Product routing regression contracts passed.");
