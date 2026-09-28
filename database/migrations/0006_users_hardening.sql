-- 0006_users_hardening.sql
-- Phase 1, Checkpoint A of docs/IMPLEMENTATION-PLAN.md
--
-- Tightens who may change public.users.role. Three defects in 0002/0004/0005:
--
--   1. A moderator could not approve a practitioner. Approval (0005) promotes the
--      applicant with `update users set role = 'jyotish'`, which fires the role guard,
--      and the guard only let admin/super_admin through -- so the whole approval raised
--      FORBIDDEN. Reproduced in dev before this migration.
--   2. Any admin could make themselves, or anyone, super_admin.
--   3. "users can update own profile" let an account holder rewrite users.email, which
--      is meant to mirror auth.users. No client code updates public.users.
--
-- Additive and re-runnable. Run after 0005_jyotish_verification.sql.
-- Supersedes guard_user_role_change() from 0002/0004 and guard_astrologer_status()
-- from 0005; re-running any of those alone brings back the old bodies, so re-run 0006
-- after them.

begin;

-- ---------------------------------------------------------------------------
-- 1. No self-service UPDATE on users
-- ---------------------------------------------------------------------------
-- The row holds only email (mirrored from auth) and role (staff-assigned), so the
-- account holder has nothing legitimate to edit. Profile data lives in customers /
-- astrologers. "admins can update any user" (0002) stays; the trigger below still
-- guards the role column for every caller, including admins.

drop policy if exists "users can update own profile" on public.users;

-- ---------------------------------------------------------------------------
-- 2. Role-change rules
-- ---------------------------------------------------------------------------
--   no JWT (service role, SQL editor, migrations) -> any change, audited
--   to or from admin / super_admin                -> super_admin only
--   customer -> jyotish with an active practitioner row
--                                                 -> allowed; this is the approval path
--                                                    in 0005, run by whichever reviewer
--                                                    approved. The row can only become
--                                                    active through a reviewer.
--   anything else                                 -> admin or super_admin

create or replace function public.guard_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  if auth.uid() is not null then
    if old.role in ('admin','super_admin') or new.role in ('admin','super_admin') then
      if not public.has_role('super_admin') then
        raise exception 'FORBIDDEN: only a super_admin can grant or remove admin roles'
          using errcode = '42501';
      end if;
    elsif old.role = 'customer' and new.role = 'jyotish'
          and exists (select 1 from public.astrologers
                       where user_id = new.id and status = 'active') then
      null;
    elsif not public.has_role('admin','super_admin') then
      raise exception 'FORBIDDEN: role cannot be changed by this account'
        using errcode = '42501';
    end if;
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

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Promote on approval AFTER the row is active
-- ---------------------------------------------------------------------------
-- 0005 promoted inside the BEFORE trigger, where the astrologers row is not yet
-- written, so the rule above could never see it as active. The promotion moves to an
-- AFTER trigger; guard_astrologer_status is redefined identically minus that block.

create or replace function public.guard_astrologer_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_reviewer boolean := public.has_role('moderator','admin','super_admin');
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not is_reviewer then
      new.status := 'pending_review';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
    new.is_active := (new.status = 'active');
    return new;
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is not null and not is_reviewer then
      raise exception 'FORBIDDEN: only staff can change a practitioner''s status'
        using errcode = '42501';
    end if;

    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    new.reviewed_at := now();

    insert into public.audit_log (
      actor_user_id, actor_role, action, entity_type, entity_id,
      previous_state, new_state, reason
    )
    values (
      auth.uid(),
      (select role from public.users where id = auth.uid()),
      'jyotish.status_changed', 'astrologer', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      new.rejection_reason
    );
  end if;

  new.is_active := (new.status = 'active');
  return new;
end;
$$;

-- Only promote from 'customer' -- never demote staff who also practise.
create or replace function public.promote_approved_astrologer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set role = 'jyotish'
   where id = new.user_id and role = 'customer';
  return null;
end;
$$;

drop trigger if exists trg_astrologers_promote on public.astrologers;
create trigger trg_astrologers_promote
after update of status on public.astrologers
for each row
when (new.status = 'active' and old.status is distinct from 'active')
execute function public.promote_approved_astrologer();

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0006_users_hardening_test.sql
--
-- Expect no self-update policy:
--   select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'users';
