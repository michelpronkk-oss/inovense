import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const register = read("src/app/app/register/page.tsx");
const client = read("src/lib/supabase/client.ts");
const errors = read("src/lib/supabase/auth-errors.ts");
const callback = read("src/app/app/auth/callback/route.ts");

assert.match(register, /const submittingRef = useRef\(false\)/, "signup must use a synchronous submission gate");
assert.match(register, /if \(submittingRef\.current\) return;/, "rapid duplicate submits must be ignored");
assert.match(register, /submittingRef\.current = true;/, "gate must close before signUp");
assert.match(register, /\.auth\.signUp\(/, "signup must make one explicit Supabase request");
assert.match(register, /\.auth\.resend\(/, "verification resend must be explicit");
assert.match(register, /type: "signup"/, "resend must use the supported signup flow");
assert.match(register, /setResendCooldown\(60\)/, "resend must throttle repeated requests");
assert.match(register, /emailRedirectTo: appHref\("\/auth\/callback"\)/, "signup must use the canonical callback");

assert.match(client, /configuredUrl !== url/, "configuration must reject surrounding URL whitespace");
assert.match(client, /parsed\.protocol !== "https:"/, "configuration must require HTTPS");
assert.match(client, /endsWith\("\.supabase\.co"\)/, "configuration must require a Supabase hostname");

assert.match(errors, /couldn’t reach the authentication service/i, "network failures need a safe message");
assert.match(errors, /Too many verification emails/i, "email limits need a safe message");
assert.doesNotMatch(callback, /encodeURIComponent\(error\.message\)/, "callback must not expose raw provider errors");

console.log("Signup auth regression contracts passed.");
