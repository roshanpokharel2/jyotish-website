-- 0008_customer_status_guard_test.sql
-- Self-asserting check for database/migrations/0008_customer_status_guard.sql.
-- Every attempt runs as the `authenticated` role with a JWT, the way the browser does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0008_customer_status_guard: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','08080808-0000-0000-0000-00000000000c','authenticated','authenticated','statustest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','08080808-0000-0000-0000-00000000000a','authenticated','authenticated','statustest-admin@example.test','', now(), now());

update public.users set role = 'admin' where id = '08080808-0000-0000-0000-00000000000a';

do $$
declare
  customer_id constant uuid := '08080808-0000-0000-0000-00000000000c';
  admin_id    constant uuid := '08080808-0000-0000-0000-00000000000a';
  blocked boolean;
  n       int;
  logged  record;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);

  -- 1. An insert cannot choose its own status.
  insert into public.customers (user_id, full_name, status) values (customer_id, 'Status Test', 'inactive');
  if (select status from public.customers where user_id = customer_id) <> 'active' then
    raise exception 'FAIL: a customer inserted themselves with a chosen status';
  end if;

  -- 2. Profile and birth details stay self-editable (what ask-flow.js does).
  update public.customers
     set full_name = 'Renamed', phone = '9800000000', birth_place = 'Kathmandu', birth_time = '06:30'
   where user_id = customer_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: a customer could not edit their profile'; end if;

  -- 3. A customer cannot change their own status, in either direction.
  blocked := false;
  begin update public.customers set status = 'inactive' where user_id = customer_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer changed their own status'; end if;

  -- 4. Blocked by the platform (service role, no JWT)...
  reset role;
  perform set_config('request.jwt.claims', null, true);
  update public.customers set status = 'blocked' where user_id = customer_id;
  select * into logged from public.audit_log
   where action = 'customer.status_changed'
     and entity_id = (select id from public.customers where user_id = customer_id);
  if logged is null or logged.new_state->>'status' <> 'blocked' then
    raise exception 'FAIL: blocking a customer was not audited';
  end if;

  -- 5. ...the OLD login upsert (sends status) is refused rather than unblocking them...
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.customers (user_id, full_name, phone, status) values (customer_id, 'Status Test', null, 'active')
    on conflict (user_id) do update
      set full_name = excluded.full_name, phone = excluded.phone, status = excluded.status;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: the old login upsert unblocked the customer'; end if;

  -- 6. ...and the NEW login upsert (no status) succeeds and leaves them blocked.
  insert into public.customers (user_id, full_name, phone) values (customer_id, 'Status Test', null)
  on conflict (user_id) do update set full_name = excluded.full_name, phone = excluded.phone;
  reset role;
  if (select status from public.customers where user_id = customer_id) <> 'blocked' then
    raise exception 'FAIL: the new login upsert changed the status';
  end if;

  -- 7. An admin with a JWT cannot change another customer's status from the browser.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  begin
    update public.customers set status = 'active' where user_id = customer_id;
  exception when insufficient_privilege then null;
  end;
  reset role;
  if (select status from public.customers where user_id = customer_id) <> 'blocked' then
    raise exception 'FAIL: a browser session changed another customer''s status';
  end if;

  raise notice '0008_customer_status_guard: all assertions passed';
end $$;

rollback;
