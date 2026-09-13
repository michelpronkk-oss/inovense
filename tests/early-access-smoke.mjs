import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const tmpDir = path.join(root, "tests", ".tmp-early-access-smoke");
const results = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

async function loadModule(relSourcePath, replacements = []) {
  let source = read(relSourcePath);
  for (const [search, replace] of replacements) {
    assert.ok(source.includes(search), `expected import in ${relSourcePath}: ${search}`);
    source = source.replace(search, replace);
  }
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${path.basename(relSourcePath, ".ts")}-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(tmpFile, code, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

async function check(number, name, fn) {
  await fn();
  results.push(number);
  console.log(`  ${number}. ${name}`);
}

function validSubmission(overrides = {}) {
  return {
    name: " Maya Chen ",
    email: " Maya.Chen@Example.com ",
    company: "Northstar Studio",
    role: "COO",
    teamSize: "21–50",
    useCase: "Following up on open deals and coordinating client onboarding.",
    interestedPlan: "workforce",
    sourcePath: "/?utm_source=x",
    referrer: "https://x.com/founder?secret=drop-this#post",
    utmSource: "x",
    utmMedium: "founder",
    utmCampaign: "early_access",
    utmContent: "launch_post_1",
    utmTerm: "ops",
    locale: "en",
    ...overrides,
  };
}

function fakeDependencies(options = {}) {
  const records = options.records ?? new Map();
  const calls = { confirmation: 0, internal: 0, markedSent: 0, logs: [] };
  const repository = {
    async save(submission) {
      if (options.databaseFailure) throw new Error("private database detail");
      const previous = records.get(submission.email);
      if (previous) {
        previous.submission = submission;
        return { ...previous, isNew: false };
      }
      const saved = { id: "secret-row-id", isNew: true, confirmationSentAt: null, confirmationAttemptedAt: null, submission, createdAt: "2026-09-01T12:00:00.000Z" };
      records.set(submission.email, saved);
      return saved;
    },
    async claimConfirmation({ id, attemptedAt, olderThan }) {
      const saved = [...records.values()].find((item) => item.id === id);
      if (!saved) throw new Error("missing");
      if (options.suppressConfirmation) return false;
      if (saved.confirmationAttemptedAt && saved.confirmationAttemptedAt >= olderThan) return false;
      saved.confirmationAttemptedAt = attemptedAt;
      return true;
    },
    async markConfirmationSent({ id, sentAt }) {
      const saved = [...records.values()].find((item) => item.id === id);
      saved.confirmationSentAt = sentAt;
      calls.markedSent += 1;
    },
  };
  return {
    records,
    calls,
    dependencies: {
      repository,
      async sendConfirmation() {
        calls.confirmation += 1;
        if (options.emailFailure) throw new Error("private provider detail");
      },
      async notifyInternal() {
        calls.internal += 1;
        if (options.internalFailure) throw new Error("private provider detail");
      },
      now: () => new Date("2026-09-13T12:00:00.000Z"),
      logFailure(kind) { calls.logs.push(kind); },
    },
  };
}

async function main() {
  try {
    const validation = await loadModule("src/lib/early-access/validation.ts", [[
      'import { PLAN_SLUGS, type PlanSlug } from "@/lib/plan-identity";',
      'const PLAN_SLUGS = ["foundation", "workforce", "scale"];',
    ]]);
    globalThis.__earlyAccessValidation = validation;
    const service = await loadModule("src/lib/early-access/service.ts", [[
      'import { parseEarlyAccessSubmission, type EarlyAccessSubmission } from "./validation";',
      'const { parseEarlyAccessSubmission } = globalThis.__earlyAccessValidation;',
    ]]);
    const email = await loadModule("src/lib/early-access/email.ts", [[
      'import { AUTERIM_URL } from "@/lib/brand";',
      'const AUTERIM_URL = "https://auterim.com";',
    ], [
      'import { PLAN_LABELS } from "@/lib/plan-identity";',
      'const PLAN_LABELS = { foundation: "Foundation", workforce: "Workforce", scale: "Scale" };',
    ]]);
    const guards = await loadModule("src/lib/server/request-guards.ts");

    await check(1, "valid Early Access application passes server validation", () => {
      const parsed = validation.parseEarlyAccessSubmission(validSubmission());
      assert.equal(parsed.ok, true);
      assert.equal(parsed.data.teamSize, "21–50");
    });
    await check(2, "required fields are reported inline by field name", () => {
      const parsed = validation.parseEarlyAccessSubmission({});
      assert.equal(parsed.ok, false);
      for (const field of ["name", "email", "company", "teamSize", "useCase"]) assert.ok(parsed.errors[field]);
    });
    await check(3, "invalid email is rejected", () => {
      const parsed = validation.parseEarlyAccessSubmission(validSubmission({ email: "not-an-email" }));
      assert.equal(parsed.ok, false);
      assert.match(parsed.errors.email, /valid email/i);
    });
    await check(4, "oversized fields are rejected before persistence", () => {
      const parsed = validation.parseEarlyAccessSubmission(validSubmission({ useCase: "x".repeat(1201), company: "x".repeat(161) }));
      assert.equal(parsed.ok, false);
      assert.ok(parsed.errors.useCase);
      assert.ok(parsed.errors.company);
    });
    await check(5, "duplicate normalized email updates one application and preserves created_at", async () => {
      const fake = fakeDependencies();
      const first = await service.submitEarlyAccessRequest(validSubmission(), fake.dependencies);
      const record = fake.records.get("maya.chen@example.com");
      const createdAt = record.createdAt;
      const second = await service.submitEarlyAccessRequest(validSubmission({ email: "MAYA.CHEN@example.com", company: "Northstar Studio Ltd" }), fake.dependencies);
      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      assert.equal(fake.records.size, 1);
      assert.equal(record.createdAt, createdAt);
      assert.equal(record.submission.company, "Northstar Studio Ltd");
      assert.equal(fake.calls.internal, 1, "reapplication does not send a second internal notification");
    });
    await check(6, "email is trimmed and lowercased for uniqueness", () => {
      const parsed = validation.parseEarlyAccessSubmission(validSubmission());
      assert.equal(parsed.data.email, "maya.chen@example.com");
    });
    await check(7, "referrer query data is removed and UTM context is retained", () => {
      const parsed = validation.parseEarlyAccessSubmission(validSubmission());
      assert.equal(parsed.data.referrer, "https://x.com/founder");
      assert.equal(parsed.data.utmSource, "x");
      assert.equal(parsed.data.sourcePath, "/");
    });
    await check(8, "all canonical plan interests pass and legacy slugs are rejected", () => {
      for (const plan of ["foundation", "workforce", "scale"]) {
        const parsed = validation.parseEarlyAccessSubmission(validSubmission({ interestedPlan: plan }));
        assert.equal(parsed.data.interestedPlan, plan);
      }
      for (const plan of ["starter", "growth", "arbitrary"]) {
        assert.equal(validation.parseEarlyAccessSubmission(validSubmission({ interestedPlan: plan })).ok, false);
      }
    });
    await check(9, "database failure returns a safe failure without sending mail", async () => {
      const fake = fakeDependencies({ databaseFailure: true });
      const result = await service.submitEarlyAccessRequest(validSubmission(), fake.dependencies);
      assert.deepEqual(result, { ok: false, status: 500 });
      assert.equal(fake.calls.confirmation, 0);
      assert.equal(fake.calls.internal, 0);
      assert.deepEqual(fake.calls.logs, ["persistence"]);
    });
    await check(10, "confirmation delivery failure leaves saved request successful", async () => {
      const fake = fakeDependencies({ emailFailure: true });
      const result = await service.submitEarlyAccessRequest(validSubmission(), fake.dependencies);
      assert.deepEqual(result, { ok: true });
      assert.equal(fake.records.size, 1);
      assert.equal([...fake.records.values()][0].confirmationSentAt, null);
      assert.ok([...fake.records.values()][0].confirmationAttemptedAt);
      assert.ok(fake.calls.logs.includes("confirmation"));
    });
    await check(11, "recent confirmation attempts are atomically suppressed", async () => {
      const fake = fakeDependencies({ suppressConfirmation: true });
      const result = await service.submitEarlyAccessRequest(validSubmission(), fake.dependencies);
      assert.equal(result.ok, true);
      assert.equal(fake.calls.confirmation, 0);
      assert.equal(fake.calls.markedSent, 0);
    });
    await check(12, "request rate limit blocks the sixth attempt within its window", () => {
      const key = `early-access-test-${Math.random()}`;
      for (let index = 0; index < 5; index += 1) assert.equal(guards.allowRateLimit(key, 5, 600000), true);
      assert.equal(guards.allowRateLimit(key, 5, 600000), false);
    });
    await check(13, "streamed request bodies are capped before full buffering", async () => {
      const small = new Request("https://auterim.com/api/early-access", { method: "POST", body: "{\"ok\":true}" });
      assert.equal(await guards.readRequestBodyWithinLimit(small, 32), "{\"ok\":true}");
      const large = new Request("https://auterim.com/api/early-access", { method: "POST", body: "x".repeat(64) });
      assert.equal(await guards.readRequestBodyWithinLimit(large, 32), null);
    });
    await check(14, "honeypot submissions return success without persistence or mail", async () => {
      const fake = fakeDependencies();
      const result = await service.submitEarlyAccessRequest({ website: "bot input" }, fake.dependencies);
      assert.deepEqual(result, { ok: true });
      assert.equal(fake.records.size, 0);
      assert.equal(fake.calls.confirmation, 0);
    });

    const route = read("src/app/api/early-access/route.ts");
    await check(15, "API returns no IDs, internal status, or review notes", () => {
      assert.match(route, /if \(result\.ok\) return NextResponse\.json\(\{ ok: true \}\)/);
      assert.doesNotMatch(route, /inserted\.data\.id|reviewed_by|notes/);
    });
    await check(16, "Early Access API has no trial-start side effect", () => {
      assert.doesNotMatch(route, /trial\/start|startTrial|ensureOrganicTrial/i);
      assert.doesNotMatch(read("src/lib/early-access/service.ts"), /trial|checkout|billing/i);
    });
    await check(17, "Early Access API creates no workspace", () => {
      assert.doesNotMatch(route, /from\("os_workspaces"\)|createWorkspace|provisionInitialWorkspace/i);
      assert.doesNotMatch(read("src/lib/early-access/supabase-repository.ts"), /os_workspaces/);
    });
    await check(18, "Early Access API creates no authenticated user", () => {
      assert.doesNotMatch(route, /auth\.admin|createUser|signUp/i);
      assert.doesNotMatch(read("src/lib/early-access/supabase-repository.ts"), /auth\.admin|os_workspace_members/);
    });

    const homepage = read("src/components/home-v3/v3-page.tsx");
    const hero = read("src/components/home-v3/hero-editorial.tsx");
    const header = read("src/components/home-v3/v3-header.tsx");
    const modal = read("src/components/early-access/early-access-provider.tsx");
    const modalCss = read("src/components/early-access/early-access.css");
    await check(19, "header, hero, plan cards, and final CTA open the canonical modal", () => {
      assert.equal((header.match(/Request early access/g) ?? []).length, 2, "desktop and mobile navigation");
      assert.match(header, /useOptionalEarlyAccess/);
      assert.match(header, /EarlyAccessProvider/, "standalone public headers must supply a provider when no page-level one exists");
      assert.match(hero, /openEarlyAccess\(\{ trigger:/);
      assert.match(homepage, /plan: plan\.plan_tier/);
      assert.match(homepage, /homepage-final-cta[\s\S]*openEarlyAccess/);
      assert.match(modal, /fetch\("\/api\/early-access"/);
    });
    await check(20, "modal supports mobile sheet layout, focus trap, escape, and focus return", () => {
      assert.match(modal, /aria-modal="true"/);
      assert.match(modal, /event\.key === "Escape"/);
      assert.match(modal, /event\.key !== "Tab"/);
      assert.match(modal, /returnFocusRef\.current\.focus\(\)/);
      assert.match(modalCss, /@media \(max-width: 600px\)[\s\S]*align-items: flex-end/);
      assert.match(modalCss, /100dvh/);
    });

    await check(21, "confirmation email is branded, escaped, and states the explicit trial step", () => {
      const parsed = validation.parseEarlyAccessSubmission(validSubmission({ name: "Maya <script>", useCase: "<script>alert('x')</script>" }));
      const rendered = email.renderEarlyAccessConfirmation(parsed.data);
      assert.equal(rendered.subject, "Your Auterim early access request");
      assert.match(rendered.html, /AUTERIM/);
      assert.match(rendered.html, /&lt;script&gt;/);
      assert.match(rendered.text, /Your trial will only begin when you explicitly choose to start it\./);
      assert.doesNotMatch(rendered.text, /—/);
    });

    const migration = read("supabase/migrations/20260913_early_access_requests.sql");
    await check(22, "migration enforces uniqueness, lifecycle, RLS, grants, and updated_at", () => {
      assert.match(migration, /email_normalized text generated always as \(lower\(btrim\(email\)\)\) stored/);
      assert.match(migration, /unique index if not exists os_early_access_requests_email_normalized_uidx/);
      assert.match(migration, /status in \('requested', 'reviewing', 'invited', 'accepted', 'declined'\)/);
      assert.match(migration, /enable row level security/);
      assert.match(migration, /revoke all on table public\.os_early_access_requests from public, anon, authenticated/);
      assert.match(migration, /grant all on table public\.os_early_access_requests to service_role/);
      assert.match(migration, /interested_plan text check \(interested_plan is null or interested_plan in \('foundation', 'workforce', 'scale'\)\)/);
      assert.match(migration, /execute function set_updated_at\(\)/);
      assert.doesNotMatch(migration, /create policy/i);
    });

    assert.deepEqual(results, Array.from({ length: 22 }, (_, index) => index + 1));
    console.log("early-access-smoke: all 22 scenarios passed.");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete globalThis.__earlyAccessValidation;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
