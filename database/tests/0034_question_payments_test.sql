-- 0034_question_payments_test.sql
-- Self-asserting check for database/migrations/0034_question_payments.sql.
-- Server calls run without a JWT, as the service role does; browser calls run as
-- `authenticated` with a JWT. Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0034_question_payments: all assertions passed".
--
-- The fail-before case is §1: on 0033 a customer can insert a question carrying its
-- own answer, and the assigned practitioner can mark it PAID from the browser.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','34343434-0000-0000-0000-00000000000a','authenticated','authenticated','question-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','34343434-0000-0000-0000-00000000000f','authenticated','authenticated','question-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','34343434-0000-0000-0000-00000000000d','authenticated','authenticated','question-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','34343434-0000-0000-0000-00000000000e','authenticated','authenticated','question-rival@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','34343434-0000-0000-0000-000000000005','authenticated','authenticated','question-self@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','34343434-0000-0000-0000-000000000009','authenticated','authenticated','question-inactive@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '34343434-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('34343434-cccc-0000-0000-00000000000a', '34343434-0000-0000-0000-00000000000a', 'Question Customer'),
  ('34343434-cccc-0000-0000-00000000000f', '34343434-0000-0000-0000-00000000000f', 'Question Finance As Customer'),
  ('34343434-cccc-0000-0000-000000000005', '34343434-0000-0000-0000-000000000005', 'Question Self');

insert into public.astrologers (id, user_id, name, status) values
  ('34343434-aaaa-0000-0000-00000000000d', '34343434-0000-0000-0000-00000000000d', 'Question Jyotish', 'active'),
  ('34343434-aaaa-0000-0000-00000000000e', '34343434-0000-0000-0000-00000000000e', 'Question Rival', 'active'),
  ('34343434-aaaa-0000-0000-000000000005', '34343434-0000-0000-0000-000000000005', 'Question Self Jyotish', 'active'),
  ('34343434-aaaa-0000-0000-000000000009', '34343434-0000-0000-0000-000000000009', 'Question Inactive', 'suspended');

do $$
declare
  user_a   constant uuid := '34343434-0000-0000-0000-00000000000a';
  user_f   constant uuid := '34343434-0000-0000-0000-00000000000f';
  user_d   constant uuid := '34343434-0000-0000-0000-00000000000d';
  user_e   constant uuid := '34343434-0000-0000-0000-00000000000e';
  cust     constant uuid := '34343434-cccc-0000-0000-00000000000a';
  cust_f   constant uuid := '34343434-cccc-0000-0000-00000000000f';
  cust_s   constant uuid := '34343434-cccc-0000-0000-000000000005';
  jyotish  constant uuid := '34343434-aaaa-0000-0000-00000000000d';
  self_j   constant uuid := '34343434-aaaa-0000-0000-000000000005';
  inactive constant uuid := '34343434-aaaa-0000-0000-000000000009';
  subject  constant jsonb := '{"name":"Ram","dob_ad":"1990-01-01","birth_place":"Kathmandu"}';
  legacy   uuid;
  q1       public.question_consultations;
  q2       public.question_consultations;
  q        public.question_consultations;
  pay      public.payments;
  r        public.refunds;
  bal      public.jyotish_balances;
  msg      text;
  n        int;
begin
  -- 1. The browser cannot write question rows (fail-before: both are accepted on 0033).
  insert into public.question_consultations (customer_id, astrologer_id, customer_name, question_text)
  values (cust, jyotish, 'Question Customer', 'Legacy style question')
  returning id into legacy;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  begin
    insert into public.question_consultations (customer_id, astrologer_id, customer_name, question_text, answer)
    values (cust, jyotish, 'Question Customer', 'Forged', 'A forged answer');
    msg := 'accepted';
  exception when insufficient_privilege then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: a customer inserted a question with its own answer'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', user_d, 'role', 'authenticated')::text, true);
  update public.question_consultations set payment_status = 'PAID', status = 'PAID' where id = legacy;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the practitioner marked a question PAID from the browser'; end if;
  -- An unpaid question (and its birth details) is not shown to the practitioner.
  if exists (select 1 from public.question_consultations where id = legacy) then
    raise exception 'FAIL: the practitioner sees an unpaid question';
  end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 2. create_question takes price, currency and commission from the database.
  q1 := public.create_question(cust, jyotish, '  What does Saturn mean for my career?  ', subject);
  if q1.status <> 'UNPAID' or q1.payment_status <> 'UNPAID' or q1.astrologer_id <> jyotish
     or q1.price_snapshot <> 100 or q1.currency <> 'NPR' or q1.commission_percent_snapshot <> 15
     or q1.question_text <> 'What does Saturn mean for my career?' or q1.customer_name <> 'Ram'
     or q1.question_id is null or q1.payment_id is null then
    raise exception 'FAIL: create_question row is wrong: %', row_to_json(q1);
  end if;
  select * into pay from public.payments where id = q1.payment_id;
  if pay.status <> 'awaiting_payment' or pay.amount <> 100 or pay.question_consultation_id <> q1.id
     or pay.booking_id is not null or pay.astrologer_id <> jyotish or pay.customer_id <> cust then
    raise exception 'FAIL: question payment is wrong: %', row_to_json(pay);
  end if;

  -- 3. Refusals.
  begin perform public.create_question(cust_s, self_j, 'Self', '{}'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SELF_BOOKING' then raise exception 'FAIL: self question: %', msg; end if;

  begin perform public.create_question(cust, inactive, 'Inactive', '{}'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SERVICE_NOT_BOOKABLE' then raise exception 'FAIL: inactive practitioner: %', msg; end if;

  update public.services set status = 'draft' where slug = 'question';
  begin perform public.create_question(cust, jyotish, 'Draft', '{}'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SERVICE_NOT_BOOKABLE' then raise exception 'FAIL: draft service: %', msg; end if;
  update public.services set status = 'active' where slug = 'question';

  begin perform public.create_question(cust, jyotish, '   ', '{}'); msg := 'accepted';
  exception when check_violation then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: a blank question was accepted'; end if;

  begin perform public.create_question(cust, jyotish, 'Array subject', '[1]'); msg := 'accepted';
  exception when check_violation then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: a non-object subject was accepted'; end if;

  q2 := public.create_question(cust, jyotish, 'Second question', subject);
  begin perform public.create_question(cust, jyotish, 'Third question', subject); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'TOO_MANY_UNPAID' then raise exception 'FAIL: third unpaid question: %', msg; end if;

  -- 4. A payment has exactly one source.
  begin
    insert into public.payments (customer_id, astrologer_id, amount, payment_method, status)
    values (cust, jyotish, 100, 'esewa', 'awaiting_payment');
    msg := 'accepted';
  exception when check_violation then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: a payment without a source was accepted'; end if;
  begin update public.payments set question_consultation_id = q2.id where id = q1.payment_id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'PAYMENT_AMOUNT_IMMUTABLE' then raise exception 'FAIL: payment source moved: %', msg; end if;

  -- 5. Review: nobody may approve a payment they are party to.
  q := public.create_question(cust_f, jyotish, 'Finance asks', '{}');
  perform public.submit_payment_proof(q.payment_id, 'question/self.png');
  begin perform public.approve_payment(q.payment_id, user_f); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: self review: %', msg; end if;
  begin perform public.approve_payment(q.payment_id, user_d); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: practitioner review: %', msg; end if;

  -- 6. Proof, then approval: paid, numbered, three ledger rows, both told.
  pay := public.submit_payment_proof(q1.payment_id, 'question/q1.png', ' ESEWA-1 ');
  if pay.status <> 'proof_submitted' or pay.customer_reference <> 'ESEWA-1' then
    raise exception 'FAIL: proof not recorded: %', row_to_json(pay);
  end if;
  pay := public.approve_payment(q1.payment_id, user_f);
  select * into q1 from public.question_consultations where id = q1.id;
  if pay.status <> 'paid' or q1.payment_status <> 'PAID' or q1.status <> 'PAID'
     or q1.paid_at is null then
    raise exception 'FAIL: approval did not pay the question: %', row_to_json(q1);
  end if;
  select count(*) into n from public.ledger_entries
   where payment_id = pay.id and booking_id is null and astrologer_id = jyotish
     and direction = 'credit' and commission_percent = 15;
  if n <> 3 then raise exception 'FAIL: % of 3 question ledger rows', n; end if;
  if (select amount from public.ledger_entries where payment_id = pay.id and entry_type = 'jyotish_payable') <> 85 then
    raise exception 'FAIL: payable is not 85';
  end if;
  if not exists (select 1 from public.notifications where user_id = user_a and type = 'question_payment_verified')
  or not exists (select 1 from public.notifications where user_id = user_d and type = 'question_assigned')
  or not exists (select 1 from public.email_jobs where kind = 'payment_approved' and entity_id = pay.id) then
    raise exception 'FAIL: approval did not notify customer, practitioner and email';
  end if;

  -- 7. The practitioner now sees it; a rival never does; the customer always does.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_d, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.question_consultations where id = q1.id) then
    raise exception 'FAIL: the practitioner cannot see a paid question';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_e, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.question_consultations where id = q1.id) then
    raise exception 'FAIL: a rival practitioner sees the question';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.question_consultations where id = q2.id) then
    raise exception 'FAIL: the customer cannot see their own unpaid question';
  end if;
  begin perform public.answer_question(q1.id, user_d, 'From the browser', true); msg := 'accepted';
  exception when insufficient_privilege then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: the browser called answer_question'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 8. Answers: only the assigned practitioner; draft, then final, then locked.
  begin perform public.answer_question(q1.id, user_e, 'Rival answer', true); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: rival answer: %', msg; end if;
  begin perform public.answer_question(q1.id, user_d, '  ', false); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_INPUT' then raise exception 'FAIL: blank answer: %', msg; end if;
  begin perform public.answer_question(q2.id, user_d, 'Unpaid answer', false); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'QUESTION_CLOSED' then raise exception 'FAIL: answer to an unpaid question: %', msg; end if;

  q := public.answer_question(q1.id, user_d, 'Draft answer', false);
  if q.status <> 'IN REVIEW' or q.answered_at is not null then raise exception 'FAIL: draft: %', row_to_json(q); end if;
  if exists (select 1 from public.notifications where user_id = user_a and type = 'question_answered') then
    raise exception 'FAIL: a draft notified the customer';
  end if;
  q := public.answer_question(q1.id, user_d, 'Final answer', true);
  if q.status <> 'ANSWERED' or q.answered_at is null or q.answer <> 'Final answer' then
    raise exception 'FAIL: final: %', row_to_json(q);
  end if;
  if not exists (select 1 from public.notifications where user_id = user_a and type = 'question_answered') then
    raise exception 'FAIL: the final answer did not notify the customer';
  end if;
  begin perform public.answer_question(q1.id, user_d, 'Edited later', true); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'QUESTION_CLOSED' then raise exception 'FAIL: edit after final: %', msg; end if;

  -- 9. Rejection closes the question.
  perform public.submit_payment_proof(q2.payment_id, 'question/q2.png');
  perform public.reject_payment(q2.payment_id, user_f, 'No money arrived');
  select * into q2 from public.question_consultations where id = q2.id;
  if q2.payment_status <> 'FAILED' or q2.status <> 'CLOSED' then
    raise exception 'FAIL: rejection did not close the question: %', row_to_json(q2);
  end if;
  if exists (select 1 from public.ledger_entries where payment_id = q2.payment_id) then
    raise exception 'FAIL: rejection wrote ledger rows';
  end if;

  -- 10. A full refund reverses the ledger from its own rows and marks the question.
  r := public.request_refund(q1.payment_id, user_f, 100, 'Answer came too late');
  r := public.approve_refund(r.id, user_f);
  r := public.complete_refund(r.id, user_f, 'ESEWA-R1');
  select count(*) into n from public.ledger_entries
   where payment_id = q1.payment_id and entry_type = 'refund_reversal'
     and booking_id is null and astrologer_id = jyotish and commission_percent = 15;
  if n <> 3 then raise exception 'FAIL: % of 3 reversal rows', n; end if;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.payable <> 0 then raise exception 'FAIL: payable after refund is %', bal.payable; end if;
  if (select status from public.payments where id = q1.payment_id) <> 'refunded'
  or (select payment_status from public.question_consultations where id = q1.id) <> 'REFUNDED' then
    raise exception 'FAIL: full refund did not mark payment and question refunded';
  end if;

  -- 11. The legacy row is untouched.
  if (select status || '/' || payment_status from public.question_consultations where id = legacy) <> 'UNPAID/UNPAID' then
    raise exception 'FAIL: the legacy row changed';
  end if;

  -- 12. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0034') then
    raise exception 'FAIL: 0034 is not recorded';
  end if;

  raise notice '0034_question_payments: all assertions passed';
end $$;

rollback;
