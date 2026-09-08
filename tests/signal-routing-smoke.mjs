import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/signals/engine.ts", "utf8");
const adapters = fs.readFileSync("src/lib/signals/adapters.ts", "utf8");

assert.match(engine, /sales_opportunity[\s\S]{0,180}operatorKeys\.push\("revenue"\)/);
assert.match(engine, /customer_request[\s\S]{0,220}operatorKeys\.push\("client_flow"\)/);
assert.match(engine, /blocked_work[\s\S]{0,240}operatorKeys\.push\("operations"\)/);
assert.match(engine, /document_change/);
assert.match(engine, /Drive change is retained as an awareness event/);
assert.match(adapters, /normalizeTeamsSignal/);
assert.match(adapters, /normalizeZendeskSignal/);
assert.match(adapters, /normalizeProjectTaskSignal/);
assert.match(adapters, /normalizeDriveSignal/);
assert.doesNotMatch(engine, /executeAction|prepareAction|sendSlack|createApproval/);
console.log("Signal routing smoke: explicit operator routes, source adapters, Drive awareness boundary, and no execution path verified.");
