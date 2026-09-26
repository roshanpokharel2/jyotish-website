-- 0017_practitioner_directory_test.sql
-- Self-asserting check for database/migrations/0017_practitioner_directory.sql.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0017_practitioner_directory: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','17171717-0000-0000-0000-00000000000c','authenticated','authenticated','dirtest-c@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','17171717-0000-0000-0000-00000000000d','authenticated','authenticated','dirtest-j@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','17171717-0000-0000-0000-00000000000e','authenticated','authenticated','dirtest-p@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','17171717-0000-0000-0000-00000000000f','authenticated','authenticated','dirtest-m@example.test','', now(), now());
update public.users set role = 'moderator' where id = '17171717-0000-0000-0000-00000000000f';
insert into public.customers (id, user_id, full_name) values
  ('17171717-cccc-0000-0000-00000000000c', '17171717-0000-0000-0000-00000000000c', 'Directory C');
insert into public.astrologers (id, user_id, name, status, specialization, rejection_reason, verification_documents) values
  ('17171717-aaaa-0000-0000-00000000000d', '17171717-0000-0000-0000-00000000000d', 'Directory Jyotish', 'active', 'Vedic', 'old note', '["licence.pdf"]'),
  ('17171717-aaaa-0000-0000-00000000000e', '17171717-0000-0000-0000-00000000000e', 'Directory Applicant', 'pending_review', 'KP', null, '["id.pdf"]');
insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '17171717-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  jyotish constant uuid := '17171717-aaaa-0000-0000-00000000000d';
  svc     uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  at10    timestamptz := (((now() at time zone 'Asia/Kathmandu')::date + 2) + time '10:00') at time zone 'Asia/Kathmandu';
  b       public.bookings;
  n       int;
  listed  text;
begin
  b := public.create_booking('17171717-cccc-0000-0000-00000000000c', jyotish, svc, at10);

  -- 1. The directory returns only public profile columns.
  listed := pg_get_function_result('public.active_practitioners()'::regprocedure);
  if listed ~ '(user_id|status|rejection_reason|verification_documents|reviewed_by|applied_at)' then
    raise exception 'FAIL: active_practitioners() returns %', listed;
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', '17171717-0000-0000-0000-00000000000c', 'role', 'authenticated')::text, true);

  -- 2. A signed-in customer no longer reads practitioner rows (all columns)...
  select count(*) into n from public.astrologers where id = jyotish;
  if n <> 0 then raise exception 'FAIL: a customer reads the practitioner row, verification documents included'; end if;
  -- ...but finds active practitioners, and only them, in the directory.
  if not exists (select 1 from public.active_practitioners() where id = jyotish and name = 'Directory Jyotish' and specialization = 'Vedic') then
    raise exception 'FAIL: the active practitioner is not in the directory';
  end if;
  if exists (select 1 from public.active_practitioners() where id = '17171717-aaaa-0000-0000-00000000000e') then
    raise exception 'FAIL: an applicant is listed';
  end if;
  -- Policies that look the practitioner up still work for the customer.
  select count(*) into n from public.bookings where id = b.id;
  if n <> 1 then raise exception 'FAIL: the customer lost their booking'; end if;

  -- 3. The practitioner keeps their full row and is not listed to themselves.
  perform set_config('request.jwt.claims', json_build_object('sub', '17171717-0000-0000-0000-00000000000d', 'role', 'authenticated')::text, true);
  if (select rejection_reason from public.astrologers where id = jyotish) is distinct from 'old note' then
    raise exception 'FAIL: the practitioner cannot read their own row';
  end if;
  if exists (select 1 from public.active_practitioners() where id = jyotish) then
    raise exception 'FAIL: a practitioner is offered to themselves';
  end if;
  select count(*) into n from public.bookings where id = b.id;
  if n <> 1 then raise exception 'FAIL: the practitioner lost their booking'; end if;
  select count(*) into n from public.availability where astrologer_id = jyotish;
  if n <> 7 then raise exception 'FAIL: the practitioner lost their hours'; end if;

  -- 4. Staff still read every row, applicants included.
  perform set_config('request.jwt.claims', json_build_object('sub', '17171717-0000-0000-0000-00000000000f', 'role', 'authenticated')::text, true);
  select count(*) into n from public.astrologers where id in (jyotish, '17171717-aaaa-0000-0000-00000000000e') and verification_documents is not null;
  if n <> 2 then raise exception 'FAIL: staff lost access to practitioner rows'; end if;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Signed-in only, as before.
  if has_function_privilege('anon', 'public.active_practitioners()', 'execute') then
    raise exception 'FAIL: visitors can call active_practitioners()';
  end if;

  if not exists (select 1 from public.schema_migrations where version = '0017') then
    raise exception 'FAIL: 0017 is not recorded';
  end if;

  raise notice '0017_practitioner_directory: all assertions passed';
end $$;

rollback;
