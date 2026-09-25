-- 0002_roles_test.sql
-- Self-asserting check for database/migrations/0002_roles.sql.
--
-- Paste the whole file into the Supabase SQL editor and run it. It creates two
-- throwaway Auth users, asserts, and ROLLS BACK -- nothing is left behind.
-- Success looks like: "0002_roles: all assertions passed".
-- Any failure raises and aborts.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures: one customer, one admin-to-be.
-- handle_new_user() mirrors each into public.users with role 'customer'.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','roletest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','roletest-admin@example.test','', now(), now());

do $$
declare
  customer_id constant uuid := '11111111-1111-1111-1111-111111111111';
  admin_id    constant uuid := '22222222-2222-2222-2222-222222222222';
  blocked     boolean := false;
  final_role  text;
begin
  -- fixtures landed
  if (select count(*) from public.users where id in (customer_id, admin_id)) <> 2 then
    raise exception 'FAIL: handle_new_user() did not mirror the auth users into public.users';
  end if;

  -- 1. No JWT (service role) -> has_role is false, never an error.
  perform set_config('request.jwt.claims', null, true);
  if public.has_role('customer') then
    raise exception 'FAIL: has_role() returned true with no authenticated user';
  end if;

  -- 2. As the customer.
  perform set_config('request.jwt.claims', json_build_object('sub', customer_id)::text, true);
  if not public.has_role('customer') then
    raise exception 'FAIL: customer does not have the customer role';
  end if;
  if public.has_role('admin','super_admin') then
    raise exception 'FAIL: customer reported as admin';
  end if;
  if public.is_staff() then
    raise exception 'FAIL: customer reported as staff';
  end if;

  -- 3. Self-promotion must be refused by trg_users_guard_role.
  begin
    update public.users set role = 'super_admin' where id = customer_id;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: a customer was able to promote themselves to super_admin';
  end if;
  if (select role from public.users where id = customer_id) <> 'customer' then
    raise exception 'FAIL: customer role changed despite the guard';
  end if;

  -- 4. A non-role column is still self-updatable.
  update public.users set email = 'roletest-customer-renamed@example.test' where id = customer_id;

  -- 5. Service role (no JWT) may assign roles -- this is how admins are created.
  perform set_config('request.jwt.claims', null, true);
  update public.users set role = 'admin' where id = admin_id;

  -- 6. As the admin.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id)::text, true);
  if not public.has_role('admin') then
    raise exception 'FAIL: admin does not have the admin role';
  end if;
  if not public.is_staff() then
    raise exception 'FAIL: admin is not staff';
  end if;

  -- 7. An admin may change someone else's role.
  update public.users set role = 'support' where id = customer_id;
  select role into final_role from public.users where id = customer_id;
  if final_role <> 'support' then
    raise exception 'FAIL: admin could not assign a role (got %)', final_role;
  end if;

  -- 8. The check constraint rejects invented roles.
  perform set_config('request.jwt.claims', null, true);
  blocked := false;
  begin
    update public.users set role = 'wizard' where id = customer_id;
  exception when check_violation then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: users_role_check accepted an unknown role';
  end if;

  raise notice '0002_roles: all assertions passed';
end $$;

rollback;
