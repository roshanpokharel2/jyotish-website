-- 0004_audit_log_test.sql
-- Self-asserting check for database/migrations/0004_audit_log.sql.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0004_audit_log: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','44444444-4444-4444-4444-444444444444','authenticated','authenticated','audittest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','55555555-5555-5555-5555-555555555555','authenticated','authenticated','audittest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','66666666-6666-6666-6666-666666666666','authenticated','authenticated','audittest-admin@example.test','', now(), now());

do $$
declare
  customer_id constant uuid := '44444444-4444-4444-4444-444444444444';
  finance_id  constant uuid := '55555555-5555-5555-5555-555555555555';
  admin_id    constant uuid := '66666666-6666-6666-6666-666666666666';
  entry_id    uuid;
  seen        int;
  blocked     boolean;
  logged      record;
begin
  update public.users set role = 'finance' where id = finance_id;
  update public.users set role = 'admin'   where id = admin_id;

  -- 1. A role change writes its own audit entry (the trigger from 0004).
  select * into logged from public.audit_log
   where action = 'user.role_changed' and entity_id = finance_id;
  if logged is null then
    raise exception 'FAIL: promoting a user did not write an audit entry';
  end if;
  if logged.previous_state->>'role' <> 'customer' or logged.new_state->>'role' <> 'finance' then
    raise exception 'FAIL: audit entry recorded the wrong before/after (% -> %)',
      logged.previous_state->>'role', logged.new_state->>'role';
  end if;

  -- 2. record_audit() stamps the actor from auth.uid(), not from an argument.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  entry_id := public.record_audit(
    'payment.approved', 'payment', null,
    jsonb_build_object('status','under_review'),
    jsonb_build_object('status','paid'),
    'test entry'
  );
  select * into logged from public.audit_log where id = entry_id;
  if logged.actor_user_id <> admin_id then
    raise exception 'FAIL: record_audit() did not attribute the entry to the caller';
  end if;
  if logged.actor_role <> 'admin' then
    raise exception 'FAIL: actor_role was not snapshotted (got %)', logged.actor_role;
  end if;

  -- 3. Append-only: update is refused even here, where RLS is bypassed.
  blocked := false;
  begin
    update public.audit_log set reason = 'tampered' where id = entry_id;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: an audit entry was modified';
  end if;

  -- 4. ...and so is delete.
  blocked := false;
  begin
    delete from public.audit_log where id = entry_id;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: an audit entry was deleted';
  end if;

  -- 5. A customer cannot read the log.
  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
  select count(*) into seen from public.audit_log;
  if seen <> 0 then
    raise exception 'FAIL: a customer read % audit entries', seen;
  end if;

  -- 6. Finance can.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', finance_id, 'role', 'authenticated')::text, true);
  select count(*) into seen from public.audit_log;
  if seen = 0 then
    raise exception 'FAIL: finance cannot read the audit log';
  end if;

  -- 7. A customer cannot forge entries -- record_audit is not granted to them.
  blocked := false;
  begin
    perform set_config('request.jwt.claims',
                       json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
    perform public.record_audit('payment.approved', 'payment');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: a customer forged an audit entry';
  end if;

  reset role;
  raise notice '0004_audit_log: all assertions passed';
end $$;

rollback;
