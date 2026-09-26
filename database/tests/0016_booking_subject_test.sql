-- 0016_booking_subject_test.sql
-- Self-asserting check for database/migrations/0016_booking_subject.sql.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0016_booking_subject: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','16161616-0000-0000-0000-00000000000a','authenticated','authenticated','subjtest-a@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','16161616-0000-0000-0000-00000000000b','authenticated','authenticated','subjtest-b@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','16161616-0000-0000-0000-00000000000d','authenticated','authenticated','subjtest-j@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','16161616-0000-0000-0000-00000000000e','authenticated','authenticated','subjtest-r@example.test','', now(), now());
insert into public.customers (id, user_id, full_name) values
  ('16161616-cccc-0000-0000-00000000000a', '16161616-0000-0000-0000-00000000000a', 'Subject A'),
  ('16161616-cccc-0000-0000-00000000000b', '16161616-0000-0000-0000-00000000000b', 'Subject B');
insert into public.astrologers (id, user_id, name, status) values
  ('16161616-aaaa-0000-0000-00000000000d', '16161616-0000-0000-0000-00000000000d', 'Subject Jyotish', 'active'),
  ('16161616-aaaa-0000-0000-00000000000e', '16161616-0000-0000-0000-00000000000e', 'Subject Rival', 'active');
insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '16161616-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  cust    constant uuid := '16161616-cccc-0000-0000-00000000000a';
  jyotish constant uuid := '16161616-aaaa-0000-0000-00000000000d';
  svc     uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  at10    timestamptz := (((now() at time zone 'Asia/Kathmandu')::date + 2) + time '10:00') at time zone 'Asia/Kathmandu';
  person  constant jsonb := '{"name":"Ram","dobAd":"1990-01-15","tob":"05:30","pob":"Pokhara","country":"Nepal"}';
  b       public.bookings;
  blocked boolean;
  n       int;
begin
  -- 1. The birth details are stored with the booking.
  b := public.create_booking(cust, jyotish, svc, at10, 'Career', person);
  if b.subject is distinct from person then raise exception 'FAIL: subject stored as %', b.subject; end if;

  -- 2. Only a JSON object of bounded size.
  update public.bookings set status = 'cancelled' where id = b.id;
  blocked := false;
  begin perform public.create_booking(cust, jyotish, svc, at10, null, '["not","an","object"]');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a non-object subject was accepted'; end if;
  blocked := false;
  begin perform public.create_booking(cust, jyotish, svc, at10, null, jsonb_build_object('name', repeat(md5(random()::text), 300)));
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an oversized subject was accepted'; end if;

  -- 3. The practitioner reads them through the booking; other customers and other
  --    practitioners do not.
  b := public.create_booking(cust, jyotish, svc, at10 + interval '30 minutes', null, person);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', '16161616-0000-0000-0000-00000000000d', 'role', 'authenticated')::text, true);
  if (select subject->>'dobAd' from public.bookings where id = b.id) is distinct from '1990-01-15' then
    raise exception 'FAIL: the practitioner cannot read the birth details of their booking';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', '16161616-0000-0000-0000-00000000000e', 'role', 'authenticated')::text, true);
  select count(*) into n from public.bookings where id = b.id;
  if n <> 0 then raise exception 'FAIL: another practitioner reads the birth details'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', '16161616-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
  select count(*) into n from public.bookings where id = b.id;
  if n <> 0 then raise exception 'FAIL: another customer reads the birth details'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 4. One entry point, still server-only.
  if (select count(*) from pg_proc where proname = 'create_booking') <> 1 then
    raise exception 'FAIL: more than one create_booking';
  end if;
  if has_function_privilege('anon', 'public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb)', 'execute') then
    raise exception 'FAIL: create_booking is callable from the browser';
  end if;

  if not exists (select 1 from public.schema_migrations where version = '0016') then
    raise exception 'FAIL: 0016 is not recorded';
  end if;

  raise notice '0016_booking_subject: all assertions passed';
end $$;

rollback;
