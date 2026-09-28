-- 0026_payout_paid.sql
-- Step 11, Checkpoint 11b of docs/IMPLEMENTATION-PLAN.md (plan Step 15) --
-- paying out writes its ledger entry.
--
-- The human moves the money first; these functions record it:
-- mark_payout_processing() (approved, or a retry after failed, -> processing),
-- mark_payout_paid() (processing -> paid) and mark_payout_failed()
-- (processing -> failed, with a note). Paid runs in one transaction:
--
--   * the transfer's external reference is required -- a paid row without one
--     is refused by the status guard (0025);
--   * the amount is re-validated against the live payable (a refund may have
--     landed since approval), else PAYOUT_TOO_LARGE;
--   * one payout ledger entry, debit, pointing back at the payout row.
--
-- A second paid call is refused before anything is written, so the entry can
-- never duplicate. Failed releases its reservation (0025 trigger); cancelled
-- stays the way out for anything unpaid.
--
-- Run after 0025_payouts.sql.

begin;

create or replace function public.mark_payout_processing(p_payout uuid, p_actor uuid)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  p    public.payouts;
  prev text;
begin
  select * into p from public.payouts where id = p_payout for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.status not in ('approved', 'failed') then raise exception 'PAYOUT_ALREADY_PROCESSED'; end if;
  perform public.payout_staff_ok(p_actor);
  prev := p.status;

  update public.payouts set status = 'processing' where id = p_payout returning * into p;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (p_actor, (select role from public.users where id = p_actor),
          'payout.processing', 'payout', p_payout,
          jsonb_build_object('status', prev), jsonb_build_object('status', 'processing'));

  return p;
end;
$$;

revoke all on function public.mark_payout_processing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_payout_processing(uuid, uuid) to service_role;

create or replace function public.mark_payout_paid(
  p_payout uuid, p_actor uuid, p_external_reference text, p_notes text default null)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  p   public.payouts;
  bal public.jyotish_balances;
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

  -- Fresh balance: a refund may have eaten the payable since approval.
  select * into bal from public.jyotish_balances where astrologer_id = p.astrologer_id;
  if not found or p.amount > bal.payable then
    raise exception 'PAYOUT_TOO_LARGE';
  end if;

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

  return p;
end;
$$;

revoke all on function public.mark_payout_paid(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_payout_paid(uuid, uuid, text, text) to service_role;

create or replace function public.mark_payout_failed(p_payout uuid, p_actor uuid, p_note text)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payouts;
begin
  if nullif(btrim(p_note), '') is null or char_length(p_note) > 2000 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into p from public.payouts where id = p_payout for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.status <> 'processing' then raise exception 'PAYOUT_ALREADY_PROCESSED'; end if;
  perform public.payout_staff_ok(p_actor);

  update public.payouts set status = 'failed', notes = btrim(p_note)
   where id = p_payout returning * into p;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason)
  values (p_actor, (select role from public.users where id = p_actor),
          'payout.failed', 'payout', p_payout,
          jsonb_build_object('status', 'processing'), jsonb_build_object('status', 'failed'),
          btrim(p_note));

  return p;
end;
$$;

revoke all on function public.mark_payout_failed(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mark_payout_failed(uuid, uuid, text) to service_role;

insert into public.schema_migrations (version, name) values ('0026', 'payout_paid');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0026_payout_paid_test.sql -- it asserts and rolls back.
