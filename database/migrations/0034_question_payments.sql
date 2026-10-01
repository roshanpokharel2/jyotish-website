-- 0034_question_payments.sql
-- Question service (NPR 100) through the server, Checkpoint Q1.
--
-- Until now the browser inserted question_consultations rows itself (UNPAID, no
-- practitioner) and nothing ever moved them on, so no practitioner saw a question.
-- The RLS policies also let a customer write any column on insert (practitioner,
-- answer, token) and let the assigned practitioner update any column, including
-- payment_status.
--
-- Now a question follows the booking path:
--   * create_question() (server only) takes the practitioner the customer chose, the
--     price from the `question` service, and opens an `awaiting_payment` payment;
--   * the existing proof upload and staff review (0018-0028) prove the payment;
--     approve_payment / reject_payment / refunds handle a question payment as well as
--     a booking payment -- a payment now has exactly one source;
--   * answer_question() (server only) is the only way to write an answer;
--   * the browser can no longer insert or update question rows, and a practitioner
--     sees a question only once it is paid.
--
-- Ledger and refunds no longer join through bookings: the self-review / self-refund
-- checks read the payment's own customer and practitioner, and a refund reverses the
-- original ledger rows with their own booking, practitioner and commission.
--
-- Legacy UNPAID rows (no practitioner, no payment) are left as they are: customers
-- may have paid for them outside the system. See README section 3.
--
-- Run after 0033_consultation_join.sql.

begin;

-- ---------------------------------------------------------------------------
-- Question rows: what was sold, at what price
-- ---------------------------------------------------------------------------
alter table public.question_consultations
  add column if not exists price_snapshot numeric(12,2),
  add column if not exists currency text,
  add column if not exists commission_percent_snapshot numeric(5,2),
  add column if not exists paid_at timestamptz,
  drop constraint if exists question_text_check,
  add  constraint question_text_check check (char_length(btrim(question_text)) between 1 and 2000),
  drop constraint if exists question_answer_check,
  add  constraint question_answer_check check (char_length(answer) <= 5000),
  drop constraint if exists question_birth_snapshot_check,
  add  constraint question_birth_snapshot_check
       check (jsonb_typeof(birth_snapshot) = 'object' and pg_column_size(birth_snapshot) <= 4096);

-- ---------------------------------------------------------------------------
-- Payments: a booking OR a question
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists question_consultation_id uuid
      references public.question_consultations(id) on delete set null,
  drop constraint if exists payments_one_source,
  add  constraint payments_one_source check (num_nonnulls(booking_id, question_consultation_id) = 1);

create unique index if not exists uq_payments_open_question
  on public.payments (question_consultation_id)
  where status in ('awaiting_payment', 'proof_submitted');

create or replace function public.guard_payment_amount()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id   is distinct from old.customer_id
  or new.astrologer_id is distinct from old.astrologer_id
  or new.booking_id    is distinct from old.booking_id
  or new.question_consultation_id is distinct from old.question_consultation_id
  or new.amount        is distinct from old.amount
  or new.currency      is distinct from old.currency
  or new.payment_method is distinct from old.payment_method then
    raise exception 'PAYMENT_AMOUNT_IMMUTABLE';
  end if;
  return new;
end;
$$;

-- Reviewer rule for any payment: finance / admin / super_admin, and never the
-- payment's own customer or practitioner. Reads the payment, not its booking.
drop function if exists public.payment_reviewer_ok(uuid, public.bookings);
create or replace function public.payment_reviewer_ok(p_reviewer uuid, p_payment public.payments)
returns void
language plpgsql
set search_path = public
as $$
declare
  reviewer_role text;
begin
  select role into reviewer_role from public.users where id = p_reviewer;
  if reviewer_role is null or reviewer_role not in ('finance', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_reviewer = (select user_id from public.customers where id = p_payment.customer_id)
     or p_reviewer = (select user_id from public.astrologers where id = p_payment.astrologer_id) then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;
revoke all on function public.payment_reviewer_ok(uuid, public.payments) from public, anon, authenticated;
grant execute on function public.payment_reviewer_ok(uuid, public.payments) to service_role;

-- The three credit rows of an approved payment (AD-7), from the sold price and
-- commission snapshot. Internal: called by approve_payment only.
create or replace function public.write_payment_ledger(
  p_payment public.payments, p_price numeric, p_percent numeric)
returns void
language plpgsql
set search_path = public
as $$
declare
  commission numeric(12,2) := round(p_price * p_percent / 100, 2);
begin
  insert into public.ledger_entries
    (booking_id, payment_id, astrologer_id, entry_type, amount, currency, direction, commission_percent)
  values
    (p_payment.booking_id, p_payment.id, p_payment.astrologer_id, 'platform_gross', p_price, p_payment.currency, 'credit', p_percent),
    (p_payment.booking_id, p_payment.id, p_payment.astrologer_id, 'platform_commission', commission, p_payment.currency, 'credit', p_percent),
    (p_payment.booking_id, p_payment.id, p_payment.astrologer_id, 'jyotish_payable', p_price - commission, p_payment.currency, 'credit', p_percent);
end;
$$;
revoke all on function public.write_payment_ledger(public.payments, numeric, numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_question: the only way a question (and its payment) is created
-- ---------------------------------------------------------------------------
create or replace function public.create_question(
  p_customer uuid, p_astrologer uuid, p_question text, p_subject jsonb)
returns public.question_consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  cust    public.customers;
  svc     public.services;
  created public.question_consultations;
  pay_id  uuid;
begin
  select * into cust from public.customers where id = p_customer for update;
  if not found or cust.status <> 'active' then raise exception 'CUSTOMER_NOT_ACTIVE'; end if;
  if exists (select 1 from public.astrologers where id = p_astrologer and user_id = cust.user_id) then
    raise exception 'SELF_BOOKING';
  end if;
  if not public.is_active_astrologer(p_astrologer) then raise exception 'SERVICE_NOT_BOOKABLE'; end if;

  -- The practitioner's own question service wins over the platform-wide one.
  select * into svc from public.services
   where slug = 'question' and status = 'active'
     and (astrologer_id = p_astrologer or astrologer_id is null)
   order by astrologer_id nulls last
   limit 1;
  if not found then raise exception 'SERVICE_NOT_BOOKABLE'; end if;

  -- ponytail: fixed limit, like TOO_MANY_HOLDS; unpaid questions never expire, so
  -- this is what stops a customer piling them up. Add expiry if it ever matters.
  if (select count(*) from public.payments
       where customer_id = p_customer and question_consultation_id is not null
         and status = 'awaiting_payment') >= 2 then
    raise exception 'TOO_MANY_UNPAID';
  end if;

  insert into public.question_consultations
    (customer_id, astrologer_id, customer_name, birth_snapshot, question_text,
     payment_status, status, price_snapshot, currency, commission_percent_snapshot)
  values
    (p_customer, p_astrologer, coalesce(p_subject->>'name', cust.full_name),
     coalesce(p_subject, '{}'::jsonb), btrim(p_question),
     'UNPAID', 'UNPAID', svc.price, svc.currency, public.setting_num('consultation_commission_percent'))
  returning * into created;

  insert into public.payments
    (customer_id, astrologer_id, question_consultation_id, amount, currency, payment_method, status)
  values
    (p_customer, p_astrologer, created.id, svc.price, svc.currency, 'esewa', 'awaiting_payment')
  returning id into pay_id;

  update public.question_consultations set payment_id = pay_id where id = created.id
  returning * into created;
  return created;
end;
$$;
revoke all on function public.create_question(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_question(uuid, uuid, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Proof, approval, rejection: booking or question
-- ---------------------------------------------------------------------------
create or replace function public.submit_payment_proof(p_payment uuid, p_proof_path text, p_reference text default null)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  b   public.bookings;
begin
  select * into pay from public.payments where id = p_payment for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if pay.status <> 'awaiting_payment' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  if nullif(btrim(p_proof_path), '') is null or char_length(p_proof_path) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  if pay.booking_id is not null then
    select * into b from public.bookings where id = pay.booking_id for update;
    if not found or b.status <> 'payment_pending' or b.hold_expires_at <= now() then
      raise exception 'RESERVATION_EXPIRED';
    end if;
  elsif not exists (select 1 from public.question_consultations
                     where id = pay.question_consultation_id and status = 'UNPAID') then
    raise exception 'PAYMENT_ALREADY_PROCESSED';
  end if;

  update public.payments
     set status = 'proof_submitted',
         proof_storage_path = p_proof_path,
         customer_reference = nullif(btrim(p_reference), '')
   where id = p_payment
  returning * into pay;

  -- A booking keeps its slot while staff review the proof.
  if b.id is not null then
    update public.bookings set hold_expires_at = scheduled_at where id = b.id;
  end if;

  return pay;
end;
$$;

create or replace function public.approve_payment(p_payment uuid, p_reviewer uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay        public.payments;
  b          public.bookings;
  q          public.question_consultations;
  cust_user  uuid;
  astro_user uuid;
begin
  select * into pay from public.payments where id = p_payment for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if pay.status = 'awaiting_payment' then raise exception 'PROOF_NOT_SUBMITTED'; end if;
  if pay.status <> 'proof_submitted' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  perform public.payment_reviewer_ok(p_reviewer, pay);

  if pay.booking_id is not null then
    select * into b from public.bookings where id = pay.booking_id for update;
    if not found or b.status <> 'payment_pending' or b.hold_expires_at <= now() then
      raise exception 'RESERVATION_EXPIRED';
    end if;
  else
    select * into q from public.question_consultations where id = pay.question_consultation_id for update;
    if not found or q.status <> 'UNPAID' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  end if;

  select user_id into cust_user from public.customers where id = pay.customer_id;
  select user_id into astro_user from public.astrologers where id = pay.astrologer_id;

  update public.payments
     set status = 'paid', reviewed_by = p_reviewer, reviewed_at = now(), paid_at = now()
   where id = p_payment
  returning * into pay;

  if b.id is not null then
    update public.bookings set status = 'confirmed' where id = b.id;
    perform public.write_payment_ledger(pay, b.price_snapshot, b.commission_percent_snapshot);
  else
    update public.question_consultations
       set payment_status = 'PAID', status = 'PAID', paid_at = now()
     where id = q.id
    returning * into q;
    perform public.write_payment_ledger(pay, q.price_snapshot, q.commission_percent_snapshot);
  end if;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, metadata)
  values (p_reviewer, (select role from public.users where id = p_reviewer),
          'payment.approved', 'payment', p_payment,
          jsonb_build_object('status', 'proof_submitted'), jsonb_build_object('status', 'paid'),
          case when b.id is not null then jsonb_build_object('booking_id', b.id)
               else jsonb_build_object('question_consultation_id', q.id) end);

  if b.id is not null then
    perform public.notify_user(cust_user, 'booking_confirmed',
      'Booking confirmed',
      'Your payment of ' || b.currency || ' ' || b.price_snapshot || ' was verified. See you on ' ||
        to_char(b.scheduled_at at time zone 'Asia/Kathmandu', 'DD Mon YYYY, HH24:MI') || ' NPT.',
      'booking', b.id, 'payment_approved', p_payment);
    perform public.notify_user(astro_user, 'booking_confirmed',
      'New confirmed booking',
      'A ' || b.currency || ' ' || b.price_snapshot || ' consultation is confirmed for ' ||
        to_char(b.scheduled_at at time zone 'Asia/Kathmandu', 'DD Mon YYYY, HH24:MI') || ' NPT.',
      'booking', b.id);
  else
    perform public.notify_user(cust_user, 'question_payment_verified',
      'Question payment verified',
      'Your payment of ' || q.currency || ' ' || q.price_snapshot || ' was verified. Question Q-' ||
        lpad(q.question_id::text, 6, '0') || ' has been sent to the astrologer.',
      'question_consultation', q.id, 'payment_approved', p_payment);
    perform public.notify_user(astro_user, 'question_assigned',
      'New question',
      'A paid question (Q-' || lpad(q.question_id::text, 6, '0') || ') is waiting for your answer.',
      'question_consultation', q.id);
  end if;

  return pay;
end;
$$;

create or replace function public.reject_payment(p_payment uuid, p_reviewer uuid, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  b   public.bookings;
  q   public.question_consultations;
begin
  if nullif(btrim(p_reason), '') is null then raise exception 'INVALID_INPUT'; end if;

  select * into pay from public.payments where id = p_payment for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if pay.status = 'awaiting_payment' then raise exception 'PROOF_NOT_SUBMITTED'; end if;
  if pay.status <> 'proof_submitted' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  perform public.payment_reviewer_ok(p_reviewer, pay);

  if pay.booking_id is not null then
    select * into b from public.bookings where id = pay.booking_id for update;
    if not found or b.status <> 'payment_pending' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  else
    select * into q from public.question_consultations where id = pay.question_consultation_id for update;
    if not found or q.status <> 'UNPAID' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  end if;

  update public.payments
     set status = 'rejected', reviewed_by = p_reviewer, reviewed_at = now(),
         rejection_reason = btrim(p_reason)
   where id = p_payment
  returning * into pay;

  if b.id is not null then
    update public.bookings set status = 'cancelled' where id = b.id;
  else
    update public.question_consultations set payment_status = 'FAILED', status = 'CLOSED' where id = q.id;
  end if;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason, metadata)
  values (p_reviewer, (select role from public.users where id = p_reviewer),
          'payment.rejected', 'payment', p_payment,
          jsonb_build_object('status', 'proof_submitted'), jsonb_build_object('status', 'rejected'),
          btrim(p_reason),
          case when b.id is not null then jsonb_build_object('booking_id', b.id)
               else jsonb_build_object('question_consultation_id', q.id) end);

  perform public.notify_user((select user_id from public.customers where id = pay.customer_id),
    'payment_rejected', 'Payment not verified',
    'Your payment of ' || pay.currency || ' ' || pay.amount || ' could not be verified: ' || btrim(p_reason),
    'payment', p_payment, 'payment_rejected', p_payment);

  return pay;
end;
$$;

-- ---------------------------------------------------------------------------
-- Refunds: read the payment and its ledger rows, not a booking
-- ---------------------------------------------------------------------------
create or replace function public.refund_actor_ok(p_actor uuid, p_payment uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  actor_role text;
  pay        public.payments;
begin
  select role into actor_role from public.users where id = p_actor;
  if actor_role is null or actor_role not in ('finance', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
  select * into pay from public.payments where id = p_payment;
  if p_actor = (select user_id from public.customers where id = pay.customer_id)
     or p_actor = (select user_id from public.astrologers where id = pay.astrologer_id) then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

create or replace function public.complete_refund(
  p_refund uuid, p_actor uuid, p_external_reference text,
  p_proof_path text default null, p_notes text default null)
returns public.refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  r         public.refunds;
  prev      text;
  pay       public.payments;
  orig      public.ledger_entries;
  pct       numeric;
  completed numeric(12,2);
  rev_comm  numeric(12,2);
begin
  if nullif(btrim(p_external_reference), '') is null or char_length(p_external_reference) > 200 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_proof_path is not null
     and (nullif(btrim(p_proof_path), '') is null or char_length(p_proof_path) > 500) then
    raise exception 'INVALID_INPUT';
  end if;
  if p_notes is not null and char_length(p_notes) > 2000 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into r from public.refunds where id = p_refund for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.status not in ('approved', 'processing') then raise exception 'REFUND_ALREADY_PROCESSED'; end if;
  perform public.refund_actor_ok(p_actor, r.payment_id);
  prev := r.status;

  select * into pay from public.payments where id = r.payment_id;

  if (select count(*) from public.ledger_entries
       where payment_id = r.payment_id and reversal_of_entry_id is null
         and entry_type in ('platform_gross', 'platform_commission', 'jyotish_payable')) <> 3 then
    raise exception 'LEDGER_MISMATCH';
  end if;

  -- The commission that applied to the sale, as written when it was approved.
  select commission_percent into pct from public.ledger_entries
   where payment_id = r.payment_id and reversal_of_entry_id is null and entry_type = 'platform_gross';
  rev_comm := round(r.amount * pct / 100, 2);
  for orig in
    select * from public.ledger_entries
     where payment_id = r.payment_id and reversal_of_entry_id is null
       and entry_type in ('platform_gross', 'platform_commission', 'jyotish_payable')
  loop
    insert into public.ledger_entries
      (booking_id, payment_id, astrologer_id, entry_type, amount, currency, direction,
       reversal_of_entry_id, commission_percent)
    values
      (orig.booking_id, r.payment_id, orig.astrologer_id, 'refund_reversal',
       case orig.entry_type
         when 'platform_gross' then r.amount
         when 'platform_commission' then rev_comm
         else r.amount - rev_comm end,
       r.currency,
       case orig.direction when 'credit' then 'debit' else 'credit' end,
       orig.id, pct);
  end loop;

  update public.refunds
     set status = 'completed', processed_by = p_actor, processed_at = now(),
         external_reference = btrim(p_external_reference),
         proof_storage_path = nullif(btrim(p_proof_path), ''),
         notes = p_notes
   where id = p_refund
  returning * into r;

  select coalesce(sum(amount), 0) into completed from public.refunds
   where payment_id = r.payment_id and status = 'completed';
  if completed >= pay.amount then
    update public.payments set status = 'refunded' where id = r.payment_id;
    update public.question_consultations set payment_status = 'REFUNDED'
     where id = pay.question_consultation_id;
  end if;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason, metadata)
  values (p_actor, (select role from public.users where id = p_actor),
          'refund.completed', 'refund', p_refund,
          jsonb_build_object('status', prev), jsonb_build_object('status', 'completed'),
          btrim(p_external_reference), jsonb_build_object('payment_id', r.payment_id, 'amount', r.amount));

  perform public.notify_user((select user_id from public.customers where id = pay.customer_id),
    'refund_completed', 'Refund sent',
    r.currency || ' ' || r.amount || ' was refunded to your account (ref ' || btrim(p_external_reference) || ').',
    'refund', p_refund, 'refund_completed', p_refund);

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- answer_question: the only way an answer is written
-- ---------------------------------------------------------------------------
create or replace function public.answer_question(
  p_question uuid, p_user uuid, p_answer text, p_final boolean)
returns public.question_consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.question_consultations;
begin
  if nullif(btrim(p_answer), '') is null or char_length(p_answer) > 5000 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into q from public.question_consultations where id = p_question for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not exists (select 1 from public.astrologers where id = q.astrologer_id and user_id = p_user) then
    raise exception 'FORBIDDEN';
  end if;
  if q.payment_status <> 'PAID' or q.status not in ('PAID', 'IN REVIEW') then
    raise exception 'QUESTION_CLOSED';
  end if;

  update public.question_consultations
     set answer = btrim(p_answer),
         status = case when p_final then 'ANSWERED' else 'IN REVIEW' end,
         answered_at = case when p_final then now() end
   where id = p_question
  returning * into q;

  if p_final then
    perform public.notify_user((select user_id from public.customers where id = q.customer_id),
      'question_answered', 'Question answer ready',
      'Your astrology question Q-' || lpad(q.question_id::text, 6, '0') || ' has been answered.',
      'question_consultation', q.id);
  end if;
  return q;
end;
$$;
revoke all on function public.answer_question(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.answer_question(uuid, uuid, text, boolean) to service_role;

-- Notifications are explicit now (approve_payment, answer_question); the trigger
-- would send them twice.
drop trigger if exists trg_question_answer_notification on public.question_consultations;
drop function if exists public.notify_question_answer();

-- ---------------------------------------------------------------------------
-- RLS: the browser reads; the server writes
-- ---------------------------------------------------------------------------
drop policy if exists "customers can create own unpaid question consultations" on public.question_consultations;
drop policy if exists "assigned astrologers can answer question consultations" on public.question_consultations;
drop policy if exists "assigned astrologers can view question consultations" on public.question_consultations;
drop policy if exists "assigned astrologers can view paid question consultations" on public.question_consultations;
create policy "assigned astrologers can view paid question consultations"
  on public.question_consultations for select
  using (payment_status <> 'UNPAID'
         and auth.uid() = (select a.user_id from public.astrologers a where a.id = question_consultations.astrologer_id));

insert into public.schema_migrations (version, name) values ('0034', 'question_payments');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0034_question_payments_test.sql, then the payment, ledger and
-- refund tests (0018-0028) -- all assert and roll back.
