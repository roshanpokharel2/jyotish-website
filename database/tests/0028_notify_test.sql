-- 0028_notify_test.sql
-- Self-asserting check for database/migrations/0028_notify.sql.
-- The decision functions run without a JWT, as the server's service role does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0028_notify: all assertions passed".
--
-- The fail-before case is §2: on 0027 approving books money but tells nobody;
-- on 0028 the same call leaves both inboxes and the email queue filled.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','28282828-0000-0000-0000-00000000000a','authenticated','authenticated','notifytest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','28282828-0000-0000-0000-00000000000f','authenticated','authenticated','notifytest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','28282828-0000-0000-0000-00000000000d','authenticated','authenticated','notifytest-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '28282828-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('28282828-cccc-0000-0000-00000000000a', '28282828-0000-0000-0000-00000000000a', 'Notify Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('28282828-aaaa-0000-0000-00000000000d', '28282828-0000-0000-0000-00000000000d', 'Notify Jyotish', 'active');

do $$
declare
  cust     constant uuid := '28282828-cccc-0000-0000-00000000000a';
  user_a   constant uuid := '28282828-0000-0000-0000-00000000000a';
  user_f   constant uuid := '28282828-0000-0000-0000-00000000000f';
  user_j   constant uuid := '28282828-0000-0000-0000-00000000000d';
  jyotish  constant uuid := '28282828-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 9;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030   timestamptz := (day + time '10:30') at time zone 'Asia/Kathmandu';
  at11     timestamptz := (day + time '11:00') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  r        public.refunds;
  p        public.payouts;
  n        int;
begin
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- 1. Preferences default on and belong to their owner.
  insert into public.notification_preferences (user_id) values (user_a);
  if (select email_transactional from public.notification_preferences where user_id = user_a) is distinct from true then
    raise exception 'FAIL: email switch does not default on';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notification_preferences;
  if n <> 0 then raise exception 'FAIL: a practitioner reads % preference rows', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 2. Approval tells both sides in-app and queues the customer's email.
  b := public.create_booking(cust, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'notify/proof.png');
  pay := public.approve_payment(pay.id, user_f);
  select count(*) into n from public.notifications
   where user_id = user_a and type = 'booking_confirmed' and reference_id = b.id
     and title = 'Booking confirmed' and body like '%NPR 1000%';
  if n <> 1 then raise exception 'FAIL: customer approval notice missing'; end if;
  select count(*) into n from public.notifications
   where user_id = user_j and type = 'booking_confirmed' and reference_id = b.id;
  if n <> 1 then raise exception 'FAIL: practitioner approval notice missing'; end if;
  select count(*) into n from public.email_jobs
   where kind = 'payment_approved' and entity_id = pay.id and recipient_user_id = user_a and status = 'pending';
  if n <> 1 then raise exception 'FAIL: approval email not queued'; end if;

  -- A second approval is refused before anything duplicates.
  begin perform public.approve_payment(pay.id, user_f);
  exception when others then null; end;
  select count(*) into n from public.notifications where user_id = user_a and type = 'booking_confirmed';
  if n <> 1 then raise exception 'FAIL: double approval notified % times', n; end if;
  select count(*) into n from public.email_jobs where kind = 'payment_approved' and entity_id = pay.id;
  if n <> 1 then raise exception 'FAIL: double approval queued % emails', n; end if;

  -- 3. Rejection carries the reason in both channels.
  b := public.create_booking(cust, jyotish, call_svc, at1030);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'notify/proof2.png');
  perform public.reject_payment(pay.id, user_f, 'Blurry screenshot');
  select count(*) into n from public.notifications
   where user_id = user_a and type = 'payment_rejected' and body like '%Blurry screenshot%';
  if n <> 1 then raise exception 'FAIL: rejection notice missing'; end if;
  select count(*) into n from public.email_jobs
   where kind = 'payment_rejected' and entity_id = pay.id and recipient_user_id = user_a;
  if n <> 1 then raise exception 'FAIL: rejection email not queued'; end if;

  -- 4. A completed refund notifies amount and reference, both channels.
  b := public.create_booking(cust, jyotish, call_svc, at11);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'notify/proof3.png');
  pay := public.approve_payment(pay.id, user_f);
  r := public.request_refund(pay.id, user_f, 200, 'Goodwill gesture');
  r := public.approve_refund(r.id, user_f);
  r := public.complete_refund(r.id, user_f, 'ESEWA-N1');
  select count(*) into n from public.notifications
   where user_id = user_a and type = 'refund_completed' and body like '%NPR 200%ESEWA-N1%';
  if n <> 1 then raise exception 'FAIL: refund notice missing'; end if;
  select count(*) into n from public.email_jobs
   where kind = 'refund_completed' and entity_id = r.id and recipient_user_id = user_a;
  if n <> 1 then raise exception 'FAIL: refund email not queued'; end if;

  -- 5. A paid payout notifies the practitioner, both channels.
  p := public.request_payout(jyotish, 1000, user_j);
  p := public.approve_payout(p.id, user_f);
  p := public.mark_payout_processing(p.id, user_f);
  p := public.mark_payout_paid(p.id, user_f, 'ESEWA-NP1');
  select count(*) into n from public.notifications
   where user_id = user_j and type = 'payout_paid' and body like '%NPR 1000%ESEWA-NP1%';
  if n <> 1 then raise exception 'FAIL: payout notice missing'; end if;
  select count(*) into n from public.email_jobs
   where kind = 'payout_paid' and entity_id = p.id and recipient_user_id = user_j;
  if n <> 1 then raise exception 'FAIL: payout email not queued'; end if;

  -- 6. read_at is the read state; is_read mirrors it, and the owner flips it.
  -- (Two approvals happened above, so two booking_confirmed rows exist.)
  update public.notifications set read_at = now()
   where user_id = user_a and type = 'booking_confirmed';
  if (select count(*) from public.notifications where user_id = user_a and not is_read) <> 2 then
    raise exception 'FAIL: is_read did not mirror read_at';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  update public.notifications set read_at = now() where user_id = user_a and read_at is null;
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'FAIL: owner marked % of 2 rows read', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 7. Email jobs stay staff-only, with no browser writes.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'email_jobs'
             and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'FAIL: email_jobs has a browser write policy';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.email_jobs;
  if n <> 0 then raise exception 'FAIL: a customer reads % email jobs', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_f, 'role', 'authenticated')::text, true);
  select count(*) into n from public.email_jobs;
  if n <> 5 then raise exception 'FAIL: finance reads % of 5 queued emails', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 8. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0028') then
    raise exception 'FAIL: 0028 is not recorded';
  end if;

  raise notice '0028_notify: all assertions passed';
end $$;

rollback;
