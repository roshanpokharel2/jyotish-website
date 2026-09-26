-- 0025_payouts_test.sql
-- Self-asserting check for database/migrations/0025_payouts.sql.
-- The payout functions run without a JWT, as the server's service role does,
-- except my_payout_balance(), which reads the caller's JWT like the browser.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0025_payouts: all assertions passed".
--
-- The fail-before case is §1: on 0024 no payout can be requested and no balance
-- exists; on 0025 the practitioner sees payable 1,700 and the request lands.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','25252525-0000-0000-0000-00000000000a','authenticated','authenticated','payouttest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','25252525-0000-0000-0000-00000000000f','authenticated','authenticated','payouttest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','25252525-0000-0000-0000-00000000000d','authenticated','authenticated','payouttest-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '25252525-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('25252525-cccc-0000-0000-00000000000a', '25252525-0000-0000-0000-00000000000a', 'Payout Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('25252525-aaaa-0000-0000-00000000000d', '25252525-0000-0000-0000-00000000000d', 'Payout Jyotish', 'active');

do $$
declare
  cust     constant uuid := '25252525-cccc-0000-0000-00000000000a';
  user_a   constant uuid := '25252525-0000-0000-0000-00000000000a';
  user_f   constant uuid := '25252525-0000-0000-0000-00000000000f';
  user_j   constant uuid := '25252525-0000-0000-0000-00000000000d';
  jyotish  constant uuid := '25252525-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 7;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  p        public.payouts;
  bal      public.jyotish_balances;
  msg      text;
  blocked  boolean;
  n        int;
begin
  update public.services set price = 2000 where id = call_svc;
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- Earn it first: a paid 2,000 booking at 15% leaves payable 1,700.
  b := public.create_booking(cust, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'payout/proof.png');
  perform public.approve_payment(pay.id, user_f);

  -- 1. The practitioner sees their own numbers through the function.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  select * into bal from public.my_payout_balance();
  if bal.payable <> 1700 or bal.earned <> 1700 or bal.paid <> 0 then
    raise exception 'FAIL: own balance is not 1700 / 0: %', row_to_json(bal);
  end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 2. The request lands with its audit row.
  p := public.request_payout(jyotish, 1700, user_j);
  if p.status <> 'pending' or p.amount <> 1700 then
    raise exception 'FAIL: request not recorded: %', row_to_json(p);
  end if;
  select count(*) into n from public.audit_log
   where entity_id = p.id and action = 'payout.requested';
  if n <> 1 then raise exception 'FAIL: request audit missing'; end if;

  -- 3. Bad requests: below the floor, above the payable, over-committed,
  --    someone else's row.
  begin perform public.request_payout(jyotish, 100, user_j); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYOUT_TOO_SMALL' then raise exception 'FAIL: below-floor request: %', msg; end if;
  begin perform public.request_payout(jyotish, 1800, user_j); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYOUT_TOO_LARGE' then raise exception 'FAIL: over-balance request: %', msg; end if;
  begin perform public.request_payout(jyotish, 1000, user_j); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYOUT_TOO_LARGE' then raise exception 'FAIL: over-commitment past the open 1700: %', msg; end if;
  begin perform public.request_payout('25252525-0000-0000-0000-000000000099', 1000, user_j); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: another practitioner''s row: %', msg; end if;

  -- 4. The browser writes nothing but the practitioner reads their own rows.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payouts'
             and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'FAIL: payouts has a browser write policy';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.payouts (astrologer_id, amount) values (jyotish, 1000);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer inserted a payout'; end if;
  select count(*) into n from public.payouts;
  if n <> 0 then raise exception 'FAIL: a customer reads % payout rows', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  select count(*) into n from public.payouts;
  if n <> 1 then raise exception 'FAIL: the practitioner reads % of their 1 row', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Approve moves it forward, once.
  p := public.approve_payout(p.id, user_f);
  if p.status <> 'approved' then raise exception 'FAIL: not approved'; end if;
  begin perform public.approve_payout(p.id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYOUT_ALREADY_PROCESSED' then raise exception 'FAIL: double approval: %', msg; end if;

  -- 6. The owner cancels their own row with a note; strangers cannot.
  p := public.cancel_payout(p.id, user_j, 'Found an error, re-requesting');
  if p.status <> 'cancelled' then raise exception 'FAIL: not cancelled'; end if;
  p := public.request_payout(jyotish, 1000, user_j);
  begin perform public.cancel_payout(p.id, user_a, 'mine'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: stranger cancelled: %', msg; end if;
  begin perform public.cancel_payout(p.id, user_j, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: noteless cancellation: %', msg; end if;

  -- 7. Steps cannot be skipped by direct write without their evidence.
  begin update public.payouts set status = 'paid' where id = p.id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_PAYOUT_STATUS' then raise exception 'FAIL: pending->paid directly: %', msg; end if;

  -- 8. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0025') then
    raise exception 'FAIL: 0025 is not recorded';
  end if;

  raise notice '0025_payouts: all assertions passed';
end $$;

rollback;
