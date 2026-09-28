-- 0024_refund_completion_test.sql
-- Self-asserting check for database/migrations/0024_refund_completion.sql.
-- The refund functions run without a JWT, as the server's service role does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0024_refund_completion: all assertions passed".
--
-- The fail-before case is §2: on 0023 a refund can be approved but never
-- completed, so no reversals exist; on 0024 completion writes them in the same
-- transaction.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','24242424-0000-0000-0000-00000000000a','authenticated','authenticated','refunddone-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','24242424-0000-0000-0000-00000000000f','authenticated','authenticated','refunddone-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','24242424-0000-0000-0000-00000000000d','authenticated','authenticated','refunddone-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '24242424-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('24242424-cccc-0000-0000-00000000000a', '24242424-0000-0000-0000-00000000000a', 'Refund Done Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('24242424-aaaa-0000-0000-00000000000d', '24242424-0000-0000-0000-00000000000d', 'Refund Done Jyotish', 'active');

do $$
declare
  cust     constant uuid := '24242424-cccc-0000-0000-00000000000a';
  user_f   constant uuid := '24242424-0000-0000-0000-00000000000f';
  jyotish  constant uuid := '24242424-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 6;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030   timestamptz := (day + time '10:30') at time zone 'Asia/Kathmandu';
  at11     timestamptz := (day + time '11:00') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  r        public.refunds;
  msg      text;
  n        int;
  bal      public.jyotish_balances;
begin
  update public.services set price = 2000 where id = call_svc;
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- 1. A full refund: request -> approve -> processing -> complete.
  b := public.create_booking(cust, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refund-done/proof.png');
  pay := public.approve_payment(pay.id, user_f);
  r := public.request_refund(pay.id, user_f, 2000, 'Practitioner never showed');
  r := public.approve_refund(r.id, user_f);
  r := public.mark_refund_processing(r.id, user_f);
  if r.status <> 'processing' then raise exception 'FAIL: not processing'; end if;
  r := public.complete_refund(r.id, user_f, 'ESEWA-R1');

  -- 2. Three debit reversals, pro-rata whole, each pointing at its original.
  select count(*) into n from public.ledger_entries
   where payment_id = pay.id and entry_type = 'refund_reversal' and direction = 'debit'
     and reversal_of_entry_id is not null and astrologer_id = jyotish and currency = 'NPR';
  if n <> 3 then raise exception 'FAIL: % of 3 reversals', n; end if;
  if (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'refund_reversal'
       and reversal_of_entry_id = (select id from public.ledger_entries where payment_id = pay.id and entry_type = 'platform_gross' and reversal_of_entry_id is null)) <> 2000
  or (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'refund_reversal'
       and reversal_of_entry_id = (select id from public.ledger_entries where payment_id = pay.id and entry_type = 'platform_commission' and reversal_of_entry_id is null)) <> 300
  or (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'refund_reversal'
       and reversal_of_entry_id = (select id from public.ledger_entries where payment_id = pay.id and entry_type = 'jyotish_payable' and reversal_of_entry_id is null)) <> 1700 then
    raise exception 'FAIL: reversals are not 2000 / 300 / 1700';
  end if;
  if (select status from public.payments where id = pay.id) <> 'refunded' then
    raise exception 'FAIL: a fully refunded payment is not refunded';
  end if;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.earned <> 0 or bal.paid <> 0 or bal.payable <> 0 then
    raise exception 'FAIL: balances not zeroed: %', row_to_json(bal);
  end if;
  select count(*) into n from public.audit_log
   where entity_id = r.id and action in ('refund.processing', 'refund.completed');
  if n <> 2 then raise exception 'FAIL: processing/completion audits missing'; end if;

  -- 3. A second completion is refused and writes nothing more.
  begin perform public.complete_refund(r.id, user_f, 'ESEWA-R1'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REFUND_ALREADY_PROCESSED' then raise exception 'FAIL: double completion: %', msg; end if;
  select count(*) into n from public.ledger_entries
   where payment_id = pay.id and entry_type = 'refund_reversal';
  if n <> 3 then raise exception 'FAIL: double completion left % reversals', n; end if;

  -- 4. A partial refund reverses pro-rata and leaves the payment paid.
  b := public.create_booking(cust, jyotish, call_svc, at1030);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refund-done/proof2.png');
  pay := public.approve_payment(pay.id, user_f);
  r := public.request_refund(pay.id, user_f, 400, 'Short session, partial back');
  r := public.approve_refund(r.id, user_f);
  begin perform public.complete_refund(r.id, user_f, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: completion without reference: %', msg; end if;
  r := public.complete_refund(r.id, user_f, 'ESEWA-R2');
  if (select coalesce(sum(amount), 0) from public.ledger_entries
       where payment_id = pay.id and entry_type = 'refund_reversal') <> 800 then
    raise exception 'FAIL: partial reversals do not total 400 + 60 + 340';
  end if;
  if (select status from public.payments where id = pay.id) <> 'paid' then
    raise exception 'FAIL: a partially refunded payment left paid';
  end if;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.earned <> 1360 or bal.payable <> 1360 then
    raise exception 'FAIL: balances not reduced by 340: %', row_to_json(bal);
  end if;

  -- 5. Completion needs approval first, and a triple to reverse.
  b := public.create_booking(cust, jyotish, call_svc, at11);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refund-done/proof3.png');
  -- A paid stamp with no ledger triple (approvals wrote none before 0021).
  update public.payments set status = 'paid', reviewed_by = user_f, reviewed_at = now(), paid_at = now()
   where id = pay.id;
  r := public.request_refund(pay.id, user_f, 200, 'test');
  begin perform public.complete_refund(r.id, user_f, 'ESEWA-R3'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REFUND_ALREADY_PROCESSED' then raise exception 'FAIL: completion before approval: %', msg; end if;
  r := public.approve_refund(r.id, user_f);
  begin perform public.complete_refund(r.id, user_f, 'ESEWA-R3'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'LEDGER_MISMATCH' then raise exception 'FAIL: completion without triple: %', msg; end if;
  if (select status from public.refunds where id = r.id) <> 'approved' then
    raise exception 'FAIL: failed completion moved the refund';
  end if;

  -- 6. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0024') then
    raise exception 'FAIL: 0024 is not recorded';
  end if;

  raise notice '0024_refund_completion: all assertions passed';
end $$;

rollback;
