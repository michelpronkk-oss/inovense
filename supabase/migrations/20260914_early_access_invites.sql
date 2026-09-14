-- Secure Early Access invitations are separate from workspace member invites:
-- they have no workspace/role until the verified applicant accepts.
create extension if not exists pgcrypto;

create table if not exists public.os_early_access_invites (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.os_early_access_requests(id) on delete cascade,
  email_normalized text not null check (email_normalized = lower(btrim(email_normalized))),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  delivery_state text not null default 'pending'
    check (delivery_state in ('pending', 'sent', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_attempted_at timestamptz not null default now(),
  last_sent_at timestamptz,
  error_code text check (error_code is null or error_code in ('resend_not_configured', 'resend_error', 'send_state_uncertain', 'attempt_timed_out')),
  accepted_at timestamptz,
  revoked_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_workspace_id text references public.os_workspaces(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint os_early_access_invites_expiry_chk check (expires_at > created_at),
  constraint os_early_access_invites_acceptance_chk check (
    (accepted_at is null and accepted_user_id is null and accepted_workspace_id is null)
    or (accepted_at is not null and accepted_user_id is not null and accepted_workspace_id is not null)
  ),
  constraint os_early_access_invites_accepted_sent_chk check (accepted_at is null or delivery_state = 'sent')
);

comment on table public.os_early_access_invites is
  'Early Access invite history. Bearer tokens are never stored; token_hash is SHA-256 of the email-only token.';
comment on column public.os_early_access_invites.token_hash is
  'SHA-256 of the 256-bit base64url token. Never expose this value to applicants.';
comment on column public.os_early_access_invites.delivery_state is
  'Resend provider attempt state. sent means accepted by the provider, not confirmed mailbox delivery.';

create index if not exists os_early_access_invites_request_created_idx
  on public.os_early_access_invites (request_id, created_at desc);
create unique index if not exists os_early_access_invites_one_pending_request_uidx
  on public.os_early_access_invites (request_id)
  where delivery_state = 'pending' and accepted_at is null and revoked_at is null;
create unique index if not exists os_early_access_invites_one_active_sent_request_uidx
  on public.os_early_access_invites (request_id)
  where delivery_state = 'sent' and accepted_at is null and revoked_at is null;

alter table public.os_early_access_invites enable row level security;
revoke all on table public.os_early_access_invites from public, anon, authenticated;
grant all on table public.os_early_access_invites to service_role;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_os_early_access_invites_updated_at'
      and tgrelid = 'public.os_early_access_invites'::regclass
  ) then
    create trigger trg_os_early_access_invites_updated_at
      before update on public.os_early_access_invites
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- RPCs are callable only with a verified Supabase session. They repeat the
-- internal-admin check even though the UI also checks it server-side.
create or replace function public.is_active_internal_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.os_internal_admins a
    join auth.users u on u.id = p_user_id
    where a.is_active = true
      and (a.user_id = p_user_id or lower(btrim(a.email)) = lower(btrim(u.email)))
  );
$$;
revoke all on function public.is_active_internal_admin(uuid) from public, anon, authenticated;

create or replace function public.prepare_early_access_invite(
  p_request_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table (invite_id uuid, request_email text, request_name text, is_resend boolean)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.os_early_access_requests%rowtype;
  v_active_count integer;
  v_invite_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;
  if not public.is_active_internal_admin(v_uid) then raise exception 'not_internal_admin'; end if;
  if p_request_id is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_invite_input'; end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '8 days' then raise exception 'invalid_invite_expiry'; end if;

  select * into v_request
  from public.os_early_access_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'early_access_request_not_found'; end if;
  if v_request.status not in ('reviewing', 'invited') then raise exception 'early_access_request_not_reviewable'; end if;

  -- A prior pending attempt can only be reused for a short provider-call
  -- window. This releases the per-request pending slot after a process crash.
  update public.os_early_access_invites
  set delivery_state = 'failed', error_code = 'attempt_timed_out'
  where request_id = p_request_id
    and delivery_state = 'pending'
    and created_at < now() - interval '10 minutes'
    and accepted_at is null and revoked_at is null;

  if exists (
    select 1 from public.os_early_access_invites
    where request_id = p_request_id and delivery_state = 'pending'
      and accepted_at is null and revoked_at is null
  ) then raise exception 'early_access_invite_send_in_progress'; end if;

  select count(*) into v_active_count
  from public.os_early_access_invites
  where request_id = p_request_id and created_at >= now() - interval '1 hour';
  if v_active_count >= 5 then raise exception 'early_access_invite_rate_limited'; end if;

  -- Expired links are already unusable. Revoke their active marker so a
  -- replacement invite can become the sole active sent record.
  update public.os_early_access_invites
  set revoked_at = now()
  where request_id = p_request_id
    and delivery_state = 'sent'
    and accepted_at is null and revoked_at is null
    and expires_at <= now();

  insert into public.os_early_access_invites (
    request_id, email_normalized, token_hash, delivery_state, created_by, expires_at, last_attempted_at
  ) values (
    p_request_id, v_request.email_normalized, p_token_hash, 'pending', v_uid, p_expires_at, now()
  ) returning id into v_invite_id;

  return query select v_invite_id, v_request.email_normalized, v_request.name, v_request.status = 'invited';
end;
$$;

create or replace function public.finalize_early_access_invite_send(p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;
  if not public.is_active_internal_admin(v_uid) then raise exception 'not_internal_admin'; end if;
  select request_id into v_request_id from public.os_early_access_invites where id = p_invite_id;
  if v_request_id is null then raise exception 'early_access_invite_not_found'; end if;
  select status into v_status from public.os_early_access_requests where id = v_request_id for update;
  if v_status not in ('reviewing', 'invited') then raise exception 'early_access_request_not_reviewable'; end if;

  perform 1 from public.os_early_access_invites where id = p_invite_id for update;
  if not found then raise exception 'early_access_invite_not_found'; end if;
  if exists (select 1 from public.os_early_access_invites where id = p_invite_id and delivery_state <> 'pending') then
    raise exception 'early_access_invite_not_pending';
  end if;

  -- Release the old sent row before activating the replacement because the
  -- partial unique index permits only one active sent invite per request.
  update public.os_early_access_invites
  set revoked_at = now()
  where request_id = v_request_id and id <> p_invite_id
    and delivery_state = 'sent' and accepted_at is null and revoked_at is null;

  update public.os_early_access_invites
  set delivery_state = 'sent', last_sent_at = now(), error_code = null
  where id = p_invite_id;

  update public.os_early_access_requests
  set status = 'invited', reviewed_at = now(), reviewed_by = v_uid
  where id = v_request_id and status in ('reviewing', 'invited');

  return true;
end;
$$;

create or replace function public.fail_early_access_invite_send(p_invite_id uuid, p_error_code text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;
  if not public.is_active_internal_admin(v_uid) then raise exception 'not_internal_admin'; end if;
  select request_id into v_request_id from public.os_early_access_invites where id = p_invite_id;
  if v_request_id is null then raise exception 'early_access_invite_not_found'; end if;
  perform 1 from public.os_early_access_requests where id = v_request_id for update;
  perform 1 from public.os_early_access_invites where id = p_invite_id for update;
  if not found then raise exception 'early_access_invite_not_found'; end if;

  update public.os_early_access_invites
  set delivery_state = 'failed', error_code = case
    when p_error_code in ('resend_not_configured', 'resend_error', 'send_state_uncertain') then p_error_code
    else 'resend_error'
  end
  where id = p_invite_id and delivery_state = 'pending';
  return found;
end;
$$;

create or replace function public.revoke_early_access_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;
  if not public.is_active_internal_admin(v_uid) then raise exception 'not_internal_admin'; end if;
  select request_id into v_request_id from public.os_early_access_invites where id = p_invite_id;
  if v_request_id is null then raise exception 'early_access_invite_not_found'; end if;
  select status into v_status from public.os_early_access_requests where id = v_request_id for update;
  perform 1 from public.os_early_access_invites where id = p_invite_id for update;
  if not found then raise exception 'early_access_invite_not_found'; end if;
  if exists (select 1 from public.os_early_access_invites where id = p_invite_id and accepted_at is not null) or v_status = 'accepted' then
    raise exception 'early_access_invite_already_accepted';
  end if;

  update public.os_early_access_invites
  set revoked_at = now(), delivery_state = case when delivery_state = 'pending' then 'failed' else delivery_state end
  where id = p_invite_id and revoked_at is null;
  if v_status = 'invited' then
    update public.os_early_access_requests
    set status = 'reviewing', reviewed_at = now(), reviewed_by = v_uid
    where id = v_request_id;
  end if;
  return v_request_id;
end;
$$;

create or replace function public.accept_early_access_invite(p_token text)
returns table (workspace_id text, workspace_name text, created boolean, already_accepted boolean)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_invite public.os_early_access_invites%rowtype;
  v_request public.os_early_access_requests%rowtype;
  v_email text;
  v_email_confirmed_at timestamptz;
  v_metadata jsonb;
  v_full_name text;
  v_workspace record;
  v_workspace_name text;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;
  if p_token is null or char_length(p_token) <> 43 or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'early_access_invite_invalid';
  end if;

  select lower(btrim(u.email)), u.email_confirmed_at, u.raw_user_meta_data
  into v_email, v_email_confirmed_at, v_metadata
  from auth.users u where u.id = v_uid;
  if v_email is null then raise exception 'user_not_found'; end if;
  if v_email_confirmed_at is null then raise exception 'early_access_email_not_verified'; end if;

  select i.request_id into v_request_id
  from public.os_early_access_invites i
  where i.token_hash = encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  if v_request_id is null then raise exception 'early_access_invite_invalid'; end if;

  -- Use the same lock order as admin resend/revoke RPCs to avoid deadlocks.
  select * into v_request from public.os_early_access_requests where id = v_request_id for update;
  select * into v_invite from public.os_early_access_invites
  where request_id = v_request_id
    and token_hash = encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
  for update;
  if v_invite.id is null then raise exception 'early_access_invite_invalid'; end if;

  if v_invite.accepted_at is not null then
    if v_invite.accepted_user_id = v_uid and v_invite.accepted_workspace_id is not null then
      select w.name into v_workspace_name from public.os_workspaces w where w.id = v_invite.accepted_workspace_id;
      return query select v_invite.accepted_workspace_id, coalesce(v_workspace_name, v_request.company), false, true;
      return;
    end if;
    raise exception 'early_access_invite_already_accepted';
  end if;
  if v_invite.revoked_at is not null then raise exception 'early_access_invite_revoked'; end if;
  if v_invite.expires_at <= now() then raise exception 'early_access_invite_expired'; end if;
  if v_invite.delivery_state <> 'sent' or v_request.status <> 'invited' then raise exception 'early_access_invite_not_ready'; end if;
  if v_email <> v_invite.email_normalized or v_request.email_normalized <> v_invite.email_normalized then
    raise exception 'early_access_invite_email_mismatch';
  end if;

  v_full_name := coalesce(nullif(btrim(v_metadata ->> 'full_name'), ''), nullif(btrim(v_metadata ->> 'name'), ''), split_part(v_email, '@', 1));
  select * into v_workspace
  from public.provision_initial_workspace(v_full_name, v_request.company);
  if v_workspace.workspace_id is null then raise exception 'early_access_workspace_unavailable'; end if;

  update public.os_early_access_invites
  set accepted_at = now(), accepted_user_id = v_uid, accepted_workspace_id = v_workspace.workspace_id
  where id = v_invite.id and accepted_at is null and revoked_at is null;
  if not found then raise exception 'early_access_invite_already_accepted'; end if;

  update public.os_early_access_requests set status = 'accepted'
  where id = v_request.id and status = 'invited';
  if not found then raise exception 'early_access_request_not_invited'; end if;

  return query select v_workspace.workspace_id, v_workspace.workspace_name, v_workspace.created, false;
end;
$$;

-- A request cannot enter the accepted state through the generic admin status
-- update path. The acceptance RPC records the consumed invitation first.
create or replace function public.guard_early_access_accepted_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' and not exists (
    select 1 from public.os_early_access_invites i
    where i.request_id = new.id and i.accepted_at is not null
      and i.accepted_user_id is not null and i.accepted_workspace_id is not null
  ) then
    raise exception 'early_access_acceptance_required';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_early_access_accepted_status on public.os_early_access_requests;
create trigger trg_guard_early_access_accepted_status
  before update of status on public.os_early_access_requests
  for each row execute function public.guard_early_access_accepted_status();

revoke all on function public.prepare_early_access_invite(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.finalize_early_access_invite_send(uuid) from public, anon, authenticated;
revoke all on function public.fail_early_access_invite_send(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_early_access_invite(uuid) from public, anon, authenticated;
revoke all on function public.accept_early_access_invite(text) from public, anon, authenticated;
grant execute on function public.prepare_early_access_invite(uuid, text, timestamptz) to authenticated;
grant execute on function public.finalize_early_access_invite_send(uuid) to authenticated;
grant execute on function public.fail_early_access_invite_send(uuid, text) to authenticated;
grant execute on function public.revoke_early_access_invite(uuid) to authenticated;
grant execute on function public.accept_early_access_invite(text) to authenticated;
