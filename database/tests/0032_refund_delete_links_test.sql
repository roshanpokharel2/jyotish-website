-- 0032_refund_delete_links_test.sql
-- Self-asserting check for database/migrations/0032_refund_delete_links.sql.
-- Reproduces the failure 0032 fixes: deleting an account with refund history
-- must succeed, and its refund rows must survive still pointing at it.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0032_refund_delete_links: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','32323232-0000-0000-0000-00000000000a','authenticated','authenticated','refunddel-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','32323232-0000-0000-0000-00000000000f','authenticated','authenticated','refunddel-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','32323232-0000-0000-0000-00000000000d','authenticated','authenticated','refunddel-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '32323232-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('32323232-cccc-0000-0000-00000000000a', '32323232-0000-0000-0000-00000000000a', 'Refund Delete Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('32323232-aaaa-0000-0000-00000000000d', '32323232-0000-0000-0000-00000000000d', 'Refund Delete Jyotish', 'active');

do $$
declare
  cust     constant uuid := '32323232-cccc-0000-0000-00000000000a';
  user_c   constant uuid := '32323232-0000-0000-0000-00000000000a';
  user_f   constant uuid := '32323232-0000-0000-0000-00000000000f';
  user_j   constant uuid := '32323232-0000-0000-0000-00000000000d';
  jyotish  constant uuid := '32323232-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 12;
  b        public.bookings;
  pay      public.payments;
  n        int;
begin
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  b := public.create_booking(cust, jyotish, call_svc,
    (day + time '10:00') at time zone 'Asia/Kathmandu');
  pay := public.submit_payment_proof(
    (select id from public.payments where booking_id = b.id), 'refunddel/proof.png');
  pay := public.approve_payment(pay.id, user_f);
  perform public.request_refund(pay.id, user_f, 200, 'history must survive');

  if exists (select 1 from pg_constraint where conrelid = 'public.refunds'::regclass
             and contype = 'f' and conname = 'refunds_payment_id_fkey') then
    raise exception 'FAIL: refunds still has the payment foreign key';
  end if;

  -- Deleting everyone succeeds, and the refund survives still linked.
  delete from auth.users where id = user_c;
  delete from auth.users where id = user_f;
  delete from auth.users where id = user_j;
  select count(*) into n from public.refunds where payment_id = pay.id;
  if n <> 1 then raise exception 'FAIL: the refund row did not survive'; end if;

  if not exists (select 1 from public.schema_migrations where version = '0032') then
    raise exception 'FAIL: 0032 is not recorded';
  end if;

  raise notice '0032_refund_delete_links: all assertions passed';
end $$;

rollback;
