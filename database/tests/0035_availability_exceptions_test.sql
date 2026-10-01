-- 0035_availability_exceptions_test.sql
-- Self-asserting check for database/migrations/0035_availability_exceptions.sql.
-- Browser attempts run as `anon` or `authenticated` with a JWT; create_booking() runs
-- without a JWT, as the server's service role does. Creates throwaway users, asserts,
-- and ROLLS BACK. Success: "0035_availability_exceptions: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','35353535-0000-0000-0000-00000000000a','authenticated','authenticated','dayoff-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','35353535-0000-0000-0000-00000000000d','authenticated','authenticated','dayoff-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','35353535-0000-0000-0000-00000000000e','authenticated','authenticated','dayoff-rival@example.test','', now(), now());

insert into public.customers (id, user_id, full_name) values
  ('35353535-cccc-0000-0000-00000000000a', '35353535-0000-0000-0000-00000000000a', 'Dayoff Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('35353535-aaaa-0000-0000-00000000000d', '35353535-0000-0000-0000-00000000000d', 'Dayoff Jyotish', 'active'),
  ('35353535-aaaa-0000-0000-00000000000e', '35353535-0000-0000-0000-00000000000e', 'Dayoff Rival',   'active');

insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '35353535-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  cust     constant uuid := '35353535-cccc-0000-0000-00000000000a';
  user_c   constant uuid := '35353535-0000-0000-0000-00000000000a';
  user_j   constant uuid := '35353535-0000-0000-0000-00000000000d';
  user_r   constant uuid := '35353535-0000-0000-0000-00000000000e';
  jyotish  constant uuid := '35353535-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 2;
  at10     timestamptz;
  kept     public.bookings;
  off_id   uuid;
  blocked  boolean;
  msg      text;
  n        int;
begin
  at10 := (day + time '10:00') at time zone 'Asia/Kathmandu';

  -- A booking made before the day is blocked (day + 1, 10:00).
  kept := public.create_booking(cust, jyotish, call_svc, at10 + interval '1 day');

  -- 1. The practitioner blocks `day` and `day + 1`.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  insert into public.availability_exceptions (astrologer_id, starts_on, ends_on, reason)
  values (jyotish, day, day + 1, 'Travelling') returning id into off_id;

  blocked := false;
  begin insert into public.availability_exceptions (astrologer_id, starts_on, ends_on) values (jyotish, day + 1, day);
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a day off ending before it starts was accepted'; end if;

  -- 2. Blocked days offer nothing; the day after is intact. Before 0035 all 6 of
  --    `day`'s slots were still offered.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.available_slots(jyotish, call_svc, day, day + 1);
  if n <> 0 then raise exception 'FAIL: % slots offered on a day off', n; end if;
  select count(*) into n from public.available_slots(jyotish, call_svc, day + 2, day + 2);
  if n <> 6 then raise exception 'FAIL: the day after a day off lost slots (% of 6)', n; end if;

  -- 3. Visitors and customers cannot see days off (the reason is private).
  blocked := false;
  begin select count(*) into n from public.availability_exceptions;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked and n > 0 then raise exception 'FAIL: a visitor reads days off'; end if;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.availability_exceptions) then raise exception 'FAIL: a customer reads days off'; end if;

  -- 4. A rival practitioner can neither see, add, change nor remove them.
  perform set_config('request.jwt.claims', json_build_object('sub', user_r, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.availability_exceptions) then raise exception 'FAIL: a rival reads days off'; end if;
  blocked := false;
  begin insert into public.availability_exceptions (astrologer_id, starts_on, ends_on) values (jyotish, day + 5, day + 5);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a rival blocked another practitioner''s day'; end if;
  update public.availability_exceptions set ends_on = day + 20 where id = off_id;
  delete from public.availability_exceptions where id = off_id;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if (select ends_on from public.availability_exceptions where id = off_id) is distinct from day + 1 then
    raise exception 'FAIL: a rival changed or removed a day off';
  end if;

  -- 5. The server refuses a blocked day too.
  msg := 'accepted';
  begin perform public.create_booking(cust, jyotish, call_svc, at10);
  exception when others then msg := sqlerrm; end;
  if msg <> 'SLOT_UNAVAILABLE' then raise exception 'FAIL: booking a day off gave %', msg; end if;

  -- 6. The booking made before the block is untouched.
  if (select status from public.bookings where id = kept.id) <> 'payment_pending' then
    raise exception 'FAIL: blocking a day changed an existing booking';
  end if;

  -- 7. Removing the day off brings the slots back.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  delete from public.availability_exceptions where id = off_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the practitioner could not remove their day off'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.available_slots(jyotish, call_svc, day, day);
  if n <> 6 then raise exception 'FAIL: slots did not come back after removing the day off (% of 6)', n; end if;

  raise notice '0035_availability_exceptions: all assertions passed';
end $$;

rollback;
