-- 0018_payment_rules.sql
-- Step 8, Checkpoint 8a of docs/IMPLEMENTATION-PLAN.md -- the server decides when a
-- booking is paid; the browser is never trusted to say so.
--
-- Until now `payments` had the old status set (pending|verified|failed|refunded) and
-- nothing wrote to it, so every booking lapsed 10 minutes after it was made. After
-- this migration:
--
--   * `payments.status` is awaiting_payment -> proof_submitted -> paid | rejected,
--     plus cancelled and refunded. Only those steps are allowed, enforced by a
--     trigger -- whatever writes the row, however concurrently.
--   * Review and proof columns: proof_storage_path, customer_reference, reviewed_by,
--     reviewed_at, rejection_reason, paid_at.
--   * Money columns (amount, currency, booking, parties, method) cannot change after
--     the insert: the amount always comes from the booking's saved price.
--   * A booking has at most one open (awaiting_payment, proof_submitted) payment.
--   * Paying is done by server-only functions (service_role; no browser INSERT or
--     UPDATE policy exists and none is added): create_booking() opens the payment,
--     submit_payment_proof() records the proof and freezes the hold until the
--     consultation starts, approve_payment() confirms the booking, reject_payment()
--     cancels it and frees the slot. Each function is one transaction. A payment
--     whose hold has already expired cannot confirm its booking. Approvals and
--     rejections are written to the audit log.
--   * Approvers are finance, admin and super_admin -- never the booking's own
--     customer or practitioner -- checked against the database, never a claim.
--   * The hold grows from 10 to 20 minutes (reservation_minutes): opening eSewa,
--     paying and taking a screenshot takes longer than 10.
--
-- Skipped (add when a reader needs them): provider / verification_method (only
-- manual eSewa exists), admin_notes (the audit log carries review notes),
-- metadata, nullable astrologer_id and a wider payment_method (no cash/wallet
-- flow yet), ledger entries (Step 13 -- approval completes without them).
--
-- Run after 0017_practitioner_directory.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Status set and new columns
-- ---------------------------------------------------------------------------
-- The table is empty in every database so far (nothing ever wrote to it), but the
-- remap keeps this re-runnable anywhere: old rows join the new flow instead of
-- failing the new constraint.
update public.payments set status = case status
  when 'pending'  then 'awaiting_payment'
  when 'verified' then 'paid'
  when 'failed'   then 'rejected'
  else status end
where status in ('pending', 'verified', 'failed');

alter table public.payments
  drop constraint if exists payments_status_check,
  add  constraint payments_status_check check (status in (
    'awaiting_payment','proof_submitted','paid','rejected','cancelled','refunded'));

alter table public.payments
  add column if not exists proof_storage_path text,
  add column if not exists customer_reference  text,
  add column if not exists reviewed_by         uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at         timestamptz,
  add column if not exists rejection_reason    text,
  add column if not exists paid_at             timestamptz,
  drop constraint if exists payments_proof_check,
  add  constraint payments_proof_check check (customer_reference is null or char_length(customer_reference) <= 120),
  drop constraint if exists payments_rejection_check,
  add  constraint payments_rejection_check check (rejection_reason is null or char_length(rejection_reason) <= 1000);

-- ---------------------------------------------------------------------------
-- 2. Twenty minutes to pay
-- ---------------------------------------------------------------------------
update public.platform_settings
   set value = '20'::jsonb,
       description = 'How long a slot is held while the customer pays and uploads proof. Enforced server-side; the countdown in the UI is cosmetic.'
 where key = 'reservation_minutes';

-- ---------------------------------------------------------------------------
-- 3. One open payment per booking
-- ---------------------------------------------------------------------------
create unique index if not exists uq_payments_open_booking
  on public.payments (booking_id)
  where status in ('awaiting_payment', 'proof_submitted');

-- ---------------------------------------------------------------------------
-- 4. Only the legal status steps, and review data where a decision exists
-- ---------------------------------------------------------------------------
create or replace function public.guard_payment_status()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'awaiting_payment' then
      raise exception 'INVALID_PAYMENT_STATUS';
    end if;
    return new;
  end if;

  if old.status = new.status then return new; end if;

  ok := (old.status = 'awaiting_payment' and new.status in ('proof_submitted', 'cancelled'))
     or (old.status = 'proof_submitted'  and new.status in ('paid', 'rejected', 'cancelled'))
     or (old.status = 'paid'              and new.status = 'refunded');
  if not ok then raise exception 'INVALID_PAYMENT_STATUS'; end if;

  -- A decision is attributable: who, when, and why not.
  if new.status = 'paid' and (new.reviewed_by is null or new.reviewed_at is null or new.paid_at is null) then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;
  if new.status = 'rejected'
     and (new.reviewed_by is null or new.reviewed_at is null or nullif(btrim(new.rejection_reason), '') is null) then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payments_status on public.payments;
create trigger trg_payments_status
before insert or update of status on public.payments
for each row execute function public.guard_payment_status();

-- ---------------------------------------------------------------------------
-- 5. Money columns never change after the insert
-- ---------------------------------------------------------------------------
-- The amount is decided once, from the booking's saved price. No function below
-- touches these columns; the trigger makes that a guarantee rather than a habit.
create or replace function public.guard_payment_amount()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id   is distinct from old.customer_id
  or new.astrologer_id is distinct from old.astrologer_id
  or new.booking_id    is distinct from old.booking_id
  or new.amount        is distinct from old.amount
  or new.currency      is distinct from old.currency
  or new.payment_method is distinct from old.payment_method then
    raise exception 'PAYMENT_AMOUNT_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_amount on public.payments;
create trigger trg_payments_amount
before update on public.payments
for each row execute function public.guard_payment_amount();

-- ---------------------------------------------------------------------------
-- 6. Booking opens its own payment (supersedes create_booking() from 0016)
-- ---------------------------------------------------------------------------
-- The payment amount is the booking's price snapshot, which itself came from the
-- service -- at no point does a number cross from the request body.
--
-- The expiry sweep now also cancels the open payment of each lapsed hold, and it
-- never touches a booking whose proof is already in: once proof is submitted the
-- hold freezes until the consultation starts (see submit_payment_proof) and only
-- staff decide what happens next.
drop function if exists public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb);

create or replace function public.create_booking(
  p_customer uuid, p_astrologer uuid, p_service uuid, p_starts_at timestamptz,
  p_notes text default null, p_subject jsonb default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  cust     public.customers;
  svc      public.services;
  slot_end timestamptz;
  created  public.bookings;
begin
  -- Locking the customer row serialises one customer's bookings, so the hold limit
  -- below cannot be raced.
  select * into cust from public.customers where id = p_customer for update;
  if not found or cust.status <> 'active' then
    raise exception 'CUSTOMER_NOT_ACTIVE';
  end if;
  if exists (select 1 from public.astrologers where id = p_astrologer and user_id = cust.user_id) then
    raise exception 'SELF_BOOKING';
  end if;

  select * into svc from public.services where id = p_service;
  if not found or svc.status <> 'active' or svc.duration_minutes is null
     or (svc.astrologer_id is not null and svc.astrologer_id <> p_astrologer)
     or not public.is_active_astrologer(p_astrologer) then
    raise exception 'SERVICE_NOT_BOOKABLE';
  end if;

  -- Must be one of the offered start times (inside the hours, on the grid, in the
  -- future, not taken).
  if not exists (
    select 1 from public.available_slots(p_astrologer, p_service,
      (p_starts_at at time zone 'Asia/Kathmandu')::date, (p_starts_at at time zone 'Asia/Kathmandu')::date) s
    where s.starts_at = p_starts_at) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  -- ponytail: fixed limit against one customer holding many slots; make it a
  -- platform setting if it ever needs tuning.
  if (select count(*) from public.bookings
       where customer_id = p_customer and status = 'payment_pending' and hold_expires_at > now()) >= 2 then
    raise exception 'TOO_MANY_HOLDS';
  end if;

  slot_end := p_starts_at + svc.duration_minutes * interval '1 minute';

  -- Expired holds still occupy the slot in the exclusion constraint; release them,
  -- but never a hold whose proof is already waiting for review.
  update public.bookings b set status = 'expired'
   where b.astrologer_id = p_astrologer and b.status = 'payment_pending' and b.hold_expires_at <= now()
     and tstzrange(b.scheduled_at, b.ends_at, '[)') && tstzrange(p_starts_at, slot_end, '[)')
     and not exists (select 1 from public.payments p
                      where p.booking_id = b.id and p.status = 'proof_submitted');

  -- The lapsed payment never completes: it follows its booking into cancelled.
  update public.payments p set status = 'cancelled'
    from public.bookings b
   where p.booking_id = b.id and p.status = 'awaiting_payment'
     and b.astrologer_id = p_astrologer and b.status = 'expired'
     and tstzrange(b.scheduled_at, b.ends_at, '[)') && tstzrange(p_starts_at, slot_end, '[)');

  begin
    insert into public.bookings (
      customer_id, astrologer_id, consultation_type_id, service_id, scheduled_at, ends_at,
      status, hold_expires_at, consultation_mode, price_snapshot, currency, commission_percent_snapshot,
      notes, subject)
    values (
      p_customer, p_astrologer, svc.consultation_type_id, svc.id, p_starts_at, slot_end,
      'payment_pending', now() + make_interval(mins => public.setting_num('reservation_minutes', 10)::int),
      svc.consultation_mode, svc.price, svc.currency,
      public.setting_num('consultation_commission_percent'), nullif(btrim(p_notes), ''), p_subject)
    returning * into created;
  exception when exclusion_violation then
    -- Someone else took it between the check above and this insert.
    raise exception 'SLOT_UNAVAILABLE';
  end;

  insert into public.payments (customer_id, astrologer_id, booking_id, amount, currency, payment_method, status)
  values (p_customer, p_astrologer, created.id, created.price_snapshot, created.currency, 'esewa', 'awaiting_payment');

  return created;
end;
$$;

revoke all on function public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Recording the proof (the 8b upload endpoint calls this)
-- ---------------------------------------------------------------------------
-- Proof must arrive while the hold is alive; once recorded, the hold freezes at
-- the consultation start so the slot stays held until staff review it.
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

  select * into b from public.bookings where id = pay.booking_id for update;
  if not found or b.status <> 'payment_pending' or b.hold_expires_at <= now() then
    raise exception 'RESERVATION_EXPIRED';
  end if;

  update public.payments
     set status = 'proof_submitted',
         proof_storage_path = p_proof_path,
         customer_reference = nullif(btrim(p_reference), '')
   where id = p_payment
  returning * into pay;

  update public.bookings set hold_expires_at = scheduled_at where id = b.id;

  return pay;
end;
$$;

revoke all on function public.submit_payment_proof(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_payment_proof(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Staff review: approve confirms, reject cancels (the 8c endpoint calls these)
-- ---------------------------------------------------------------------------
-- The reviewer is identified by user id and their role is read from the database,
-- never from a token claim. Finance, admin and super_admin may review -- but
-- never a payment for their own booking, as customer or as practitioner.
create or replace function public.payment_reviewer_ok(p_reviewer uuid, p_booking public.bookings)
returns void
language plpgsql
as $$
declare
  reviewer_role text;
  cust_user     uuid;
  astro_user    uuid;
begin
  select role into reviewer_role from public.users where id = p_reviewer;
  if reviewer_role is null or reviewer_role not in ('finance', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
  select user_id into cust_user from public.customers where id = p_booking.customer_id;
  select user_id into astro_user from public.astrologers where id = p_booking.astrologer_id;
  if p_reviewer = cust_user or p_reviewer = astro_user then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

revoke all on function public.payment_reviewer_ok(uuid, public.bookings) from public, anon, authenticated;
grant execute on function public.payment_reviewer_ok(uuid, public.bookings) to service_role;

create or replace function public.approve_payment(p_payment uuid, p_reviewer uuid)
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
  if pay.status = 'awaiting_payment' then raise exception 'PROOF_NOT_SUBMITTED'; end if;
  if pay.status <> 'proof_submitted' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;

  select * into b from public.bookings where id = pay.booking_id for update;
  if not found then raise exception 'RESERVATION_EXPIRED'; end if;
  perform public.payment_reviewer_ok(p_reviewer, b);
  if b.status <> 'payment_pending' or b.hold_expires_at <= now() then
    raise exception 'RESERVATION_EXPIRED';
  end if;

  update public.payments
     set status = 'paid', reviewed_by = p_reviewer, reviewed_at = now(), paid_at = now()
   where id = p_payment
  returning * into pay;

  update public.bookings set status = 'confirmed' where id = b.id;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, metadata)
  values (p_reviewer, (select role from public.users where id = p_reviewer),
          'payment.approved', 'payment', p_payment,
          jsonb_build_object('status', 'proof_submitted'), jsonb_build_object('status', 'paid'),
          jsonb_build_object('booking_id', b.id));

  return pay;
end;
$$;

revoke all on function public.approve_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_payment(uuid, uuid) to service_role;

create or replace function public.reject_payment(p_payment uuid, p_reviewer uuid, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  b   public.bookings;
begin
  if nullif(btrim(p_reason), '') is null then raise exception 'INVALID_INPUT'; end if;

  select * into pay from public.payments where id = p_payment for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if pay.status = 'awaiting_payment' then raise exception 'PROOF_NOT_SUBMITTED'; end if;
  if pay.status <> 'proof_submitted' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;

  select * into b from public.bookings where id = pay.booking_id for update;
  if not found then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  perform public.payment_reviewer_ok(p_reviewer, b);
  -- Rejecting needs no live hold: it cancels the booking and frees the slot however
  -- late the review lands. But the booking must still be the open hold.
  if b.status <> 'payment_pending' then
    raise exception 'PAYMENT_ALREADY_PROCESSED';
  end if;

  update public.payments
     set status = 'rejected', reviewed_by = p_reviewer, reviewed_at = now(),
         rejection_reason = btrim(p_reason)
   where id = p_payment
  returning * into pay;

  -- 'cancelled' holds no time (bookings_no_overlap, available_slots), so the slot
  -- is free the moment this transaction commits.
  update public.bookings set status = 'cancelled' where id = b.id;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason, metadata)
  values (p_reviewer, (select role from public.users where id = p_reviewer),
          'payment.rejected', 'payment', p_payment,
          jsonb_build_object('status', 'proof_submitted'), jsonb_build_object('status', 'rejected'),
          btrim(p_reason), jsonb_build_object('booking_id', b.id));

  return pay;
end;
$$;

revoke all on function public.reject_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_payment(uuid, uuid, text) to service_role;

insert into public.schema_migrations (version, name) values ('0018', 'payment_rules');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0018_payment_rules_test.sql -- it asserts and rolls back.
-- The browser still has no INSERT/UPDATE/DELETE policy on payments:
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'payments';
