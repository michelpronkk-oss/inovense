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
assert.match(layout, /redirect\("\/activate\?first=1"\)/, "completed onboarding must route canonically");

assert.doesNotMatch(shell, /router\.replace\(/, "client shell must not compete with the server routing authority");
assert.match(urls, /if \(normalized === "\/app"\) return "\/"/, "production helpers must remove legacy prefix");
assert.match(callback, /\? next : "\/onboarding"/, "verified signup must land on onboarding by default");
assert.match(team, /\$\{appUrl\}\/auth\/callback/, "invite email callback cannot retain /app prefix");
assert.match(onboarding, /router\.replace\("\/activate\?first=1"\)/, "onboarding completion must use canonical activation route");

console.log("Product routing regression contracts passed.");
