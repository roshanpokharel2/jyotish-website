-- 0018_payment_rules_test.sql
-- Self-asserting check for database/migrations/0018_payment_rules.sql.
-- Browser attempts run as `authenticated` with a JWT; the payment functions run
-- without a JWT, as the server's service role does. Creates throwaway users,
-- asserts, and ROLLS BACK. Success: "0018_payment_rules: all assertions passed".
--
-- The fail-before case is §9: on 0017 approve_payment() does not exist, so a
-- second approval cannot be refused as PAYMENT_ALREADY_PROCESSED; on 0018 it is.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','18181818-0000-0000-0000-00000000000a','authenticated','authenticated','paytest-a@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','18181818-0000-0000-0000-00000000000b','authenticated','authenticated','paytest-b@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','18181818-0000-0000-0000-00000000000c','authenticated','authenticated','paytest-c@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','18181818-0000-0000-0000-00000000000f','authenticated','authenticated','paytest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','18181818-0000-0000-0000-00000000000d','authenticated','authenticated','paytest-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','18181818-0000-0000-0000-00000000000e','authenticated','authenticated','paytest-moderator@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets these through.
update public.users set role = 'finance'   where id = '18181818-0000-0000-0000-00000000000f';
update public.users set role = 'finance'   where id = '18181818-0000-0000-0000-00000000000c';
update public.users set role = 'moderator' where id = '18181818-0000-0000-0000-00000000000e';

insert into public.customers (id, user_id, full_name) values
  ('18181818-cccc-0000-0000-00000000000a', '18181818-0000-0000-0000-00000000000a', 'Pay A'),
  ('18181818-cccc-0000-0000-00000000000b', '18181818-0000-0000-0000-00000000000b', 'Pay B'),
  ('18181818-cccc-0000-0000-00000000000c', '18181818-0000-0000-0000-00000000000c', 'Pay C (finance)');

insert into public.astrologers (id, user_id, name, status) values
  ('18181818-aaaa-0000-0000-00000000000d', '18181818-0000-0000-0000-00000000000d', 'Pay Jyotish', 'active');

do $$
declare
  cust_a   constant uuid := '18181818-cccc-0000-0000-00000000000a';
  cust_b   constant uuid := '18181818-cccc-0000-0000-00000000000b';
  cust_c   constant uuid := '18181818-cccc-0000-0000-00000000000c';
  user_a   constant uuid := '18181818-0000-0000-0000-00000000000a';
  user_c   constant uuid := '18181818-0000-0000-0000-00000000000c';
  user_f   constant uuid := '18181818-0000-0000-0000-00000000000f';
  user_m   constant uuid := '18181818-0000-0000-0000-00000000000e';
  jyotish  constant uuid := '18181818-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 3;
  at09 timestamptz; at0930 timestamptz; at10 timestamptz;
  at1030 timestamptz; at11 timestamptz; at1130 timestamptz;
  b        public.bookings;
  pay      public.payments;
  pay_id   uuid;
  book_id  uuid;
  msg      text;
  blocked  boolean;
  n        int;
  audits   int;
begin
  at09   := (day + time '09:00') at time zone 'Asia/Kathmandu';
  at0930 := (day + time '09:30') at time zone 'Asia/Kathmandu';
  at10   := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030 := (day + time '10:30') at time zone 'Asia/Kathmandu';
  at11   := (day + time '11:00') at time zone 'Asia/Kathmandu';
  at1130 := (day + time '11:30') at time zone 'Asia/Kathmandu';

  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  -- 1. Booking opens one awaiting_payment payment, amount from the booking's price.
  b := public.create_booking(cust_a, jyotish, call_svc, at10);
  book_id := b.id;
  if b.hold_expires_at <> now() + make_interval(mins => public.setting_num('reservation_minutes', 10)::int) then
    raise exception 'FAIL: hold is not reservation_minutes: %', b.hold_expires_at;
  end if;
  if public.setting_num('reservation_minutes') <> 20 then
    raise exception 'FAIL: reservation_minutes is %, expected 20', public.setting_num('reservation_minutes');
  end if;
  select * into pay from public.payments where booking_id = book_id;
  if pay.status <> 'awaiting_payment' or pay.amount <> b.price_snapshot or pay.currency <> b.currency
     or pay.customer_id <> cust_a or pay.astrologer_id <> jyotish then
    raise exception 'FAIL: payment not opened from the booking: %', row_to_json(pay);
  end if;
  pay_id := pay.id;

  -- 2. A second open payment for the same booking is refused.
  blocked := false;
  begin
    insert into public.payments (customer_id, astrologer_id, booking_id, amount, payment_method, status)
    values (cust_a, jyotish, book_id, 1000, 'esewa', 'awaiting_payment');
  exception when unique_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a second open payment was accepted'; end if;

  -- 3. The status cannot jump, and money columns cannot change, by direct write.
  begin update public.payments set status = 'paid' where id = pay_id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_PAYMENT_STATUS' then raise exception 'FAIL: awaiting->paid directly: %', msg; end if;
  begin update public.payments set amount = 1 where id = pay_id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYMENT_AMOUNT_IMMUTABLE' then raise exception 'FAIL: re-priced a payment: %', msg; end if;
  begin update public.payments set status = 'rejected' where id = pay_id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_PAYMENT_STATUS' then raise exception 'FAIL: awaiting->rejected directly: %', msg; end if;

  -- 4. The browser can neither write payments nor call the functions.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments'
             and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'FAIL: payments has a browser write policy';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.payments (customer_id, astrologer_id, booking_id, amount, payment_method, status)
    values (cust_a, jyotish, book_id, 1, 'esewa', 'awaiting_payment');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer inserted a payment'; end if;
  update public.payments set status = 'cancelled' where id = pay_id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a customer rewrote a payment status'; end if;
  blocked := false;
  begin perform public.approve_payment(pay_id, user_a);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer called approve_payment'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Proof inside the hold freezes it at the consultation start.
  pay := public.submit_payment_proof(pay_id, '18181818-0000-0000-00000000000a/proof.jpg', 'ESEWA-1');
  if pay.status <> 'proof_submitted' or pay.proof_storage_path is null or pay.customer_reference <> 'ESEWA-1' then
    raise exception 'FAIL: proof not recorded: %', row_to_json(pay);
  end if;
  if (select hold_expires_at from public.bookings where id = book_id) <> at10 then
    raise exception 'FAIL: proof did not freeze the hold at the consultation start';
  end if;
  begin pay := public.submit_payment_proof(pay_id, 'x.jpg'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYMENT_ALREADY_PROCESSED' then raise exception 'FAIL: double proof: %', msg; end if;

  -- 6. A held slot under review cannot be retaken.
  begin perform public.create_booking(cust_b, jyotish, call_svc, at10); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SLOT_UNAVAILABLE' then raise exception 'FAIL: retook a slot under review: %', msg; end if;
  if (select status from public.bookings where id = book_id) <> 'payment_pending' then
    raise exception 'FAIL: a booking under review was expired by the retake';
  end if;

  -- 7. Approval needs a reviewer role -- moderator and customer are refused.
  begin perform public.approve_payment(pay_id, user_m); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: moderator approved: %', msg; end if;
  begin perform public.approve_payment(pay_id, user_a); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: customer approved: %', msg; end if;

  -- 8. Finance approves: paid, booking confirmed, audit written.
  select count(*) into audits from public.audit_log where entity_id = pay_id;
  pay := public.approve_payment(pay_id, user_f);
  if pay.status <> 'paid' or pay.reviewed_by <> user_f or pay.reviewed_at is null or pay.paid_at is null then
    raise exception 'FAIL: approval not recorded: %', row_to_json(pay);
  end if;
  if (select status from public.bookings where id = book_id) <> 'confirmed' then
    raise exception 'FAIL: approval did not confirm the booking';
  end if;
  select count(*) into n from public.audit_log
   where entity_id = pay_id and action = 'payment.approved' and actor_user_id = user_f
     and previous_state = jsonb_build_object('status', 'proof_submitted')
     and new_state = jsonb_build_object('status', 'paid');
  if n <> 1 then raise exception 'FAIL: approval audit missing'; end if;

  -- 9. Approving twice is refused and writes nothing new.
  begin perform public.approve_payment(pay_id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYMENT_ALREADY_PROCESSED' then raise exception 'FAIL: double approval: %', msg; end if;
  select count(*) into n from public.audit_log where entity_id = pay_id;
  if n <> audits + 1 then raise exception 'FAIL: double approval wrote audit rows'; end if;
  begin perform public.reject_payment(pay_id, user_f, 'late'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYMENT_ALREADY_PROCESSED' then raise exception 'FAIL: reject after approve: %', msg; end if;

  -- 10. Nobody approves their own booking: customer C is finance staff.
  b := public.create_booking(cust_c, jyotish, call_svc, at11);
  pay := public.submit_payment_proof((select id from public.payments where booking_id = b.id), 'c/proof.png');
  begin perform public.approve_payment(pay.id, user_c); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: self-approval: %', msg; end if;
  perform public.approve_payment(pay.id, user_f);
  if (select status from public.bookings where id = b.id) <> 'confirmed' then
    raise exception 'FAIL: another reviewer could not approve';
  end if;

  -- 11. Reject needs a reason; with one it cancels the booking and frees the slot.
  b := public.create_booking(cust_b, jyotish, call_svc, at1030);
  pay := public.submit_payment_proof((select id from public.payments where booking_id = b.id), 'b/proof.png');
  begin perform public.reject_payment(pay.id, user_f, '  '); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: reasonless rejection: %', msg; end if;
  pay := public.reject_payment(pay.id, user_f, 'No money arrived');
  if pay.status <> 'rejected' or pay.rejection_reason <> 'No money arrived' or pay.reviewed_by <> user_f then
    raise exception 'FAIL: rejection not recorded: %', row_to_json(pay);
  end if;
  if (select status from public.bookings where id = b.id) <> 'cancelled' then
    raise exception 'FAIL: rejection did not cancel the booking';
  end if;
  if not exists (select 1 from public.available_slots(jyotish, call_svc, day, day) where starts_at = at1030) then
    raise exception 'FAIL: a rejected booking still holds its slot';
  end if;
  select count(*) into n from public.audit_log
   where entity_id = pay.id and action = 'payment.rejected' and reason = 'No money arrived'
     and actor_user_id = user_f;
  if n <> 1 then raise exception 'FAIL: rejection audit missing'; end if;

  -- 12. Approving without proof, and late proof, are refused.
  b := public.create_booking(cust_b, jyotish, call_svc, at09);
  pay_id := (select id from public.payments where booking_id = b.id);
  begin perform public.approve_payment(pay_id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PROOF_NOT_SUBMITTED' then raise exception 'FAIL: approval without proof: %', msg; end if;
  update public.bookings set hold_expires_at = now() - interval '1 minute' where id = b.id;
  begin perform public.submit_payment_proof(pay_id, 'b/late.png'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'RESERVATION_EXPIRED' then raise exception 'FAIL: late proof: %', msg; end if;

  -- 13. An expired hold cannot confirm, but it can still be rejected.
  b := public.create_booking(cust_b, jyotish, call_svc, at1130);
  pay := public.submit_payment_proof((select id from public.payments where booking_id = b.id), 'b/proof2.png');
  update public.bookings set hold_expires_at = now() - interval '1 minute' where id = b.id;
  begin perform public.approve_payment(pay.id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'RESERVATION_EXPIRED' then raise exception 'FAIL: expired hold confirmed: %', msg; end if;
  if (select status from public.payments where id = pay.id) <> 'proof_submitted' then
    raise exception 'FAIL: failed approval moved the payment';
  end if;
  perform public.reject_payment(pay.id, user_f, 'Hold had lapsed');
  if (select status from public.bookings where id = b.id) <> 'cancelled' then
    raise exception 'FAIL: late rejection did not cancel';
  end if;

  -- 14. A lapsed hold without proof expires, and its payment is cancelled with it.
  b := public.create_booking(cust_b, jyotish, call_svc, at0930);
  pay_id := (select id from public.payments where booking_id = b.id);
  book_id := b.id;
  update public.bookings set hold_expires_at = now() - interval '1 minute' where id = b.id;
  perform public.create_booking(cust_a, jyotish, call_svc, at0930);
  if (select status from public.bookings where id = book_id) <> 'expired' then
    raise exception 'FAIL: the lapsed hold was not marked expired';
  end if;
  if (select status from public.payments where id = pay_id) <> 'cancelled' then
    raise exception 'FAIL: the lapsed payment was not cancelled';
  end if;

  -- 15. The amount always comes from the booking, never the request.
  update public.services set price = 1200 where id = call_svc;
  b := public.create_booking(cust_b, jyotish, call_svc, at1030);
  pay := public.submit_payment_proof((select id from public.payments where booking_id = b.id), 'b/proof3.png');
  if pay.amount <> 1200 or pay.amount <> b.price_snapshot then
    raise exception 'FAIL: payment amount is not the booking price: %', row_to_json(pay);
  end if;
  pay := public.approve_payment(pay.id, user_f);
  if pay.amount <> 1200 then raise exception 'FAIL: approval changed the amount'; end if;

  -- 16. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0018') then
    raise exception 'FAIL: 0018 is not recorded';
  end if;

  raise notice '0018_payment_rules: all assertions passed';
end $$;

rollback;
