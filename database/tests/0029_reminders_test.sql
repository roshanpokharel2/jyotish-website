-- 0029_reminders_test.sql
-- Self-asserting check for database/migrations/0029_reminders.sql.
-- generate_reminders() runs without a JWT, as the server's service role does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0029_reminders: all assertions passed".
--
-- The fail-before case is §2: on 0028 no reminder exists for any booking; on
-- 0029 the due booking is notified once, and twice-run stays once.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','29292929-0000-0000-0000-00000000000a','authenticated','authenticated','remindertest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','29292929-0000-0000-0000-00000000000f','authenticated','authenticated','remindertest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','29292929-0000-0000-0000-00000000000d','authenticated','authenticated','remindertest-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '29292929-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('29292929-cccc-0000-0000-00000000000a', '29292929-0000-0000-0000-00000000000a', 'Reminder Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('29292929-aaaa-0000-0000-00000000000d', '29292929-0000-0000-0000-00000000000d', 'Reminder Jyotish', 'active');

do $$
declare
  cust     constant uuid := '29292929-cccc-0000-0000-00000000000a';
  user_a   constant uuid := '29292929-0000-0000-0000-00000000000a';
  user_f   constant uuid := '29292929-0000-0000-0000-00000000000f';
  user_j   constant uuid := '29292929-0000-0000-0000-00000000000d';
  jyotish  constant uuid := '29292929-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 10;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at11     timestamptz := (day + time '11:00') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  b_hold   public.bookings;
  n        int;
  blocked  boolean;
begin
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  b := public.create_booking(cust, jyotish, call_svc, at10);
  perform public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'reminders/proof.png');
  perform public.approve_payment((select id from public.payments where booking_id = b.id), user_f);
  -- An unpaid hold nearby must never be reminded.
  b_hold := public.create_booking(cust, jyotish, call_svc, at11);

  -- 1. Nothing is due yet: both bookings are days out.
  if public.generate_reminders() <> 0 then
    raise exception 'FAIL: reminders for far-future bookings';
  end if;

  -- 2. Inside 24 hours: one 24h notice, both inboxes plus the email queue.
  update public.bookings set scheduled_at = now() + interval '23 hours',
    ends_at = now() + interval '23 hours 30 minutes' where id = b.id;
  update public.bookings set scheduled_at = now() + interval '50 minutes',
    ends_at = now() + interval '80 minutes' where id = b_hold.id;
  if public.generate_reminders() <> 1 then
    raise exception 'FAIL: the 24h reminder did not generate';
  end if;
  select count(*) into n from public.reminders where booking_id = b.id and kind = 'booking_24h';
  if n <> 1 then raise exception 'FAIL: send record missing'; end if;
  select count(*) into n from public.notifications
   where type = 'booking_24h' and reference_id = b.id and user_id in (user_a, user_j);
  if n <> 2 then raise exception 'FAIL: % of 2 inbox rows', n; end if;
  select count(*) into n from public.email_jobs
   where kind = 'booking_24h' and entity_id = b.id and recipient_user_id = user_a and status = 'pending';
  if n <> 1 then raise exception 'FAIL: reminder email not queued'; end if;
  if exists (select 1 from public.reminders where booking_id = b_hold.id) then
    raise exception 'FAIL: an unpaid hold was reminded';
  end if;

  -- 3. A second run is a no-op.
  if public.generate_reminders() <> 0 then
    raise exception 'FAIL: double run re-notified';
  end if;
  select count(*) into n from public.notifications where type = 'booking_24h' and reference_id = b.id;
  if n <> 2 then raise exception 'FAIL: double run duplicated inbox rows'; end if;

  -- 4. Inside the hour: the 1h notice goes out on top.
  update public.bookings set scheduled_at = now() + interval '15 minutes',
    ends_at = now() + interval '45 minutes' where id = b.id;
  if public.generate_reminders() <> 1 then
    raise exception 'FAIL: the 1h reminder did not generate';
  end if;
  select count(*) into n from public.reminders where booking_id = b.id;
  if n <> 2 then raise exception 'FAIL: both kinds not recorded'; end if;

  -- 5. The email kinds stay guarded, and the table stays server-only.
  blocked := false;
  begin
    insert into public.email_jobs (kind, recipient_user_id) values ('carrier_pigeon', user_a);
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an unknown email kind was accepted'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reminders;
  if n <> 0 then raise exception 'FAIL: a customer reads % reminder rows', n; end if;
  blocked := false;
  begin perform public.generate_reminders();
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer ran generation'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 6. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0029') then
    raise exception 'FAIL: 0029 is not recorded';
  end if;

  raise notice '0029_reminders: all assertions passed';
end $$;

rollback;
