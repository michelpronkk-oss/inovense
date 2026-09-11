import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

const home = read("src/app/page.tsx");
includes(home, "Find the work before your team has to", "homepage owns clear operating-layer positioning");

const homePage = read("src/components/home-v3/v3-page.tsx");
const homeHero = read("src/components/home-v3/hero-editorial.tsx");
const homeOperators = read("src/components/home-v3/operators-editorial.tsx");
const publicState = read("src/lib/public-user-state.ts");
const homepageFaqs = read("src/lib/geo.ts");
includes(homeHero, "Your business has work hiding everywhere.", "homepage hero leads with the business problem");
includes(homeHero, "Set up 3-day trial", "homepage hero gives guests a trial-setup path");
includes(homeHero, "Your trial begins when you start it in your workspace.", "homepage does not imply that a visitor starts a trial passively");
includes(publicState, 'appHref("/onboarding")', "guest trial setup keeps the existing onboarding entry point");
includes(homePage, "pricingPlans.map", "homepage pricing resolves from canonical plans");
assert.ok(!homePage.includes('"$99"'), "homepage does not duplicate plan prices");
includes(homePage, "AUTERIM_HOME_FAQS", "visible homepage FAQs share the structured-data source");
for (const question of ["What is Auterim?", "Do I have to build workflows?", "What can happen automatically?", "Does Auterim replace our existing tools?"]) {
  includes(homepageFaqs, question, "homepage FAQ schema matches visible copy");
}
for (const stage of ["Connect", "Understand", "Find", "Handle", "Measure"]) includes(homePage, stage, "homepage explains the operator loop");
for (const connector of ["Gmail", "Microsoft 365", "HubSpot", "Google Drive", "Slack", "Trello", "Asana", "Jira", "Zendesk"]) includes(homePage, connector, "homepage names a supported connector");
for (const operator of ["Revenue Operator", "Client Flow Operator", "Operations Operator", "Support Operator"]) includes(homeOperators, operator, "homepage shows only a live operator");
assert.ok(!homeOperators.includes('operator("Marketing Operator")'), "homepage does not present a roadmap operator as live");
for (const anchor of ["how", "platform", "control", "connectors", "pricing", "faq"]) {
  includes(homePage, `id="${anchor}"`, "homepage anchor has a live target");
}
for (const staleExample of ["Atlas Studio", "Vela Partners", "M. Keller"]) {
  assert.ok(!homePage.includes(staleExample), `homepage does not use invented ${staleExample} product data`);
}

includes(operators, "Defined AI operators for real business work.", "operators targets business operator intent");
for (const href of ["/integrations", "/approvals", "/workflows", "/getting-started", "/pricing"]) {
  includes(operators, `href=\"${href}\"`, `operators links to ${href}`);
}

includes(agents, "Why business AI agents need defined responsibilities", "agents remains educational and distinct from operators");
assert.ok(!agents.includes('title: "AI Operators for Business"'), "agents metadata does not compete with operators");

const revenue = read("src/app/solutions/revenue-teams/page.tsx");
includes(revenue, "AI sales follow-up", "revenue page targets sales follow-up intent");
includes(revenue, "Salesforce writes are not enabled.", "revenue page preserves Salesforce boundary");
for (const unsupported of ["autonomous prospecting", "lead generation", "cold outreach", "meeting booking"]) {
  assert.ok(!revenue.toLowerCase().includes(unsupported), `revenue page does not claim ${unsupported}`);
}
for (const href of ["/operators", "/integrations", "/approvals", "/workflows", "/pricing"]) {
  includes(revenue, `\"${href}\"`, `revenue links to ${href}`);
}
includes(revenue, 'staticOgImage("/solutions/revenue-teams")', "revenue OG route remains unchanged");

const operations = read("src/app/solutions/operations/page.tsx");
includes(operations, "Trello", "operations page names real Trello scope");
includes(operations, "AI operations monitoring", "operations page supports its scoped search intent");
for (const unsupported of ["Jira", "Asana", "ERP", "process mining"]) {
  assert.ok(!operations.includes(unsupported), `operations page does not claim ${unsupported}`);
}
for (const href of ["/operators", "/integrations", "/approvals", "/workflows", "/pricing"]) {
  includes(operations, `\"${href}\"`, `operations links to ${href}`);
}
includes(operations, 'staticOgImage("/solutions/operations")', "operations OG route remains unchanged");

const approvals = read("src/app/approvals/page.tsx");
includes(approvals, "Human-in-the-loop AI", "approvals explains human-in-the-loop AI");
includes(approvals, "Not every action requires approval.", "approvals does not make all work manual");
for (const href of ["/trust", "/security", "/workflows", "/operators", "/solutions/revenue-teams", "/solutions/operations"]) {
  includes(approvals, `\"${href}\"`, `approvals links to ${href}`);
}
includes(approvals, 'staticOgImage("/approvals")', "approvals OG route remains unchanged");

const marketing = read("src/app/solutions/marketing/page.tsx");
includes(marketing, "not a current production-ready marketing automation capability", "marketing remains clearly future-facing");
assert.ok(!marketing.includes("AI Marketing Operations"), "marketing metadata does not target unavailable automation");

const founders = read("src/app/solutions/founders-ops/page.tsx");
includes(founders, "not a current production operator", "founder operations remains clearly future-facing");
assert.ok(!founders.includes("AI Operators for Founders & Operations"), "founder operations metadata does not target an unavailable operator");

for (const route of ["src/app/ai-agents-for-business", "src/app/business-ai-agents", "src/app/ai-agent-business-platform"]) {
  assert.ok(!existsSync(resolve(process.cwd(), route)), `${route} was not added as a keyword-variant route`);
}

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
