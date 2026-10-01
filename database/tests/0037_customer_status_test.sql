-- 0037_customer_status_test.sql
-- Self-asserting check for database/migrations/0037_customer_status.sql.
-- set_customer_status() runs without a JWT, as the server's service role does; browser
-- attempts run as `authenticated` with a JWT. Creates throwaway users, asserts, and
-- ROLLS BACK. Success: "0037_customer_status: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','37373737-0000-0000-0000-00000000000a','authenticated','authenticated','status-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','37373737-0000-0000-0000-00000000000b','authenticated','authenticated','status-support@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','37373737-0000-0000-0000-00000000000c','authenticated','authenticated','status-moderator@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','37373737-0000-0000-0000-00000000000d','authenticated','authenticated','status-finance@example.test','', now(), now());

update public.users set role = 'support'   where id = '37373737-0000-0000-0000-00000000000b';
update public.users set role = 'moderator' where id = '37373737-0000-0000-0000-00000000000c';
update public.users set role = 'finance'   where id = '37373737-0000-0000-0000-00000000000d';

insert into public.customers (id, user_id, full_name) values
  ('37373737-cccc-0000-0000-00000000000a', '37373737-0000-0000-0000-00000000000a', 'Status Customer'),
  ('37373737-cccc-0000-0000-00000000000b', '37373737-0000-0000-0000-00000000000b', 'Status Support'),
  ('37373737-cccc-0000-0000-00000000000d', '37373737-0000-0000-0000-00000000000d', 'Status Finance');

do $$
declare
  cust     constant uuid := '37373737-cccc-0000-0000-00000000000a';
  own_row  constant uuid := '37373737-cccc-0000-0000-00000000000b';
  staff_row constant uuid := '37373737-cccc-0000-0000-00000000000d';
  user_c   constant uuid := '37373737-0000-0000-0000-00000000000a';
  support  constant uuid := '37373737-0000-0000-0000-00000000000b';
  moder    constant uuid := '37373737-0000-0000-0000-00000000000c';
  c        public.customers;
  a        public.audit_log;
  msg      text;
  blocked  boolean;
begin
  -- 1. Support blocks the customer with a reason; the audit row names them and the
  --    reason. Before 0037 there was no such function.
  c := public.set_customer_status(cust, support, 'blocked', '  Abusive messages  ');
  if c.status <> 'blocked' then raise exception 'FAIL: status is %', c.status; end if;
  select * into a from public.audit_log
   where entity_id = cust and action = 'customer.status_changed' order by created_at desc limit 1;
  if a.actor_user_id is distinct from support or a.actor_role <> 'support'
     or a.reason is distinct from 'Abusive messages' or a.new_state->>'status' <> 'blocked' then
    raise exception 'FAIL: audit row is %', row_to_json(a);
  end if;
  if (select count(*) from public.audit_log where entity_id = cust and action = 'customer.status_changed') <> 1 then
    raise exception 'FAIL: one change wrote more than one audit row';
  end if;

  -- 2. Refusals, each by its message.
  foreach msg in array array[
    'FORBIDDEN:' || moder::text || ':active:x',
    'INVALID_STATUS:' || support::text || ':inactive:x',
    'REASON_REQUIRED:' || support::text || ':active:   ',
    'STATUS_UNCHANGED:' || support::text || ':blocked:again'
  ] loop
    blocked := false;
    begin
      perform public.set_customer_status(cust, split_part(msg, ':', 2)::uuid, split_part(msg, ':', 3), split_part(msg, ':', 4));
    exception when others then
      blocked := sqlerrm = split_part(msg, ':', 1);
    end;
    if not blocked then raise exception 'FAIL: expected %', split_part(msg, ':', 1); end if;
  end loop;

  blocked := false;
  begin perform public.set_customer_status(own_row, support, 'blocked', 'self');
  exception when others then blocked := sqlerrm = 'CANNOT_CHANGE_SELF'; end;
  if not blocked then raise exception 'FAIL: support blocked their own row'; end if;

  blocked := false;
  begin perform public.set_customer_status(staff_row, support, 'blocked', 'staff');
  exception when others then blocked := sqlerrm = 'STAFF_ACCOUNT'; end;
  if not blocked then raise exception 'FAIL: a staff account was blocked'; end if;

  blocked := false;
  begin perform public.set_customer_status(gen_random_uuid(), support, 'blocked', 'nobody');
  exception when others then blocked := sqlerrm = 'NOT_FOUND'; end;
  if not blocked then raise exception 'FAIL: an unknown customer was not refused'; end if;

  -- 3. The settings don't leak past the call: a later service-role change is unattributed.
  if coalesce(current_setting('app.status_actor', true), '') <> '' then
    raise exception 'FAIL: the actor setting outlived the call';
  end if;

  -- 4. Browsers can neither call the function nor change status.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', support, 'role', 'authenticated')::text, true);
  blocked := false;
  begin perform public.set_customer_status(cust, support, 'active', 'browser');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a browser called set_customer_status'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  blocked := false;
  begin update public.customers set status = 'active' where id = cust;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer unblocked themselves'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Unblocking works the same way.
  c := public.set_customer_status(cust, support, 'active', 'Apologised');
  if c.status <> 'active' then raise exception 'FAIL: unblock left %', c.status; end if;

  raise notice '0037_customer_status: all assertions passed';
end;
$$;

rollback;
