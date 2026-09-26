-- 0028_notify.sql
-- Step 12, Checkpoint 12a of docs/IMPLEMENTATION-PLAN.md (plan Step 16) -- the
-- notification queue. Decisions enqueue; sending happens later.
--
-- Architecture §14/§38 is the point: approving a booking must not fail because
-- the email provider is down. So every money decision below writes its
-- notifications in its own transaction and returns -- delivery (the drain
-- route, 12b) reads the queue afterward. Two channels:
--
--   * notifications: in-app rows, as before, plus a data jsonb payload. read_at
--     is the real read state now; is_read stays as a synced mirror (nothing
--     reads it yet, but the column and index predate this).
--   * email_jobs: one row per email to send (kind + entity + recipient; the
--     drain renders the text at send time). Staff-only reads -- payloads name
--     people and money.
--   * notification_preferences: one kill-switch per user for email. Checked at
--     send time, not here, so muting never loses the in-app row.
--
-- Wired into: payment approved/rejected (customer + practitioner in-app,
-- customer email), refund completed (customer both), payout paid (practitioner
-- both). Staff need no notifications -- their queues are the UI.
--
-- Run after 0027_balances_fix.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Harden notifications, add preferences and the email queue
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists data    jsonb default '{}'::jsonb,
  add column if not exists read_at timestamptz;

-- Existing readers keep working: is_read mirrors read_at from here on.
update public.notifications set read_at = created_at where is_read and read_at is null;

create or replace function public.sync_notification_read()
returns trigger
language plpgsql
as $$
begin
  new.is_read := new.read_at is not null;
  return new;
end;
$$;

drop trigger if exists trg_notifications_read on public.notifications;
create trigger trg_notifications_read
before insert or update of read_at on public.notifications
for each row execute function public.sync_notification_read();

create table if not exists public.notification_preferences (
  user_id            uuid primary key references public.users(id) on delete cascade,
  email_transactional boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

-- Owners manage their own switch; nobody else sees it.
drop policy if exists "users manage own notification preferences" on public.notification_preferences;
create policy "users manage own notification preferences"
on public.notification_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.email_jobs (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in (
    'payment_approved','payment_rejected','refund_completed','payout_paid')),
  entity_id         uuid,
  recipient_user_id uuid references public.users(id) on delete set null,
  status            text not null default 'pending' check (status in (
    'pending','processing','sent','failed','cancelled')),
  attempts          integer not null default 0 check (attempts >= 0),
  last_error        text,
  scheduled_for     timestamptz not null default now(),
  sent_at           timestamptz,
  created_at        timestamptz not null default now()
);

comment on table public.email_jobs is
  'One row per email to send. The drain (12b) renders kind+entity into text at send time and owns every status change.';

alter table public.email_jobs enable row level security;

create index if not exists idx_email_jobs_due on public.email_jobs (status, scheduled_for)
  where status in ('pending', 'failed');

-- Payloads name people and money: finance and above only. No write policies at
-- all -- rows are written by security definer functions, status-changed by the
-- drain (service role).
drop policy if exists "finance and admins can read email jobs" on public.email_jobs;
create policy "finance and admins can read email jobs"
on public.email_jobs
for select using (public.has_role('finance','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 2. The single way to enqueue
-- ---------------------------------------------------------------------------
-- Both channels, one call, from inside the decision's transaction. In-app is
-- unconditional; email checks nothing here (preferences are read at send).
create or replace function public.notify_user(
  p_user uuid, p_type text, p_title text, p_body text,
  p_reference_type text default null, p_reference_id uuid default null,
  p_email_kind text default null, p_email_entity uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, reference_type, reference_id)
  values (p_user, p_type, p_title, p_body, p_reference_type, p_reference_id);

  if p_email_kind is not null then
    insert into public.email_jobs (kind, entity_id, recipient_user_id)
    values (p_email_kind, p_email_entity, p_user);
  end if;
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.notify_user(uuid, text, text, text, text, uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Wire the decisions (each function otherwise unchanged)
-- ---------------------------------------------------------------------------

-- approve_payment (0021): confirm lands in both inboxes, and the customer's
-- email queue.
create or replace function public.approve_payment(p_payment uuid, p_reviewer uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay        public.payments;
  b          public.bookings;
  cust_user  uuid;
  astro_user uuid;
  commission numeric(12,2);
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

  select c.user_id, a.user_id into cust_user, astro_user
    from public.customers c, public.astrologers a
   where c.id = b.customer_id and a.id = b.astrologer_id;

  update public.payments
     set status = 'paid', reviewed_by = p_reviewer, reviewed_at = now(), paid_at = now()
   where id = p_payment
  returning * into pay;

  update public.bookings set status = 'confirmed' where id = b.id;

  commission := round(b.price_snapshot * b.commission_percent_snapshot / 100, 2);
  insert into public.ledger_entries
    (booking_id, payment_id, astrologer_id, entry_type, amount, currency, direction, commission_percent)
  values
    (b.id, p_payment, b.astrologer_id, 'platform_gross', b.price_snapshot, b.currency, 'credit', b.commission_percent_snapshot),
    (b.id, p_payment, b.astrologer_id, 'platform_commission', commission, b.currency, 'credit', b.commission_percent_snapshot),
    (b.id, p_payment, b.astrologer_id, 'jyotish_payable', b.price_snapshot - commission, b.currency, 'credit', b.commission_percent_snapshot);

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, metadata)
  values (p_reviewer, (select role from public.users where id = p_reviewer),
          'payment.approved', 'payment', p_payment,
          jsonb_build_object('status', 'proof_submitted'), jsonb_build_object('status', 'paid'),
          jsonb_build_object('booking_id', b.id));

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

  return pay;
end;
$$;

revoke all on function public.approve_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_payment(uuid, uuid) to service_role;

-- reject_payment (0018): the customer hears why, in both channels.
create or replace function public.reject_payment(p_payment uuid, p_reviewer uuid, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay       public.payments;
  b         public.bookings;
  cust_user uuid;
begin
  if nullif(btrim(p_reason), '') is null then raise exception 'INVALID_INPUT'; end if;

  select * into pay from public.payments where id = p_payment for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if pay.status = 'awaiting_payment' then raise exception 'PROOF_NOT_SUBMITTED'; end if;
  if pay.status <> 'proof_submitted' then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;

  select * into b from public.bookings where id = pay.booking_id for update;
  if not found then raise exception 'PAYMENT_ALREADY_PROCESSED'; end if;
  perform public.payment_reviewer_ok(p_reviewer, b);
  if b.status <> 'payment_pending' then
    raise exception 'PAYMENT_ALREADY_PROCESSED';
  end if;

  update public.payments
     set status = 'rejected', reviewed_by = p_reviewer, reviewed_at = now(),
         rejection_reason = btrim(p_reason)
   where id = p_payment
  returning * into pay;

  update public.bookings set status = 'cancelled' where id = b.id;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason, metadata)
  values (p_reviewer, (select role from public.users where id = p_reviewer),
          'payment.rejected', 'payment', p_payment,
          jsonb_build_object('status', 'proof_submitted'), jsonb_build_object('status', 'rejected'),
          btrim(p_reason), jsonb_build_object('booking_id', b.id));

  select c.user_id into cust_user from public.customers c where c.id = b.customer_id;

  perform public.notify_user(cust_user, 'payment_rejected',
    'Payment not verified',
    'Your payment of ' || pay.currency || ' ' || pay.amount || ' could not be verified: ' || btrim(p_reason),
    'payment', p_payment, 'payment_rejected', p_payment);

  return pay;
end;
$$;

revoke all on function public.reject_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_payment(uuid, uuid, text) to service_role;

-- complete_refund (0024): the customer hears amount and reference, both channels.
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
  b         public.bookings;
  cust_user uuid;
  orig      public.ledger_entries;
  completed numeric(12,2);
  rev_gross numeric(12,2);
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
  select * into b from public.bookings where id = pay.booking_id;
  select c.user_id into cust_user from public.customers c where c.id = b.customer_id;

  if (select count(*) from public.ledger_entries
       where payment_id = r.payment_id and reversal_of_entry_id is null
         and entry_type in ('platform_gross', 'platform_commission', 'jyotish_payable')) <> 3 then
    raise exception 'LEDGER_MISMATCH';
  end if;

  rev_gross := r.amount;
  rev_comm  := round(r.amount * b.commission_percent_snapshot / 100, 2);
  for orig in
    select * from public.ledger_entries
     where payment_id = r.payment_id and reversal_of_entry_id is null
       and entry_type in ('platform_gross', 'platform_commission', 'jyotish_payable')
  loop
    insert into public.ledger_entries
      (booking_id, payment_id, astrologer_id, entry_type, amount, currency, direction,
       reversal_of_entry_id, commission_percent)
    values
      (b.id, r.payment_id, b.astrologer_id, 'refund_reversal',
       case orig.entry_type
         when 'platform_gross' then rev_gross
         when 'platform_commission' then rev_comm
         else r.amount - rev_comm end,
       r.currency,
       case orig.direction when 'credit' then 'debit' else 'credit' end,
       orig.id, b.commission_percent_snapshot);
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
  end if;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason, metadata)
  values (p_actor, (select role from public.users where id = p_actor),
          'refund.completed', 'refund', p_refund,
          jsonb_build_object('status', prev), jsonb_build_object('status', 'completed'),
          btrim(p_external_reference), jsonb_build_object('payment_id', r.payment_id, 'amount', r.amount));

  perform public.notify_user(cust_user, 'refund_completed',
    'Refund sent',
    r.currency || ' ' || r.amount || ' was refunded to your account (ref ' || btrim(p_external_reference) || ').',
    'refund', p_refund, 'refund_completed', p_refund);

  return r;
end;
$$;

revoke all on function public.complete_refund(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_refund(uuid, uuid, text, text, text) to service_role;

-- mark_payout_paid (0026): the practitioner hears amount and reference, both.
create or replace function public.mark_payout_paid(
  p_payout uuid, p_actor uuid, p_external_reference text, p_notes text default null)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  p         public.payouts;
  bal       public.jyotish_balances;
  astro_user uuid;
begin
  if nullif(btrim(p_external_reference), '') is null or char_length(p_external_reference) > 200 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_notes is not null and char_length(p_notes) > 2000 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into p from public.payouts where id = p_payout for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.status <> 'processing' then raise exception 'PAYOUT_ALREADY_PROCESSED'; end if;
  perform public.payout_staff_ok(p_actor);

  select * into bal from public.jyotish_balances where astrologer_id = p.astrologer_id;
  if not found or p.amount > bal.payable then
    raise exception 'PAYOUT_TOO_LARGE';
  end if;

  select user_id into astro_user from public.astrologers where id = p.astrologer_id;

  insert into public.ledger_entries
    (astrologer_id, entry_type, amount, currency, direction, metadata)
  values
    (p.astrologer_id, 'payout', p.amount, p.currency, 'debit',
     jsonb_build_object('payout_id', p_payout));

  update public.payouts
     set status = 'paid', processed_by = p_actor, processed_at = now(),
         external_reference = btrim(p_external_reference), notes = p_notes
   where id = p_payout
  returning * into p;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason, metadata)
  values (p_actor, (select role from public.users where id = p_actor),
          'payout.paid', 'payout', p_payout,
          jsonb_build_object('status', 'processing'), jsonb_build_object('status', 'paid'),
          btrim(p_external_reference), jsonb_build_object('amount', p.amount));

  if astro_user is not null then
    perform public.notify_user(astro_user, 'payout_paid',
      'Payout sent',
      p.currency || ' ' || p.amount || ' was paid out to your account (ref ' || btrim(p_external_reference) || ').',
      'payout', p_payout, 'payout_paid', p_payout);
  end if;

  return p;
end;
$$;

revoke all on function public.mark_payout_paid(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_payout_paid(uuid, uuid, text, text) to service_role;

insert into public.schema_migrations (version, name) values ('0028', 'notify');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0028_notify_test.sql -- it asserts and rolls back.
