import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");
const includes = (source, value, label) => assert.ok(source.includes(value), `${label}: expected ${value}`);
const h1Count = (source) => (source.match(/<h1(?:\\s|>)/g) ?? []).length;

assert.equal(h1Count(read("src/app/operators/page.tsx")), 1, "operator registry has exactly one page H1");

for (const page of [
  "src/app/operators/page.tsx",
  "src/app/agents/page.tsx",
  "src/app/integrations/page.tsx",
  "src/app/workflows/page.tsx",
  "src/app/use-cases/page.tsx",
  "src/app/memory/page.tsx",
  "src/app/getting-started/page.tsx",
]) {
  const source = read(page);
  assert.match(source, /<Link|href:|href=/, `${page} gives the visitor a contextual next step`);
}

const operators = read("src/app/operators/page.tsx");
includes(operators, "Available today", "operator registry separates current roles");
includes(operators, "Expanding workforce", "operator registry separates future roles");
for (const name of ["Revenue Operator", "Client Flow Operator", "Operations Operator"]) includes(operators, name, "current operator registry");
includes(operators, "Salesforce is read-context only today.", "Salesforce truth on operator page");

const agents = read("src/app/agents/page.tsx");
includes(agents, "Current roles for the work Auterim can support today.", "agents page distinct current-role framing");
assert.ok(!agents.includes("Building Q3 campaign brief"), "agents page contains no invented live operator activity");

const integrations = read("src/app/integrations/page.tsx");
for (const name of ["Gmail", "Microsoft 365", "HubSpot", "Salesforce", "Trello", "Slack"]) includes(integrations, name, "current integration named");
for (const unavailable of ["Pipedrive", "Airtable", "Stripe", "Notion", "Zendesk", "Shopify"]) {
  assert.ok(!integrations.includes(unavailable), `integrations page does not present unavailable ${unavailable}`);
}
includes(integrations, "Salesforce writes are not enabled.", "Salesforce write boundary");

const workflows = read("src/app/workflows/page.tsx");
includes(workflows, "Inbound opportunity workflow", "concrete revenue workflow");
includes(workflows, "Blocked task workflow", "concrete operations workflow");
includes(workflows, "approval", "workflow approval model");

const useCases = read("src/app/use-cases/page.tsx");
includes(useCases, "Available today", "use cases label live work");
includes(useCases, "Expanding workforce", "use cases label future work");

for (const page of [
  "src/app/solutions/revenue-teams/page.tsx",
  "src/app/solutions/client-services/page.tsx",
  "src/app/solutions/operations/page.tsx",
  "src/app/solutions/marketing/page.tsx",
  "src/app/solutions/founders-ops/page.tsx",
]) {
  const source = read(page);
  assert.ok(!source.includes("Pipedrive"), `${page} does not claim Pipedrive support`);
  assert.ok(!source.includes("docs connector"), `${page} does not claim a generic docs connector`);
}

console.log("public-content-quality-smoke: content truth and landing-page checks passed.");
