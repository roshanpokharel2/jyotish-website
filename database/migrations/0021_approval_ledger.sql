-- 0021_approval_ledger.sql
-- Step 9, Checkpoint 9b of docs/IMPLEMENTATION-PLAN.md (plan Steps 12-13) --
-- approving a payment writes its ledger entries.
--
-- approve_payment() (0018) confirmed the booking with no money facts. Now the
-- same transaction also inserts the triple from the booking's snapshots (AD-8):
-- platform_gross (the price), platform_commission (price x rate) and
-- jyotish_payable (the rest), all credit. Either everything commits -- paid
-- payment, confirmed booking, three rows, audit entry -- or nothing does, so a
-- paid payment with no ledger row is impossible. The double-approval guard runs
-- first, so a second call still writes nothing.
--
-- Run after 0020_ledger.sql.

begin;

create or replace function public.approve_payment(p_payment uuid, p_reviewer uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  b   public.bookings;
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

  update public.payments
     set status = 'paid', reviewed_by = p_reviewer, reviewed_at = now(), paid_at = now()
   where id = p_payment
  returning * into pay;

  update public.bookings set status = 'confirmed' where id = b.id;

  -- The money facts, from the snapshots -- never from a request. Rounding stays
  -- with the platform: the practitioner's payable is what is left.
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

  return pay;
end;
$$;

-- Grants survive CREATE OR REPLACE, but restating them keeps the function
-- server-only even if it is ever dropped and recreated.
revoke all on function public.approve_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_payment(uuid, uuid) to service_role;

insert into public.schema_migrations (version, name) values ('0021', 'approval_ledger');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0021_approval_ledger_test.sql -- it asserts and rolls back.
