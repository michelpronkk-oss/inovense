import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");
const includes = (source, value, label) => assert.ok(source.includes(value), `${label}: expected ${value}`);
const h1Count = (source) => (source.match(/<h1(?:\\s|>)/g) ?? []).length;

assert.equal(h1Count(read("src/components/home-v3/public-page-components.tsx")), 2, "shared marketing and legal hero primitives each render one H1");

for (const page of [
  "src/app/operators/page.tsx",
  "src/app/connectors/page.tsx",
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
includes(operators, "Roadmap", "operator registry separates planned roles");
for (const name of ["Revenue Operator", "Client Flow Operator", "Operations Operator", "Support Operator"]) includes(operators, name, "current operator registry");
includes(operators, "Salesforce is read-context only today.", "Salesforce truth on operator page");

const agentsAlias = read("src/app/agents/page.tsx");
includes(agentsAlias, 'permanentRedirect("/operators")', "legacy public agents route consolidates on Operators");

const integrations = read("src/app/connectors/page.tsx");
includes(integrations, "CONNECTOR_CATALOG", "connector page uses the product registry");
includes(integrations, "status === \"available\"", "connector page shows only active connectors");
includes(integrations, "readActions", "connector page reports supported capabilities");
includes(integrations, "approvalRequiredActions", "connector page reports approval boundaries");

const workflows = read("src/app/workflows/page.tsx");
includes(workflows, "Inbound opportunity workflow", "concrete revenue workflow");
includes(workflows, "Blocked task workflow", "concrete operations workflow");
includes(workflows, "approval", "workflow approval model");

const useCases = read("src/app/use-cases/page.tsx");
const useCasesVisuals = read("src/components/home-v3/use-case-finished-visuals.tsx");
for (const area of ["Revenue", "Client Flow", "Operations", "Support"]) includes(useCases, area, "use cases cover current operator outcomes");
for (const required of [
  "Where Auterim moves work forward.",
  "A signal becomes owned work.",
  "A buying signal arrives before the task does.",
  "Surface the missing handoff before onboarding stalls.",
  "Find the blocker before the deadline does.",
  "Unresolved issues need a clear next step.",
  "One business. Shared context. Clear ownership.",
  "Fast does not mean unchecked.",
  "Execution is only the middle.",
  "See what Auterim finds first.",
  "BreadcrumbList",
  "RequestEarlyAccessButton",
  "without assuming causation",
]) includes(useCases, required, "use cases page structure and product truth");
for (const required of ["competitor review, stalled deals, renewals and expansion", "Execute within policy", "Hold for approval", "Stop if not allowed"]) {
  includes(useCasesVisuals, required, "use cases finished visuals carry the real product outcomes");
}
assert.doesNotMatch(useCases, /<details|PublicDisclosure/, "use case explanations are present without closed accordions");
for (const visual of ["OperatingLoopVisual", "RevenueVisual", "ClientFlowVisual", "OperationsVisual", "SupportVisual", "SharedContextVisual", "PolicyForkVisual", "OutcomesVisual"]) {
  includes(useCases, `<${visual} />`, "overview and use case sections render their finished visuals");
}

const home = read("src/app/page.tsx");
includes(home, "Find the work before your team has to", "homepage owns clear operating-layer positioning");

const homePage = read("src/components/home-v3/v3-page.tsx");
const homeHero = read("src/components/home-v3/hero-editorial.tsx");
const homeHeader = read("src/components/home-v3/v3-header.tsx");
const homeVisuals = read("src/components/home-v3/homepage-visuals.tsx");
const homeOperators = read("src/components/home-v3/operators-editorial.tsx");
const earlyAccessProvider = read("src/components/early-access/early-access-provider.tsx");
const homepageFaqs = read("src/lib/geo.ts");
includes(homeHero, "finds the work", "homepage hero leads with the core positioning promise");
includes(homeHero, "before your team has to.", "homepage hero leads with the core positioning promise");
includes(homeHero, "Request early access", "homepage hero opens Early Access");
includes(homeHero, "Early access", "homepage hero identifies the pre-launch program");
includes(homeHeader, "Request early access", "desktop and mobile header use the canonical Early Access CTA");
includes(homeHeader, "useEarlyAccess", "header opens the shared Early Access modal");
includes(homePage, "Early access pricing", "homepage pricing copy makes the pre-launch state clear");
includes(homePage, "Your 3-day trial begins only when you explicitly choose to start it", "homepage preserves explicit trial-start truth");
includes(homePage, "We review each use case before enabling a workspace", "final homepage CTA does not imply immediate product access");
includes(homepageFaqs, "A request does not create an account or start a trial", "homepage FAQ makes the pre-access stage clear");
includes(earlyAccessProvider, 'fetch("/api/early-access"', "homepage conversion submits through the server endpoint");
assert.ok(!homeHero.toLowerCase().includes("set up your workspace") && !homeHero.toLowerCase().includes("start your trial"), "homepage hero does not route visitors into open workspace or trial setup");
includes(homePage, "pricingPlans.map", "homepage pricing resolves from canonical plans");
assert.ok(!homePage.includes('"$99"'), "homepage does not duplicate plan prices");
includes(homePage, "AUTERIM_HOME_FAQS", "visible homepage FAQs share the structured-data source");
for (const question of ["What is Auterim?", "How is Auterim different from a chatbot or workflow builder?", "What are Auterim Operators?", "What can happen automatically?", "Does Auterim replace our existing tools?", "How does Early Access work?"]) {
  includes(homepageFaqs, question, "homepage FAQ schema matches visible copy");
}
for (const stage of ["Connect", "Understand", "Find", "Handle", "Measure"]) includes(homePage, stage, "homepage explains the operator loop");
for (const connector of ["Gmail", "Microsoft 365", "HubSpot", "Google Drive", "Slack", "Trello", "Asana", "Jira", "Zendesk"]) includes(homeVisuals, connector, "homepage names a supported connector");
for (const operator of ["Revenue Operator", "Client Flow Operator", "Operations Operator", "Support Operator"]) includes(homeOperators, operator, "homepage shows only a live operator");
assert.ok(!homeOperators.includes('operator("Marketing Operator")'), "homepage does not present a roadmap operator as live");
for (const anchor of ["how", "platform", "control", "connectors", "pricing", "faq"]) {
  includes(homePage, `id="${anchor}"`, "homepage anchor has a live target");
}
for (const staleExample of ["Atlas Studio", "Vela Partners", "M. Keller"]) {
  assert.ok(!homePage.includes(staleExample), `homepage does not use invented ${staleExample} product data`);
}

includes(operators, "Operators are roles, not chatbots.", "operators clarifies its defined role model");
for (const href of ["/how-it-works"]) {
  includes(operators, href, `operators links to ${href}`);
}

// The /solutions family belonged to the former Inovense site and was removed.
// Assert it stays removed rather than dropping the coverage entirely.
for (const removed of [
  "src/app/solutions/revenue-teams/page.tsx",
  "src/app/solutions/client-services/page.tsx",
  "src/app/solutions/operations/page.tsx",
  "src/app/solutions/marketing/page.tsx",
  "src/app/solutions/founders-ops/page.tsx",
]) {
  assert.ok(!existsSync(resolve(process.cwd(), removed)), `${removed} stays removed`);
}
assert.ok(!existsSync(resolve(process.cwd(), "src/app/solutions")), "the /solutions route family stays removed");
for (const source of ["src/app/sitemap.ts", "src/lib/indexnow.ts", "src/lib/static-og.ts", "src/components/footer.tsx"]) {
  assert.ok(!read(source).includes("/solutions/"), `${source} has no obsolete /solutions reference`);
}

const approvals = read("src/app/approvals/page.tsx");
includes(approvals, "Human-in-the-loop AI", "approvals explains human-in-the-loop AI");
includes(approvals, "Not every action requires approval.", "approvals does not make all work manual");
for (const href of ["/trust", "/security", "/workflows", "/operators", "/use-cases"]) {
  includes(approvals, `\"${href}\"`, `approvals links to ${href}`);
}
includes(approvals, 'staticOgImage("/approvals")', "approvals OG route remains unchanged");

for (const route of ["src/app/ai-agents-for-business", "src/app/business-ai-agents", "src/app/ai-agent-business-platform"]) {
  assert.ok(!existsSync(resolve(process.cwd(), route)), `${route} was not added as a keyword-variant route`);
}

console.log("public-content-quality-smoke: content truth and landing-page checks passed.");
