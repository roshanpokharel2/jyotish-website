-- 0021_approval_ledger_test.sql
-- Self-asserting check for database/migrations/0021_approval_ledger.sql.
-- The payment functions run without a JWT, as the server's service role does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0021_approval_ledger: all assertions passed".
--
-- The fail-before case is §2: on 0020 approval confirms the booking but writes
-- no money facts, so the triple is missing; on 0021 it is written in the same
-- transaction.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','21212121-0000-0000-0000-00000000000a','authenticated','authenticated','apprledger-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','21212121-0000-0000-0000-00000000000f','authenticated','authenticated','apprledger-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','21212121-0000-0000-0000-00000000000d','authenticated','authenticated','apprledger-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '21212121-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('21212121-cccc-0000-0000-00000000000a', '21212121-0000-0000-0000-00000000000a', 'Ledger Approve Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('21212121-aaaa-0000-0000-00000000000d', '21212121-0000-0000-0000-00000000000d', 'Ledger Approve Jyotish', 'active');

do $$
declare
  cust     constant uuid := '21212121-cccc-0000-0000-00000000000a';
  user_f   constant uuid := '21212121-0000-0000-0000-00000000000f';
  jyotish  constant uuid := '21212121-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 4;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030   timestamptz := (day + time '10:30') at time zone 'Asia/Kathmandu';
  b        public.bookings;
  pay      public.payments;
  msg      text;
  n        int;
  bal      public.jyotish_balances;
begin
  update public.services set price = 2000 where id = call_svc;
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- 1. Approval writes the triple from the snapshots: 2000 at 15%.
  b := public.create_booking(cust, jyotish, call_svc, at10);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'approve-ledger/proof.png');
  pay := public.approve_payment(pay.id, user_f);
  if pay.status <> 'paid' then raise exception 'FAIL: not paid'; end if;

  -- 2. Gross 2,000, commission 300, payable 1,700 -- all credit, all linked.
  select count(*) into n from public.ledger_entries
   where payment_id = pay.id and booking_id = b.id and astrologer_id = jyotish
     and currency = 'NPR' and direction = 'credit' and commission_percent = 15;
  if n <> 3 then raise exception 'FAIL: % of 3 linked credit rows', n; end if;
  if (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'platform_gross') <> 2000
  or (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'platform_commission') <> 300
  or (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'jyotish_payable') <> 1700 then
    raise exception 'FAIL: the triple is not 2000 / 300 / 1700';
  end if;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.earned <> 1700 or bal.paid <> 0 or bal.payable <> 1700 then
    raise exception 'FAIL: balances are not payable 1700 / paid 0: %', row_to_json(bal);
  end if;

  -- 3. A second approval writes nothing more.
  begin perform public.approve_payment(pay.id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYMENT_ALREADY_PROCESSED' then raise exception 'FAIL: double approval: %', msg; end if;
  select count(*) into n from public.ledger_entries where payment_id = pay.id;
  if n <> 3 then raise exception 'FAIL: double approval left % rows', n; end if;

  -- 4. Rejection writes no money facts.
  b := public.create_booking(cust, jyotish, call_svc, at1030);
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'approve-ledger/proof2.png');
  perform public.reject_payment(pay.id, user_f, 'No money arrived');
  select count(*) into n from public.ledger_entries where payment_id = pay.id;
  if n <> 0 then raise exception 'FAIL: rejection wrote % ledger rows', n; end if;

  -- 5. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0021') then
    raise exception 'FAIL: 0021 is not recorded';
  end if;

  raise notice '0021_approval_ledger: all assertions passed';
end $$;

rollback;
