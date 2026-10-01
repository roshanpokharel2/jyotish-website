-- 0036_availability_no_overlap_test.sql
-- Self-asserting check for database/migrations/0036_availability_no_overlap.sql.
-- Writes run as the practitioner (`authenticated` with a JWT), as the browser does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0036_availability_no_overlap: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','36363636-0000-0000-0000-00000000000a','authenticated','authenticated','hours-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','36363636-0000-0000-0000-00000000000d','authenticated','authenticated','hours-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','36363636-0000-0000-0000-00000000000e','authenticated','authenticated','hours-rival@example.test','', now(), now());

insert into public.customers (id, user_id, full_name) values
  ('36363636-cccc-0000-0000-00000000000a', '36363636-0000-0000-0000-00000000000a', 'Hours Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('36363636-aaaa-0000-0000-00000000000d', '36363636-0000-0000-0000-00000000000d', 'Hours Jyotish', 'active'),
  ('36363636-aaaa-0000-0000-00000000000e', '36363636-0000-0000-0000-00000000000e', 'Hours Rival',   'active');

do $$
declare
  user_c   constant uuid := '36363636-0000-0000-0000-00000000000a';
  user_j   constant uuid := '36363636-0000-0000-0000-00000000000d';
  user_r   constant uuid := '36363636-0000-0000-0000-00000000000e';
  jyotish  constant uuid := '36363636-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 2;
  dow      int := extract(dow from (now() at time zone 'Asia/Kathmandu')::date + 2)::int;
  blocked  boolean;
  starts   text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, dow, '09:00', '12:00');

  -- 1. An overlapping window on the same day is refused. Before 0036 it was accepted.
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, dow, '10:00', '11:00');
  exception when exclusion_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an overlapping window on the same day was accepted'; end if;
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, dow, '11:45', '13:00');
  exception when exclusion_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a window overlapping the end was accepted'; end if;

  -- 2. Touching windows, the same hours on another day, and inactive windows are fine.
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, dow, '12:00', '13:00');
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, (dow + 1) % 7, '09:00', '12:00');
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time, is_active) values (jyotish, dow, '10:00', '11:00', false);

  -- 3. Re-activating an overlapping window is refused too.
  blocked := false;
  begin update public.availability set is_active = true where astrologer_id = jyotish and start_time = '10:00';
  exception when exclusion_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: re-activating an overlapping window was accepted'; end if;

  -- 4. Others still cannot write the practitioner's hours.
  perform set_config('request.jwt.claims', json_build_object('sub', user_r, 'role', 'authenticated')::text, true);
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, (dow + 2) % 7, '09:00', '10:00');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a rival wrote another practitioner''s hours'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, (dow + 2) % 7, '09:00', '10:00');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer wrote a practitioner''s hours'; end if;

  -- 5. Touching windows give one even sequence: 09:00 ... 12:30, every 30 minutes.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select string_agg(to_char(starts_at at time zone 'Asia/Kathmandu', 'HH24:MI'), ',' order by starts_at) into starts
  from public.available_slots(jyotish, call_svc, day, day);
  if starts is distinct from '09:00,09:30,10:00,10:30,11:00,11:30,12:00,12:30' then
    raise exception 'FAIL: touching windows gave %', starts;
  end if;

  raise notice '0036_availability_no_overlap: all assertions passed';
end $$;

rollback;
