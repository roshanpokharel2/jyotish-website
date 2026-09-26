-- 0008_customer_status_guard.sql
-- Phase 1, Checkpoint C of docs/IMPLEMENTATION-PLAN.md
--
-- The account holder owns INSERT and UPDATE on their customers row (profile and birth
-- details), and RLS cannot restrict columns, so `status` was self-writable. Reproduced
-- in dev before this migration: auth-module.js upserts status:'active' on every login,
-- so a blocked customer was unblocked simply by signing in again. Same trigger pattern
-- as AD-9c.
--
-- Rules for any caller with a JWT:
--   * an insert always lands as 'active', whatever the client sent
--   * an update may not change id, user_id, status or created_at
-- Status changes are for the service role (SQL editor now, the Next.js server layer
-- later). There is no staff UPDATE policy on customers, so staff with a JWT could not
-- reach the row anyway. Every status change is audited.
--
-- Additive and re-runnable. Run after 0007_astrologer_protected_fields.sql.

begin;

create or replace function public.guard_customer_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    insert into public.audit_log (
      actor_user_id, actor_role, action, entity_type, entity_id, previous_state, new_state
    )
    values (
      auth.uid(),
      (select role from public.users where id = auth.uid()),
      'customer.status_changed', 'customer', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_customers_guard on public.customers;
create trigger trg_customers_guard
before insert or update on public.customers
for each row execute function public.guard_customer_protected_fields();

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0008_customer_status_guard_test.sql
--
-- Block a customer (service role / SQL editor):
--   update public.customers set status = 'blocked' where user_id = '...';
