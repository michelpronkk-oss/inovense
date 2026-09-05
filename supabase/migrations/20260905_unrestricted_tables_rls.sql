-- Close public PostgREST exposure of internal CRM/analytics tables.
--
-- Finding: `leads`, `lead_email_log`, `prospects`, and `traffic_sessions`
-- have never had row level security enabled in any tracked migration.
-- Every application code path that reads/writes them
-- (src/lib/supabase-server.ts -> createSupabaseServerClient) already uses
-- the SUPABASE_SERVICE_ROLE_KEY exclusively, and the service role bypasses
-- RLS entirely - so enabling RLS here with zero anon/authenticated
-- policies has no functional effect on the app itself.
--
-- Without RLS, however, these tables are fully readable AND writable by
-- anyone holding the public NEXT_PUBLIC_SUPABASE_ANON_KEY (which ships in
-- every browser bundle) via Supabase's auto-generated REST API
-- (`/rest/v1/leads`, `/rest/v1/prospects`, etc.), completely bypassing this
-- Next.js app. `leads` and `prospects` contain names, emails, deal/pricing
-- data, and internal notes; `lead_email_log` contains send history;
-- `traffic_sessions` contains session-level attribution data. That is a
-- real data-exposure risk independent of any bug in this app's own code.
--
-- No legitimate anonymous ingestion path exists for any of these four
-- tables using the anon key directly - the traffic beacon
-- (`/api/traffic/hit`) and the public intake/onboarding/proposal forms all
-- go through Next.js server actions/route handlers that use the service
-- role key server-side, not a client-side Supabase call. Enabling RLS with
-- no public policies is therefore safe and does not break any intentional
-- anonymous write path.

alter table if exists public.leads enable row level security;
alter table if exists public.lead_email_log enable row level security;
alter table if exists public.prospects enable row level security;
alter table if exists public.traffic_sessions enable row level security;

-- No anon/authenticated policies are added: all legitimate access to these
-- tables is server-side via the service role, which bypasses RLS. If a
-- future feature needs the browser to talk to Supabase directly for one of
-- these tables (e.g. a public intake form posting straight from the
-- client), add a narrow, explicit INSERT-only policy for that specific
-- case rather than leaving RLS off.
