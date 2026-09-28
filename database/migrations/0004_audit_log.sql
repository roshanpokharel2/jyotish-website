-- 0004_audit_log.sql
-- Step 5 of docs/IMPLEMENTATION-PLAN.md
--
-- An append-only trail for the operations a human performs on money and accounts.
-- It exists before the financial steps so payment approval, refunds and payouts can
-- write to it from their first line rather than having it retrofitted.
--
-- Additive and re-runnable. Run after 0003_platform_settings.sql.

begin;

create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references public.users(id) on delete set null,
  actor_role     text,
  action         text not null,
  entity_type    text not null,
  entity_id      uuid,
  previous_state jsonb,
  new_state      jsonb,
  reason         text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- on delete set null, not cascade: deleting a user must never erase the record of what
-- they approved. actor_role stores the role held AT THE TIME, since roles change later.
comment on table public.audit_log is
  'Append-only trail of privileged actions. No update or delete is permitted, by policy or by trigger.';
comment on column public.audit_log.action is
  'Dotted verb, e.g. payment.approved, payment.rejected, refund.completed, payout.paid, jyotish.verified, user.role_changed.';

alter table public.audit_log enable row level security;

create index if not exists idx_audit_log_entity on public.audit_log (entity_type, entity_id, created_at desc);
create index if not exists idx_audit_log_actor  on public.audit_log (actor_user_id, created_at desc);
create index if not exists idx_audit_log_action on public.audit_log (action, created_at desc);

-- ---------------------------------------------------------------------------
-- Immutability
-- ---------------------------------------------------------------------------
-- Two layers, because they stop different attackers:
--
--   * No update/delete POLICY -- blocks anyone coming through PostgREST with a user JWT.
--   * A trigger that raises -- also blocks the service role and any Edge Function,
--     which bypass RLS entirely. This is what makes "financial history cannot silently
--     disappear" true rather than aspirational.
--
-- Removing history now requires dropping this trigger, which is itself a loud,
-- deliberate act rather than a stray `delete`.

create or replace function public.audit_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only: % is not permitted', lower(tg_op)
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_audit_log_immutable on public.audit_log;
create trigger trg_audit_log_immutable
before update or delete on public.audit_log
for each row execute function public.audit_log_is_append_only();

-- ---------------------------------------------------------------------------
-- Who can read
-- ---------------------------------------------------------------------------
-- Entries quote previous/new state of financial rows, so this is finance-and-above.
-- There is deliberately NO insert policy: writes come from security definer functions
-- and Edge Functions, never straight from a browser.

drop policy if exists "finance and admins can read the audit log" on public.audit_log;
create policy "finance and admins can read the audit log"
on public.audit_log
for select using (public.has_role('finance','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- record_audit() -- the only sanctioned way to write
-- ---------------------------------------------------------------------------
-- The actor is taken from auth.uid(), never from an argument, so a caller cannot
-- attribute their action to somebody else.

create or replace function public.record_audit(
  action         text,
  entity_type    text,
  entity_id      uuid    default null,
  previous_state jsonb   default null,
  new_state      jsonb   default null,
  reason         text    default null,
  metadata       jsonb   default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_id uuid;
begin
  insert into public.audit_log (
    actor_user_id, actor_role, action, entity_type, entity_id,
    previous_state, new_state, reason, metadata
  )
  values (
    auth.uid(),
    (select role from public.users where id = auth.uid()),
    action, entity_type, entity_id,
    previous_state, new_state, reason, coalesce(metadata, '{}'::jsonb)
  )
  returning id into entry_id;

  return entry_id;
end;
$$;

-- Supabase's default privileges grant EXECUTE on new public functions to anon and
-- authenticated BY NAME, so `revoke from public` alone leaves them callable and any
-- signed-in customer could forge entries. Both roles must be revoked explicitly.
revoke all on function public.record_audit(text,text,uuid,jsonb,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_audit(text,text,uuid,jsonb,jsonb,text,jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- First writer: role changes
-- ---------------------------------------------------------------------------
-- Extends the guard from 0002 rather than adding a second trigger. A role change is
-- exactly the kind of privileged act the log exists for, and it gives the table a real
-- producer today instead of waiting for Step 12.

create or replace function public.guard_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.has_role('admin','super_admin') then
      raise exception 'FORBIDDEN: role cannot be changed by the account holder'
        using errcode = '42501';
    end if;

    insert into public.audit_log (
      actor_user_id, actor_role, action, entity_type, entity_id, previous_state, new_state
    )
    values (
      auth.uid(),
      (select role from public.users where id = auth.uid()),
      'user.role_changed', 'user', new.id,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;

  return new;
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0004_audit_log_test.sql -- it asserts and rolls back.
--
--   select created_at, actor_role, action, entity_type, previous_state, new_state
--     from public.audit_log order by created_at desc limit 20;
