import assert from "node:assert/strict";
import fs from "node:fs";
const observers = fs.readFileSync("src/lib/workflows/outcome-observers.ts", "utf8");
assert.match(observers, /observeIntercomResolution/);
assert.match(observers, /observeEmailSupportResolution/);
assert.match(observers, /support_request_resolved/);
assert.match(observers, /Sending email is an execution fact only/);
console.log("support-outcomes-smoke: provider resolution and conservative email outcome contracts passed.");
