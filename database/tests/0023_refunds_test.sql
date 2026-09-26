-- 0023_refunds_test.sql
-- Self-asserting check for database/migrations/0023_refunds.sql.
-- The refund functions run without a JWT, as the server's service role does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0023_refunds: all assertions passed".
--
-- The fail-before case is §2: on 0022 there is no refunds table, so recording
-- a transfer is impossible; on 0023 the request lands with its audit row.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','23232323-0000-0000-0000-00000000000a','authenticated','authenticated','refundtest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','23232323-0000-0000-0000-00000000000c','authenticated','authenticated','refundtest-selffinance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','23232323-0000-0000-0000-00000000000f','authenticated','authenticated','refundtest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','23232323-0000-0000-0000-00000000000d','authenticated','authenticated','refundtest-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets these through.
update public.users set role = 'finance' where id in
  ('23232323-0000-0000-0000-00000000000c', '23232323-0000-0000-0000-00000000000f');

insert into public.customers (id, user_id, full_name) values
  ('23232323-cccc-0000-0000-00000000000a', '23232323-0000-0000-0000-00000000000a', 'Refund Customer'),
  ('23232323-cccc-0000-0000-00000000000c', '23232323-0000-0000-0000-00000000000c', 'Refund Self Finance');

insert into public.astrologers (id, user_id, name, status) values
  ('23232323-aaaa-0000-0000-00000000000d', '23232323-0000-0000-0000-00000000000d', 'Refund Jyotish', 'active');

do $$
declare
  cust_a   constant uuid := '23232323-cccc-0000-0000-00000000000a';
  cust_sf  constant uuid := '23232323-cccc-0000-0000-00000000000c';
  user_a   constant uuid := '23232323-0000-0000-0000-00000000000a';
  user_sf  constant uuid := '23232323-0000-0000-0000-00000000000c';
  user_f   constant uuid := '23232323-0000-0000-0000-00000000000f';
  jyotish  constant uuid := '23232323-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 5;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030   timestamptz := (day + time '10:30') at time zone 'Asia/Kathmandu';
  at11     timestamptz := (day + time '11:00') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  pay_open public.payments;
  r        public.refunds;
  msg      text;
  blocked  boolean;
  n        int;
begin
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- A paid booking (1000) and an unpaid one.
  b := public.create_booking(cust_a, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refund/proof.png');
  pay := public.approve_payment(pay.id, user_f);
  b := public.create_booking(cust_a, jyotish, call_svc, at1030);
  pay_open := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refund/proof-open.png');

  -- 1. Only paid payments are refundable.
  begin perform public.request_refund(pay_open.id, user_f, 100, 'changed mind'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REFUND_NOT_ALLOWED' then raise exception 'FAIL: unpaid payment refundable: %', msg; end if;
  begin perform public.request_refund('23232323-0000-0000-0000-000000000099', user_f, 100, 'x'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'NOT_FOUND' then raise exception 'FAIL: unknown payment: %', msg; end if;

  -- 2. The request lands with its audit row.
  r := public.request_refund(pay.id, user_f, 400, 'Double charge, one to return');
  if r.status <> 'requested' or r.amount <> 400 or r.currency <> 'NPR' then
    raise exception 'FAIL: request not recorded: %', row_to_json(r);
  end if;
  select count(*) into n from public.audit_log
   where entity_id = r.id and action = 'refund.requested' and actor_user_id = user_f;
  if n <> 1 then raise exception 'FAIL: request audit missing'; end if;

  -- 3. Bad requests are refused: no reason, no amount, too much, wrong role, self.
  begin perform public.request_refund(pay.id, user_f, 100, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: reasonless request: %', msg; end if;
  begin perform public.request_refund(pay.id, user_f, -5, 'x'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: negative request: %', msg; end if;
  begin perform public.request_refund(pay.id, user_f, 700, 'x'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REFUND_TOO_LARGE' then raise exception 'FAIL: over-reservation: %', msg; end if;
  begin perform public.request_refund(pay.id, user_a, 100, 'x'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: customer requested: %', msg; end if;

  -- Nobody refunds their own booking: finance staff who booked and paid.
  b := public.create_booking(cust_sf, jyotish, call_svc, at11);
  pay_open := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refund/proof-sf.png');
  pay_open := public.approve_payment(pay_open.id, user_f);
  begin perform public.request_refund(pay_open.id, user_sf, 100, 'x'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: self-refund: %', msg; end if;

  -- 4. The browser writes nothing.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'refunds'
             and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'FAIL: refunds has a browser write policy';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.refunds (payment_id, amount, reason) values (pay.id, 1, 'mine');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer inserted a refund'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Approve moves it forward, once; rejection needs a note and frees the
  --    reservation for a fresh request.
  r := public.approve_refund(r.id, user_f);
  if r.status <> 'approved' then raise exception 'FAIL: not approved'; end if;
  begin perform public.approve_refund(r.id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REFUND_ALREADY_PROCESSED' then raise exception 'FAIL: double approval: %', msg; end if;
  begin perform public.reject_refund(r.id, user_f, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: noteless rejection: %', msg; end if;
  begin perform public.request_refund(pay.id, user_f, 700, 'x'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REFUND_TOO_LARGE' then raise exception 'FAIL: approved row reserves nothing: %', msg; end if;
  r := public.reject_refund(r.id, user_f, 'Customer withdrew the complaint');
  if r.status <> 'rejected' then raise exception 'FAIL: not rejected'; end if;
  select count(*) into n from public.audit_log
   where entity_id = r.id and action = 'refund.rejected' and reason = 'Customer withdrew the complaint';
  if n <> 1 then raise exception 'FAIL: rejection audit missing'; end if;
  r := public.request_refund(pay.id, user_f, 1000, 'Full return after all');
  if r.status <> 'requested' or r.amount <> 1000 then
    raise exception 'FAIL: fresh request after rejection: %', row_to_json(r);
  end if;

  -- 6. Steps cannot be skipped by direct write without their evidence.
  begin update public.refunds set status = 'completed' where id = r.id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_REFUND_STATUS' then raise exception 'FAIL: requested->completed directly: %', msg; end if;

  -- 7. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0023') then
    raise exception 'FAIL: 0023 is not recorded';
  end if;

  raise notice '0023_refunds: all assertions passed';
end $$;

rollback;
