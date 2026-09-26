-- 0005_jyotish_verification_test.sql
-- Self-asserting check for database/migrations/0005_jyotish_verification.sql.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0005_jyotish_verification: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','77777777-7777-7777-7777-777777777777','authenticated','authenticated','jyotishtest-applicant@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','88888888-8888-8888-8888-888888888888','authenticated','authenticated','jyotishtest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','99999999-9999-9999-9999-999999999999','authenticated','authenticated','jyotishtest-admin@example.test','', now(), now());

do $$
declare
  applicant_id constant uuid := '77777777-7777-7777-7777-777777777777';
  customer_id  constant uuid := '88888888-8888-8888-8888-888888888888';
  admin_id     constant uuid := '99999999-9999-9999-9999-999999999999';
  jyotish_row  record;
  seen    int;
  blocked boolean;
begin
  -- The applicant stays a plain customer: the role is granted by approval, not by applying.
  update public.users set role = 'admin' where id = admin_id;
  if (select role from public.users where id = applicant_id) <> 'customer' then
    raise exception 'FAIL: fixture applicant did not start as a customer';
  end if;

  -- 1. A self-service application lands in review even when it claims to be active.
  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', applicant_id, 'role', 'authenticated')::text, true);

  insert into public.astrologers (user_id, name, status, is_active, consultation_fee)
  values (applicant_id, 'Test Applicant', 'active', true, 1500);

  reset role;
  select * into jyotish_row from public.astrologers where user_id = applicant_id;
  if jyotish_row.status <> 'pending_review' then
    raise exception 'FAIL: application was created with status % instead of pending_review', jyotish_row.status;
  end if;
  if jyotish_row.is_active then
    raise exception 'FAIL: is_active was not forced false for a pending application';
  end if;

  -- 2. The applicant cannot approve themselves.
  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', applicant_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    update public.astrologers set status = 'active' where user_id = applicant_id;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: a practitioner approved themselves';
  end if;

  -- 3. ...but may still edit their own profile.
  update public.astrologers set biography = 'Updated bio' where user_id = applicant_id;

  -- 4. A customer cannot see a pending practitioner.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
  select count(*) into seen from public.astrologers where user_id = applicant_id;
  if seen <> 0 then
    raise exception 'FAIL: a customer can see an unapproved practitioner';
  end if;

  -- 5. Staff approve, which stamps the reviewer and writes an audit entry.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  update public.astrologers set status = 'active' where user_id = applicant_id;

  reset role;
  select * into jyotish_row from public.astrologers where user_id = applicant_id;
  if jyotish_row.status <> 'active' then
    raise exception 'FAIL: staff could not approve the application';
  end if;
  if not jyotish_row.is_active then
    raise exception 'FAIL: is_active did not follow status on approval';
  end if;
  if jyotish_row.reviewed_by <> admin_id or jyotish_row.reviewed_at is null then
    raise exception 'FAIL: the reviewer was not stamped';
  end if;

  select count(*) into seen from public.audit_log
   where action = 'jyotish.status_changed'
     and entity_id = jyotish_row.id
     and new_state->>'status' = 'active';
  if seen <> 1 then
    raise exception 'FAIL: approval wrote % audit entries, expected 1', seen;
  end if;

  -- 5b. Approval is what grants the role. Applicants stay 'customer' while pending.
  if (select role from public.users where id = applicant_id) <> 'jyotish' then
    raise exception 'FAIL: approval did not promote the user to the jyotish role';
  end if;

  -- 6. The customer can now see them -- in the directory, not the row (0017).
  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
  select count(*) into seen from public.active_practitioners() where id = jyotish_row.id;
  if seen <> 1 then
    raise exception 'FAIL: an approved practitioner is not visible to customers';
  end if;

  -- 7. A rejection must carry a reason. Runs as the reviewer: `reset role` alone would
  --    leave the customer's claims in place and trip the status guard instead.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    update public.astrologers set status = 'rejected', rejection_reason = null
     where user_id = applicant_id;
  exception when check_violation then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: a practitioner was rejected without a reason';
  end if;

  update public.astrologers
     set status = 'rejected', rejection_reason = 'Credentials could not be verified'
   where user_id = applicant_id;

  raise notice '0005_jyotish_verification: all assertions passed';
end $$;

rollback;
