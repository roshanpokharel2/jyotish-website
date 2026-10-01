-- 0037_customer_status.sql
-- Step 20, Checkpoint A2 of docs/IMPLEMENTATION-PLAN.md
--
-- 0008 made a customer's status platform-owned: only a caller without a JWT may change
-- it, and the trigger audits every change. Staff had no way to do that except the SQL
-- editor, and the audit row had no actor (auth.uid() is null for the service role) and
-- no reason.
--
-- set_customer_status(customer, actor, status, reason) is the staff path, called by the
-- server (POST /api/admin/customers/:id/status) after it has checked the caller:
--   * the actor must be support, admin or super_admin;
--   * status is 'active' or 'blocked'; a reason (1-500 characters) is required;
--   * nobody changes their own row, and a staff account's row is refused -- staff are
--     managed by their role, not by blocking;
--   * setting the status it already has is refused, so every call is one audit row.
-- The function hands the actor and reason to the 0008 trigger through transaction-local
-- settings, so the trigger stays the one place a status change is audited. The settings
-- cannot widen access: a JWT caller still cannot change status at all.
--
-- Additive and re-runnable. Run after 0036_availability_no_overlap.sql.

begin;

create or replace function public.guard_customer_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.status := 'active';
    end if;
    return new;
  end if;

  if auth.uid() is not null
     and (new.id, new.user_id, new.status, new.created_at)
         is distinct from (old.id, old.user_id, old.status, old.created_at) then
    raise exception 'FORBIDDEN: account status is managed by the platform'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    actor := coalesce(auth.uid(), nullif(current_setting('app.status_actor', true), '')::uuid);
    insert into public.audit_log (
      actor_user_id, actor_role, action, entity_type, entity_id, previous_state, new_state, reason
    )
    values (
      actor,
      (select role from public.users where id = actor),
      'customer.status_changed', 'customer', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      nullif(current_setting('app.status_reason', true), '')
    );
  end if;

  return new;
end;
$$;

create or replace function public.set_customer_status(p_customer uuid, p_actor uuid, p_status text, p_reason text)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customers;
  reason text := btrim(coalesce(p_reason, ''));
begin
  if coalesce((select role from public.users where id = p_actor), '') not in ('support', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_status is null or p_status not in ('active', 'blocked') then
    raise exception 'INVALID_STATUS';
  end if;
  if reason = '' or length(reason) > 500 then
    raise exception 'REASON_REQUIRED';
  end if;

  select * into c from public.customers where id = p_customer for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if c.user_id = p_actor then
    raise exception 'CANNOT_CHANGE_SELF';
  end if;
  if (select role from public.users where id = c.user_id) not in ('customer', 'jyotish') then
    raise exception 'STAFF_ACCOUNT';
  end if;
  if c.status = p_status then
    raise exception 'STATUS_UNCHANGED';
  end if;

  perform set_config('app.status_actor', p_actor::text, true);
  perform set_config('app.status_reason', reason, true);
  update public.customers set status = p_status where id = p_customer returning * into c;
  perform set_config('app.status_actor', '', true);
  perform set_config('app.status_reason', '', true);
  return c;
end;
$$;

revoke all on function public.set_customer_status(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_customer_status(uuid, uuid, text, text) to service_role;

insert into public.schema_migrations (version, name) values ('0037', 'customer_status');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0037_customer_status_test.sql
