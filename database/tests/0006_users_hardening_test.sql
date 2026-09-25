-- 0006_users_hardening_test.sql
-- Self-asserting check for database/migrations/0006_users_hardening.sql.
-- Every attempt runs as the `authenticated` role with a JWT, the way the browser does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0006_users_hardening: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','06060606-0000-0000-0000-00000000000c','authenticated','authenticated','hardentest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','06060606-0000-0000-0000-00000000000d','authenticated','authenticated','hardentest-moderator@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','06060606-0000-0000-0000-00000000000a','authenticated','authenticated','hardentest-admin@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','06060606-0000-0000-0000-00000000000f','authenticated','authenticated','hardentest-super@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','06060606-0000-0000-0000-00000000000e','authenticated','authenticated','hardentest-applicant@example.test','', now(), now());

-- Fixture roles, assigned with no JWT (service role path).
update public.users set role = 'moderator'   where id = '06060606-0000-0000-0000-00000000000d';
update public.users set role = 'admin'       where id = '06060606-0000-0000-0000-00000000000a';
update public.users set role = 'super_admin' where id = '06060606-0000-0000-0000-00000000000f';

do $$
declare
  customer_id  constant uuid := '06060606-0000-0000-0000-00000000000c';
  moderator_id constant uuid := '06060606-0000-0000-0000-00000000000d';
  admin_id     constant uuid := '06060606-0000-0000-0000-00000000000a';
  super_id     constant uuid := '06060606-0000-0000-0000-00000000000f';
  applicant_id constant uuid := '06060606-0000-0000-0000-00000000000e';
  n       int;
  blocked boolean;
  logged  record;
begin
  set local role authenticated;

  -- 1. A customer cannot promote themselves (no self-update policy; trigger behind it).
  perform set_config('request.jwt.claims', json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
  begin
    update public.users set role = 'super_admin' where id = customer_id;
  exception when insufficient_privilege then null;
  end;
  if (select role from public.users where id = customer_id) <> 'customer' then
    raise exception 'FAIL: a customer promoted themselves';
  end if;

  -- 2. ...nor rewrite their mirrored email.
  update public.users set email = 'evil@example.test' where id = customer_id;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: a customer updated their own users row';
  end if;

  -- 3. An admin cannot grant admin...
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    update public.users set role = 'admin' where id = customer_id;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: an admin granted admin'; end if;

  -- 4. ...nor make themselves super_admin...
  blocked := false;
  begin
    update public.users set role = 'super_admin' where id = admin_id;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: an admin made themselves super_admin'; end if;

  -- 5. ...nor demote a super_admin.
  blocked := false;
  begin
    update public.users set role = 'customer' where id = super_id;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: an admin demoted a super_admin'; end if;

  -- 6. An admin can still assign non-admin roles.
  update public.users set role = 'support' where id = customer_id;
  if (select role from public.users where id = customer_id) <> 'support' then
    raise exception 'FAIL: an admin could not assign support';
  end if;

  -- 7. A super_admin can grant admin, and it is audited against them.
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);
  update public.users set role = 'admin' where id = customer_id;
  if (select role from public.users where id = customer_id) <> 'admin' then
    raise exception 'FAIL: a super_admin could not grant admin';
  end if;
  select * into logged from public.audit_log
   where action = 'user.role_changed' and entity_id = customer_id and new_state->>'role' = 'admin';
  if logged is null or logged.actor_user_id <> super_id or logged.actor_role <> 'super_admin' then
    raise exception 'FAIL: the admin grant was not audited against the super_admin';
  end if;

  -- 8. A moderator cannot change a role directly.
  perform set_config('request.jwt.claims', json_build_object('sub', moderator_id, 'role', 'authenticated')::text, true);
  update public.users set role = 'jyotish' where id = applicant_id;
  if (select role from public.users where id = applicant_id) <> 'customer' then
    raise exception 'FAIL: a moderator changed a role directly';
  end if;

  -- 9. An applicant applies; a moderator approves, which promotes them to jyotish.
  perform set_config('request.jwt.claims', json_build_object('sub', applicant_id, 'role', 'authenticated')::text, true);
  insert into public.astrologers (user_id, name) values (applicant_id, 'Harden Test');

  perform set_config('request.jwt.claims', json_build_object('sub', moderator_id, 'role', 'authenticated')::text, true);
  update public.astrologers set status = 'active' where user_id = applicant_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: moderator approval touched % rows', n; end if;

  -- 9b. Read back as the table owner, so the check does not depend on staff read access.
  reset role;
  if (select role from public.users where id = applicant_id) <> 'jyotish' then
    raise exception 'FAIL: moderator approval did not promote the applicant';
  end if;
  select * into logged from public.audit_log
   where action = 'user.role_changed' and entity_id = applicant_id;
  if logged is null or logged.actor_user_id <> moderator_id then
    raise exception 'FAIL: the approval promotion was not audited against the moderator';
  end if;
  if (select count(*) from public.audit_log
       where action = 'jyotish.status_changed'
         and entity_id = (select id from public.astrologers where user_id = applicant_id)) <> 1 then
    raise exception 'FAIL: approval did not write exactly one status audit entry';
  end if;

  -- 10. Service role (no JWT) still assigns any role -- how the first super_admin is made.
  perform set_config('request.jwt.claims', null, true);
  update public.users set role = 'super_admin' where id = moderator_id;
  if (select role from public.users where id = moderator_id) <> 'super_admin' then
    raise exception 'FAIL: the service role could not assign super_admin';
  end if;

  raise notice '0006_users_hardening: all assertions passed';
end $$;

rollback;
