-- 0002_roles.sql
-- Step 3 of docs/IMPLEMENTATION-PLAN.md
--
-- Establishes the authorization primitive every later RLS policy depends on:
--   * the canonical role set
--   * public.has_role() / public.is_staff()
--   * a trigger that stops a user from promoting themselves
--
-- Additive and re-runnable. Run after 0001_baseline_fixes.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Canonical role set
-- ---------------------------------------------------------------------------
-- Old set: customer | astrologer | admin | consultant
-- New set: customer | jyotish | moderator | support | finance | admin | super_admin
--
-- Nothing in the frontend reads public.users.role (chat_participants.role is a
-- different, unrelated column), so the values are migrated rather than aliased.
-- The practitioner TABLE stays public.astrologers -- see docs/ARCHITECTURE-DECISIONS.md
-- AD-1; only the role value is renamed.

update public.users set role = 'jyotish' where role in ('astrologer', 'consultant');

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('customer','jyotish','moderator','support','finance','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 2. has_role() -- the single authorization primitive
-- ---------------------------------------------------------------------------
-- security definer so it can read public.users regardless of that table's own RLS.
-- Without it, a policy on public.users that queries public.users would recurse.
-- search_path is pinned so a caller cannot shadow `users` with their own table.
--
-- It reads the DATABASE, never a JWT claim: a claim is shaped by the client and a
-- forged one must never grant a role.

create or replace function public.has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = any(roles)
  );
$$;

comment on function public.has_role(text[]) is
  'True when the calling user holds any of the given roles. Authorization primitive for RLS.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('moderator','support','finance','admin','super_admin');
$$;

revoke all on function public.has_role(text[]) from public;
revoke all on function public.is_staff() from public;
grant execute on function public.has_role(text[]) to authenticated, anon, service_role;
grant execute on function public.is_staff() to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 3. Close the self-promotion hole
-- ---------------------------------------------------------------------------
-- The policy "users can update own profile" is `using (auth.uid() = id)`, and RLS
-- cannot restrict which COLUMNS an update touches. So today any signed-in customer
-- can call:
--     update public.users set role = 'super_admin' where id = <their own id>;
-- and own the platform. A trigger is the only way to protect the column while the
-- user legitimately owns UPDATE on the row.
--
-- auth.uid() is null for the service role (Edge Functions, SQL editor, migrations),
-- which is how role assignment is performed legitimately.

create or replace function public.guard_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.has_role('admin','super_admin') then
    raise exception 'FORBIDDEN: role cannot be changed by the account holder'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_guard_role on public.users;
create trigger trg_users_guard_role
before update on public.users
for each row execute function public.guard_user_role_change();

-- ---------------------------------------------------------------------------
-- 4. Staff access to users
-- ---------------------------------------------------------------------------
-- Support and admin roles need to see accounts they are acting on; admins need to
-- assign roles. Everyone else keeps self-only access.

drop policy if exists "staff can view all users" on public.users;
create policy "staff can view all users"
on public.users
for select using (public.is_staff());

drop policy if exists "admins can update any user" on public.users;
create policy "admins can update any user"
on public.users
for update using (public.has_role('admin','super_admin'))
with check (public.has_role('admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 5. Replace the inlined admin checks
-- ---------------------------------------------------------------------------
-- `exists (select 1 from public.users where id = auth.uid() and role = 'admin')` was
-- copy-pasted into five policies. Each becomes a has_role() call, so widening staff
-- permissions later is one edit, not five.

drop policy if exists "users can view own service requests" on public.service_requests;
create policy "users can view own service requests"
on public.service_requests
for select using (auth.uid() = user_id or public.is_staff());

drop policy if exists "admins can manage daily horoscopes" on public.daily_horoscopes;
create policy "admins can manage daily horoscopes"
on public.daily_horoscopes
for all using (public.has_role('moderator','admin','super_admin'))
with check (public.has_role('moderator','admin','super_admin'));

drop policy if exists "admins can manage rashifal" on public.rashifal_entries;
create policy "admins can manage rashifal"
on public.rashifal_entries
for all using (public.has_role('moderator','admin','super_admin'))
with check (public.has_role('moderator','admin','super_admin'));

drop policy if exists "admins can manage Vastu plans" on public.vastu_plans;
create policy "admins can manage Vastu plans"
on public.vastu_plans
for all using (public.has_role('admin','super_admin'))
with check (public.has_role('admin','super_admin'));

drop policy if exists "admins can manage Vastu rules" on public.vastu_rules;
create policy "admins can manage Vastu rules"
on public.vastu_rules
for all using (public.has_role('admin','super_admin'))
with check (public.has_role('admin','super_admin'));

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0002_roles_test.sql -- it asserts and rolls back.
--
-- Promote your own account to super_admin (service role / SQL editor only):
--   update public.users set role = 'super_admin' where email = 'you@example.com';
--
-- Confirm no legacy values remain (expect 0 rows):
--   select role, count(*) from public.users
--    where role not in ('customer','jyotish','moderator','support','finance','admin','super_admin')
--    group by role;
