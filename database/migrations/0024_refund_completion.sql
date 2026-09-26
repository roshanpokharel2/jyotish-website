-- 0024_refund_completion.sql
-- Step 10, Checkpoint 10b of docs/IMPLEMENTATION-PLAN.md (plan Step 14) --
-- completing a refund writes its reversal ledger entries.
--
-- The human moves the money first (eSewa transfer); these functions record it:
-- mark_refund_processing() (approved -> processing, "transfer in flight") and
-- complete_refund() (approved|processing -> completed). Completion is the money
-- gate and runs in one transaction:
--
--   * the transfer's external reference is required -- a completed row without
--     one is refused by the status guard (0023);
--   * the original triple must be present and complete, else LEDGER_MISMATCH
--     (approvals predate the ledger writes otherwise);
--   * one refund_reversal row per original, pro-rata to the refund amount with
--     the rounding kept by the platform, each pointing at its original;
--   * a refund that makes the customer whole flips the payment to refunded.
--
-- A second completion is refused before anything is written, so it can never
-- duplicate the reversals.
--
-- Run after 0023_refunds.sql.

begin;

create or replace function public.mark_refund_processing(p_refund uuid, p_actor uuid)
returns public.refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.refunds;
begin
  select * into r from public.refunds where id = p_refund for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.status <> 'approved' then raise exception 'REFUND_ALREADY_PROCESSED'; end if;
  perform public.refund_actor_ok(p_actor, r.payment_id);

  update public.refunds set status = 'processing' where id = p_refund returning * into r;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (p_actor, (select role from public.users where id = p_actor),
          'refund.processing', 'refund', p_refund,
          jsonb_build_object('status', 'approved'), jsonb_build_object('status', 'processing'));

  return r;
end;
$$;

revoke all on function public.mark_refund_processing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_refund_processing(uuid, uuid) to service_role;

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

  -- The triple the approval wrote; without all three there is nothing correct
  -- to reverse.
  if (select count(*) from public.ledger_entries
       where payment_id = r.payment_id and reversal_of_entry_id is null
         and entry_type in ('platform_gross', 'platform_commission', 'jyotish_payable')) <> 3 then
    raise exception 'LEDGER_MISMATCH';
  end if;

  -- Pro-rata to the refund: the gross comes back whole, the split follows the
  -- booking's rate, the payable is what is left.
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

  -- Whole again: completed refunds cover everything paid.
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

  return r;
end;
$$;

revoke all on function public.complete_refund(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_refund(uuid, uuid, text, text, text) to service_role;

insert into public.schema_migrations (version, name) values ('0024', 'refund_completion');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0024_refund_completion_test.sql -- it asserts and rolls back.
