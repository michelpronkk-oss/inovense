import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const root = process.cwd();
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "early-access-duplicate-delete-"));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const normalizeEmail = (email) => email.trim().toLowerCase();

function rowFor(email, status = "requested") {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-09-01T10:00:00.000Z",
    name: "Maya Chen",
    email: normalizeEmail(email),
    email_normalized: normalizeEmail(email),
    company: "Northstar Studio",
    role: "COO",
    team_size: "21â€“50",
    use_case: "Coordinate work across the customer onboarding journey.",
    interested_plan: "workforce",
    status,
    reviewed_at: status === "requested" ? null : "2026-09-02T10:00:00.000Z",
    reviewed_by: status === "requested" ? null : "22222222-2222-4222-8222-222222222222",
    notes: "Keep internal review context.",
    confirmation_sent_at: null,
    confirmation_attempted_at: null,
    source: "homepage",
    source_path: "/",
    referrer: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
}

function submission(overrides = {}) {
  return {
    name: "Maya Chen Updated",
    email: "maya.chen@example.com",
    company: "Northstar Studio Updated",
    role: "COO",
    teamSize: "21â€“50",
    useCase: "Coordinate work across the customer onboarding journey with the operations team.",
    interestedPlan: "workforce",
    source: "homepage",
    sourcePath: "/",
    referrer: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    locale: "en",
    ...overrides,
  };
}

function mockSupabase(initialRows = [], options = {}) {
  const rows = initialRows;
  let injectConcurrentInsert = Boolean(options.injectConcurrentInsert);

  class Query {
    constructor(table) {
      this.table = table;
      this.operation = "select";
      this.payload = null;
      this.filters = [];
    }
    select() { return this; }
    eq(column, value) { this.filters.push([column, value]); return this; }
    or() { return this; }
    update(payload) { this.operation = "update"; this.payload = payload; return this; }
    insert(payload) { this.operation = "insert"; this.payload = payload; return this; }
    async maybeSingle() { return this.execute(); }
    async single() { return this.execute(); }
    async execute() {
      assert.equal(this.table, "os_early_access_requests");
      const matches = () => rows.find((row) => this.filters.every(([column, value]) => String(row[column] ?? "") === String(value))) ?? null;
      if (this.operation === "select") return { data: matches(), error: null };
      if (this.operation === "update") {
        const row = matches();
        if (!row) return { data: null, error: { code: "PGRST116", message: "no row" } };
        Object.assign(row, this.payload);
        row.email_normalized = normalizeEmail(row.email);
        return { data: { ...row }, error: null };
      }
      if (this.operation === "insert") {
        const normalizedEmail = normalizeEmail(this.payload.email);
        if (injectConcurrentInsert) {
          injectConcurrentInsert = false;
          rows.push(rowFor(normalizedEmail, "reviewing"));
        }
        if (rows.some((row) => row.email_normalized === normalizedEmail)) {
          return { data: null, error: { code: "23505", message: "duplicate normalized email" } };
        }
        const inserted = { ...rowFor(normalizedEmail), ...this.payload, id: "33333333-3333-4333-8333-333333333333", email_normalized: normalizedEmail };
        rows.push(inserted);
        return { data: { ...inserted }, error: null };
      }
      throw new Error(`Unsupported mock operation: ${this.operation}`);
    }
  }

  return { rows, client: { from: (table) => new Query(table) } };
}

async function loadRepository(mockClient) {
  globalThis.__earlyAccessDeleteTestAdmin = { createSupabaseAdmin: () => mockClient };
  const sourcePath = path.join(root, "src/lib/early-access/supabase-repository.ts");
  let source = fs.readFileSync(sourcePath, "utf8")
    .replace('import "server-only";', "")
    .replace('import { createSupabaseAdmin } from "@/lib/server/supabase-admin";', "const { createSupabaseAdmin } = globalThis.__earlyAccessDeleteTestAdmin;");
  const { code } = esbuild.transformSync(source, { loader: "ts", format: "esm", target: "node18" });
  const output = path.join(temporaryDirectory, `repository-${Math.random().toString(36).slice(2)}.mjs`);
  fs.writeFileSync(output, code, "utf8");
  return import(pathToFileURL(output).href);
}

async function main() {
  try {
    const migration = read("supabase/migrations/20260913_early_access_requests.sql");
    const inviteMigration = read("supabase/migrations/20260914_early_access_invites.sql");
    assert.match(migration, /email_normalized text generated always as \(lower\(btrim\(email\)\)\) stored/);
    assert.match(migration, /create unique index if not exists os_early_access_requests_email_normalized_uidx[\s\S]*on public\.os_early_access_requests \(email_normalized\)/);
    assert.match(inviteMigration, /request_id uuid not null references public\.os_early_access_requests\(id\) on delete cascade/);

    const emptyDb = mockSupabase();
    const emptyRepositoryModule = await loadRepository(emptyDb.client);
    const emptyRepository = emptyRepositoryModule.createEarlyAccessSupabaseRepository();
    const created = await emptyRepository.save(submission());
    assert.equal(created.isNew, true, "the first submission creates one request");
    assert.equal(emptyDb.rows.length, 1);
    assert.equal(emptyDb.rows[0].status, "requested");

    const duplicate = await emptyRepository.save(submission({ email: normalizeEmail("  MAYA.CHEN@EXAMPLE.COM  "), company: "A revised company name" }));
    assert.equal(duplicate.isNew, false);
    assert.equal(emptyDb.rows.length, 1, "trimmed case variants reuse the existing row");
    assert.equal(emptyDb.rows[0].email_normalized, "maya.chen@example.com");
    assert.equal(emptyDb.rows[0].status, "requested");
    assert.equal(emptyDb.rows[0].company, "A revised company name");
    assert.equal(emptyDb.rows[0].created_at, "2026-09-01T10:00:00.000Z");

    for (const status of ["requested", "reviewing", "invited", "accepted", "declined"]) {
      const db = mockSupabase([rowFor("maya.chen@example.com", status)]);
      const repositoryModule = await loadRepository(db.client);
      const result = await repositoryModule.createEarlyAccessSupabaseRepository().save(submission({ company: `Updated ${status}` }));
      assert.equal(result.isNew, false, `${status} resubmission reuses the existing request`);
      assert.equal(db.rows.length, 1, `${status} resubmission does not create a second row`);
      assert.equal(db.rows[0].status, status, `${status} lifecycle state is preserved`);
      assert.equal(db.rows[0].reviewed_at, status === "requested" ? null : "2026-09-02T10:00:00.000Z");
    }

    const raceDb = mockSupabase([], { injectConcurrentInsert: true });
    const raceModule = await loadRepository(raceDb.client);
    const raceResult = await raceModule.createEarlyAccessSupabaseRepository().save(submission());
    assert.equal(raceResult.isNew, false, "a concurrent winner is reused after the unique constraint rejects the competing insert");
    assert.equal(raceDb.rows.length, 1, "the unique index and conflict recovery leave one row under a race");
    assert.equal(raceDb.rows[0].status, "reviewing");

    const inviteReader = read("src/lib/early-access/invites.ts");
    assert.match(inviteReader, /\.eq\("token_hash", hashEarlyAccessToken\(token\)\)/);
    assert.match(inviteReader, /if \(inviteError \|\| !invite\) return null/);

    const action = read("src/app/admin/early-access/actions.ts");
    const deleteAction = action.slice(action.indexOf("export async function deleteEarlyAccessRequest"), action.indexOf("function inviteResultForError"));
    assert.match(deleteAction, /await requireInternalAdmin\(\)/);
    assert.match(deleteAction, /createSupabaseAdmin\(\)[\s\S]*?from\("os_early_access_requests"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("id", id\)/);
    assert.match(deleteAction, /redirect\("\/early-access\?result=deleted"\)/);
    assert.doesNotMatch(deleteAction, /auth\.admin|os_workspaces|os_workspace_members|billing|trial|subscription/);

    const dialog = read("src/app/admin/early-access/delete-request-form.tsx");
    assert.match(dialog, /type="button"[^>]*className="ea-delete-trigger"/);
    assert.match(dialog, /<dialog[\s\S]*aria-modal|<dialog/);
    assert.match(dialog, /Delete \{email\}\?/);
    assert.match(dialog, /This accepted request is linked to a workspace/);
    assert.match(dialog, /Delete permanently/);
    assert.match(dialog, /action=\{deleteEarlyAccessRequest\}/);
    assert.match(dialog, /Existing Auterim accounts, workspaces, memberships, billing, and trials are not deleted/);

    const validation = read("src/lib/early-access/validation.ts");
    const parsedInputStart = validation.search(/return \{\s*ok: true,\s*data:/);
    assert.notEqual(parsedInputStart, -1, "validated public submission returns a single allowlisted field set");
    const parsedInput = validation.slice(parsedInputStart);
    assert.doesNotMatch(parsedInput, /status:|reviewed_at|reviewed_by|invite/i, "public input schema has no lifecycle fields");
    const publicRoute = read("src/app/api/early-access/route.ts");
    assert.match(publicRoute, /if \(result\.ok\) return NextResponse\.json\(\{ ok: true \}\)/, "new and repeat submissions share the same success response");
    assert.doesNotMatch(publicRoute, /NextResponse\.json\(\{\s*(?:status|lifecycleStatus|requestStatus)\s*:/i);

    console.log("early-access-duplicate-delete-smoke: normalized uniqueness, lifecycle preservation, conflict recovery, cascade deletion, admin authorization, and account/workspace isolation passed.");
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
