-- 0033_consultation_join_test.sql
-- Self-asserting check for database/migrations/0033_consultation_join.sql.
-- The function runs without a JWT, as the server's service role does. Creates
-- throwaway users, asserts, and ROLLS BACK.
-- Success: "0033_consultation_join: all assertions passed".
--
-- The fail-before case is §2: on 0032 anyone (or no one) decides the room; on
-- 0033 only the booking's own parties, in the window, with a paid payment.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','33333333-0000-0000-0000-00000000000a','authenticated','authenticated','jointest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','33333333-0000-0000-0000-00000000000b','authenticated','authenticated','jointest-stranger@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','33333333-0000-0000-0000-00000000000f','authenticated','authenticated','jointest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','33333333-0000-0000-0000-00000000000d','authenticated','authenticated','jointest-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '33333333-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('33333333-cccc-0000-0000-00000000000a', '33333333-0000-0000-0000-00000000000a', 'Join Customer'),
  ('33333333-cccc-0000-0000-00000000000b', '33333333-0000-0000-0000-00000000000b', 'Join Stranger');

insert into public.astrologers (id, user_id, name, status) values
  ('33333333-aaaa-0000-0000-00000000000d', '33333333-0000-0000-0000-00000000000d', 'Join Jyotish', 'active');

do $$
declare
  cust     constant uuid := '33333333-cccc-0000-0000-00000000000a';
  cust_s   constant uuid := '33333333-cccc-0000-0000-00000000000b';
  user_c   constant uuid := '33333333-0000-0000-0000-00000000000a';
  user_s   constant uuid := '33333333-0000-0000-0000-00000000000b';
  user_f   constant uuid := '33333333-0000-0000-0000-00000000000f';
  user_j   constant uuid := '33333333-0000-0000-0000-00000000000d';
  jyotish  constant uuid := '33333333-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 13;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at11     timestamptz := (day + time '11:00') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  info     jsonb;
  msg      text;
  blocked  boolean;
begin
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  b := public.create_booking(cust, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'join/proof.png');
  pay := public.approve_payment(pay.id, user_f);

  -- 1. Outside the window: too early and already over.
  begin perform public.consultation_join_info(b.id, user_c); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'CONSULTATION_NOT_JOINABLE' then raise exception 'FAIL: joined days early: %', msg; end if;
  update public.bookings set scheduled_at = now() - interval '2 hours',
    ends_at = now() - interval '90 minutes' where id = b.id;
  begin perform public.consultation_join_info(b.id, user_c); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'CONSULTATION_NOT_JOINABLE' then raise exception 'FAIL: joined after it ended: %', msg; end if;

  -- 2. Inside the window: both parties, room and stored mode back.
  update public.bookings set scheduled_at = now() - interval '10 minutes',
    ends_at = now() + interval '20 minutes' where id = b.id;
  info := public.consultation_join_info(b.id, user_c);
  if info->>'room' <> 'consultation_' || b.id or info->>'mode' <> b.consultation_mode
     or info->>'identity' <> user_c::text or info->>'name' <> 'Join Customer' then
    raise exception 'FAIL: customer join info wrong: %', info;
  end if;
  info := public.consultation_join_info(b.id, user_j);
  if info->>'identity' <> user_j::text or info->>'name' <> 'Join Jyotish' then
    raise exception 'FAIL: practitioner join info wrong: %', info;
  end if;

  -- 3. Strangers (and missing bookings) get NOT_FOUND, never a reason.
  begin perform public.consultation_join_info(b.id, user_s); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'NOT_FOUND' then raise exception 'FAIL: stranger: %', msg; end if;
  begin perform public.consultation_join_info('33333333-0000-0000-0000-000000000099', user_c); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'NOT_FOUND' then raise exception 'FAIL: unknown booking: %', msg; end if;

  -- 4. Unpaid and unconfirmed bookings admit no one.
  b := public.create_booking(cust_s, jyotish, call_svc, at11);
  update public.bookings set scheduled_at = now() - interval '40 minutes',
    ends_at = now() - interval '10 minutes' where id = b.id;
  begin perform public.consultation_join_info(b.id, user_s); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'CONSULTATION_NOT_JOINABLE' then raise exception 'FAIL: unpaid hold joined: %', msg; end if;

  -- 5. Server-only, like every money-adjacent function.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  blocked := false;
  begin perform public.consultation_join_info(b.id, user_c);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer called join info'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 6. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0033') then
    raise exception 'FAIL: 0033 is not recorded';
  end if;

  raise notice '0033_consultation_join: all assertions passed';
end $$;

rollback;
