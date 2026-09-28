-- 0026_payout_paid_test.sql
-- Self-asserting check for database/migrations/0026_payout_paid.sql.
-- The payout functions run without a JWT, as the server's service role does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0026_payout_paid: all assertions passed".
--
-- The fail-before case is §2: on 0025 a payout can be approved but never paid,
-- so no payout entry exists; on 0026 paying writes exactly one, in the same
-- transaction.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','26262626-0000-0000-0000-00000000000a','authenticated','authenticated','payoutpaid-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','26262626-0000-0000-0000-00000000000f','authenticated','authenticated','payoutpaid-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','26262626-0000-0000-0000-00000000000d','authenticated','authenticated','payoutpaid-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '26262626-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('26262626-cccc-0000-0000-00000000000a', '26262626-0000-0000-0000-00000000000a', 'Payout Paid Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('26262626-aaaa-0000-0000-00000000000d', '26262626-0000-0000-0000-00000000000d', 'Payout Paid Jyotish', 'active');

do $$
declare
  cust     constant uuid := '26262626-cccc-0000-0000-00000000000a';
  user_j   constant uuid := '26262626-0000-0000-0000-00000000000d';
  user_f   constant uuid := '26262626-0000-0000-0000-00000000000f';
  jyotish  constant uuid := '26262626-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 8;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030   timestamptz := (day + time '10:30') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  p        public.payouts;
  r        public.refunds;
  msg      text;
  n        int;
  bal      public.jyotish_balances;
begin
  update public.services set price = 2000 where id = call_svc;
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- Earn 1,700 payable first.
  b := public.create_booking(cust, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'payout-paid/proof.png');
  pay := public.approve_payment(pay.id, user_f);

  -- 1. Paid requires the reference; without it nothing moves.
  p := public.request_payout(jyotish, 1000, user_j);
  p := public.approve_payout(p.id, user_f);
  p := public.mark_payout_processing(p.id, user_f);
  begin perform public.mark_payout_paid(p.id, user_f, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: paid without reference: %', msg; end if;

  -- 2. Paying writes exactly one debit entry, and the balances move.
  p := public.mark_payout_paid(p.id, user_f, 'ESEWA-P1');
  if p.status <> 'paid' or p.processed_by <> user_f or p.processed_at is null then
    raise exception 'FAIL: not recorded paid: %', row_to_json(p);
  end if;
  select count(*) into n from public.ledger_entries
   where astrologer_id = jyotish and entry_type = 'payout' and direction = 'debit'
     and amount = 1000 and metadata = jsonb_build_object('payout_id', p.id);
  if n <> 1 then raise exception 'FAIL: % payout entries', n; end if;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.earned <> 1700 or bal.paid <> 1000 or bal.payable <> 700 then
    raise exception 'FAIL: balances not 1700 / 1000 / 700: %', row_to_json(bal);
  end if;

  -- 3. A second paid call is refused and writes nothing more.
  begin perform public.mark_payout_paid(p.id, user_f, 'ESEWA-P1'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYOUT_ALREADY_PROCESSED' then raise exception 'FAIL: double paid: %', msg; end if;
  select count(*) into n from public.ledger_entries
   where astrologer_id = jyotish and entry_type = 'payout';
  if n <> 1 then raise exception 'FAIL: double paid left % entries', n; end if;

  -- 4. A failed transfer writes nothing and releases its reservation.
  b := public.create_booking(cust, jyotish, call_svc, at1030);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'payout-paid/proof2.png');
  pay := public.approve_payment(pay.id, user_f);
  p := public.request_payout(jyotish, 1500, user_j);
  p := public.approve_payout(p.id, user_f);
  p := public.mark_payout_processing(p.id, user_f);
  begin perform public.mark_payout_failed(p.id, user_f, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: noteless failure: %', msg; end if;
  p := public.mark_payout_failed(p.id, user_f, 'Bank rejected the transfer');
  if p.status <> 'failed' then raise exception 'FAIL: not failed'; end if;
  select count(*) into n from public.ledger_entries
   where astrologer_id = jyotish and entry_type = 'payout';
  if n <> 1 then raise exception 'FAIL: a failure wrote entries'; end if;
  p := public.request_payout(jyotish, 1500, user_j);
  if p.status <> 'pending' then raise exception 'FAIL: released reservation not reusable'; end if;

  -- 5. Paid re-validates against the live balance: a refund lands, the 1500 no
  --    longer fits, and only cancellation is left.
  r := public.request_refund(
    (select id from public.payments where booking_id = (select id from public.bookings where customer_id = cust order by scheduled_at limit 1)),
    user_f, 1500, 'Partial return');
  r := public.approve_refund(r.id, user_f);
  r := public.complete_refund(r.id, user_f, 'ESEWA-R9');
  p := public.approve_payout(p.id, user_f);
  p := public.mark_payout_processing(p.id, user_f);
  begin perform public.mark_payout_paid(p.id, user_f, 'ESEWA-P2'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYOUT_TOO_LARGE' then raise exception 'FAIL: paid past a shrunk balance: %', msg; end if;
  if (select status from public.payouts where id = p.id) <> 'processing' then
    raise exception 'FAIL: refused payment moved the payout';
  end if;
  p := public.cancel_payout(p.id, user_f, 'Balance shrunk, re-request the remainder');
  if p.status <> 'cancelled' then raise exception 'FAIL: staff could not cancel'; end if;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  -- Earned 2125 (3400 less the 1275 reversed), paid 1000.
  if bal.earned <> 2125 or bal.paid <> 1000 or bal.payable <> 1125 then
    raise exception 'FAIL: balances not 2125 / 1000 / 1125: %', row_to_json(bal);
  end if;

  -- 6. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0026') then
    raise exception 'FAIL: 0026 is not recorded';
  end if;

  raise notice '0026_payout_paid: all assertions passed';
end $$;

rollback;
