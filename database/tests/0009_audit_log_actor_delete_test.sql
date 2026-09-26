-- 0009_audit_log_actor_delete_test.sql
-- Self-asserting check for database/migrations/0009_audit_log_actor_delete.sql.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0009_audit_log_actor_delete: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','09090909-0000-0000-0000-00000000000a','authenticated','authenticated','deltest-admin@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','09090909-0000-0000-0000-00000000000c','authenticated','authenticated','deltest-customer@example.test','', now(), now());

update public.users set role = 'admin' where id = '09090909-0000-0000-0000-00000000000a';

do $$
declare
  admin_id    constant uuid := '09090909-0000-0000-0000-00000000000a';
  customer_id constant uuid := '09090909-0000-0000-0000-00000000000c';
  entry   record;
  after   record;
  blocked boolean;
begin
  -- 1. The admin acts, which makes them an audit actor.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  update public.users set role = 'support' where id = customer_id;
  reset role;
  perform set_config('request.jwt.claims', null, true);

  select * into entry from public.audit_log
   where actor_user_id = admin_id and action = 'user.role_changed' and entity_id = customer_id;
  if entry is null then raise exception 'FAIL: fixture did not produce an audit entry'; end if;

  -- 2. Deleting that account now succeeds (it failed with 42501 before 0009).
  delete from auth.users where id = admin_id;
  if exists (select 1 from public.users where id = admin_id) then
    raise exception 'FAIL: the actor''s account was not deleted';
  end if;

  -- 3. Their audit entry is untouched: same actor id, same role snapshot.
  select * into after from public.audit_log where id = entry.id;
  if after is null then raise exception 'FAIL: the audit entry disappeared'; end if;
  if after.actor_user_id is distinct from admin_id or after.actor_role is distinct from 'admin' then
    raise exception 'FAIL: the audit entry lost its actor (% / %)', after.actor_user_id, after.actor_role;
  end if;

  -- 4. The log is still append-only.
  blocked := false;
  begin update public.audit_log set reason = 'tampered' where id = entry.id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: an audit entry was modified'; end if;

  blocked := false;
  begin delete from public.audit_log where id = entry.id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: an audit entry was deleted'; end if;

  raise notice '0009_audit_log_actor_delete: all assertions passed';
end $$;

rollback;
