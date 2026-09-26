-- 0025_payouts.sql
-- Step 11, Checkpoint 11a of docs/IMPLEMENTATION-PLAN.md (plan Step 15) --
-- practitioner payouts, request side.
--
-- The practitioner asks for money they earned; finance/admin/super_admin approve
-- and later move it (11b writes the payout ledger entry on paid). Flow:
-- pending -> approved -> (processing ->) paid, with cancellation before it is
-- paid and a processing retry after a failed transfer.
--
--   * The practitioner requests against their own row only, and only what the
--     balance says is payable -- validated server-side from jyotish_balances,
--     never from a dashboard number -- and at least minimum_payout.
--   * Open (pending/approved/processing) payouts never total more than the
--     current payable: a trigger, so concurrent requests cannot over-commit.
--     Failed and cancelled rows release their reservation.
--   * astrologer_id is a plain uuid (0009/0022 precedent): payout history must
--     outlive the account, and a foreign key would either null it or block the
--     delete.
--   * my_payout_balance() gives the caller their own numbers; the balances view
--     itself stays finance-and-above. No browser writes anywhere here.
--
-- Skipped: staff HTTP endpoints (Step 20 admin UI).
--
-- Run after 0024_refund_completion.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------
create table if not exists public.payouts (
  id                 uuid primary key default gen_random_uuid(),
  astrologer_id      uuid not null,
  amount             numeric(12,2) not null check (amount > 0),
  currency           text not null default 'NPR',
  status             text not null default 'pending' check (status in (
    'pending','approved','processing','paid','failed','cancelled')),
  external_reference text,
  processed_by       uuid references public.users(id) on delete set null,
  processed_at       timestamptz,
  notes              text check (notes is null or char_length(notes) <= 2000),
  created_at         timestamptz not null default now()
);

comment on table public.payouts is
  'Manual practitioner payouts. Paid writes a payout ledger entry (11b). astrologer_id is deliberately not a foreign key (0009/0022).';

alter table public.payouts enable row level security;

create index if not exists idx_payouts_astrologer on public.payouts (astrologer_id, created_at desc);
create index if not exists idx_payouts_status on public.payouts (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Only the legal steps, with evidence where a step needs it
-- ---------------------------------------------------------------------------
create or replace function public.guard_payout_status()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then raise exception 'INVALID_PAYOUT_STATUS'; end if;
    return new;
  end if;

  if old.status = new.status then return new; end if;

  ok := (old.status = 'pending'    and new.status in ('approved', 'cancelled'))
     or (old.status = 'approved'   and new.status in ('processing', 'cancelled'))
     or (old.status = 'processing' and new.status in ('paid', 'failed', 'cancelled'))
     or (old.status = 'failed'     and new.status in ('processing', 'cancelled'));
  if not ok then raise exception 'INVALID_PAYOUT_STATUS'; end if;

  if new.status in ('failed', 'cancelled') and nullif(btrim(new.notes), '') is null then
    raise exception 'INVALID_PAYOUT_STATUS';
  end if;
  if new.status = 'paid'
     and (new.processed_by is null or new.processed_at is null
          or nullif(btrim(new.external_reference), '') is null) then
    raise exception 'INVALID_PAYOUT_STATUS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payouts_status on public.payouts;
create trigger trg_payouts_status
before insert or update of status on public.payouts
for each row execute function public.guard_payout_status();

-- ---------------------------------------------------------------------------
-- 3. Never promise more than is payable
-- ---------------------------------------------------------------------------
-- Open rows reserve their amount against the live balance. Runs on insert and
-- on any amount/status rewrite, whatever the writer.
create or replace function public.guard_payout_amount()
returns trigger
language plpgsql
as $$
declare
  open_balance numeric(12,2);
  open_total   numeric(12,2);
  was_open     boolean;
  is_open      boolean;
begin
  was_open := tg_op <> 'INSERT' and old.status in ('pending', 'approved', 'processing');
  is_open  := new.status in ('pending', 'approved', 'processing');
  if tg_op = 'UPDATE' and new.amount = old.amount and was_open = is_open then
    return new;
  end if;

  select payable into open_balance from public.jyotish_balances where astrologer_id = new.astrologer_id;
  if not found then raise exception 'PAYOUT_NOT_ALLOWED'; end if;

  select coalesce(sum(p.amount), 0) into open_total from public.payouts p
   where p.astrologer_id = new.astrologer_id and p.status in ('pending', 'approved', 'processing')
     and (tg_op = 'INSERT' or p.id <> new.id);
  -- (NEW cannot appear inside a CASE expression in plpgsql, hence the branch.)
  if is_open then
    open_total := open_total + new.amount;
  end if;
  if open_total > open_balance then
    raise exception 'PAYOUT_TOO_LARGE';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payouts_amount on public.payouts;
create trigger trg_payouts_amount
before insert or update of amount, status on public.payouts
for each row execute function public.guard_payout_amount();

-- ---------------------------------------------------------------------------
-- 4. Who can read (nobody writes through RLS)
-- ---------------------------------------------------------------------------
-- The practitioner sees their own rows; finance and above see everything.
-- (The balance behind them comes from my_payout_balance() below.)
drop policy if exists "practitioners read own payouts" on public.payouts;
create policy "practitioners read own payouts"
on public.payouts
for select using (astrologer_id in (select id from public.astrologers where user_id = auth.uid()));

drop policy if exists "finance and admins can read payouts" on public.payouts;
create policy "finance and admins can read payouts"
on public.payouts
for select using (public.has_role('finance','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 5. The caller's own numbers, for the request flow
-- ---------------------------------------------------------------------------
-- Security definer so the practitioner reads only their own row: the balances
-- view underneath stays finance-and-above, and RLS on ledger_entries would
-- otherwise zero their numbers out.
create or replace function public.my_payout_balance()
returns public.jyotish_balances
language sql
stable
security definer
set search_path = public
as $$
  select b.* from public.jyotish_balances b
  join public.astrologers a on a.id = b.astrologer_id
  where a.user_id = auth.uid();
$$;

revoke all on function public.my_payout_balance() from public, anon;
grant execute on function public.my_payout_balance() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Request, approve, cancel (paid and its ledger entry land in 11b)
-- ---------------------------------------------------------------------------
create or replace function public.request_payout(p_astrologer uuid, p_amount numeric, p_actor uuid)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  bal     public.jyotish_balances;
  created public.payouts;
  floor   numeric(12,2);
begin
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_INPUT'; end if;
  -- Only the practitioner's own account requests for their own row. The actor
  -- is an argument (service-role callers have no auth.uid()), read from the
  -- database like every other reviewer check.
  if not exists (select 1 from public.astrologers where id = p_astrologer and user_id = p_actor) then
    raise exception 'FORBIDDEN';
  end if;

  select * into bal from public.jyotish_balances where astrologer_id = p_astrologer;
  if not found then raise exception 'PAYOUT_NOT_ALLOWED'; end if;
  floor := public.setting_num('minimum_payout', 1000);
  if p_amount < floor then raise exception 'PAYOUT_TOO_SMALL'; end if;
  if p_amount > bal.payable then raise exception 'PAYOUT_TOO_LARGE'; end if;

  insert into public.payouts (astrologer_id, amount, currency, status)
  values (p_astrologer, p_amount, 'NPR', 'pending')
  returning * into created;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id, new_state)
  values (p_actor, (select role from public.users where id = p_actor),
          'payout.requested', 'payout', created.id,
          jsonb_build_object('status', 'pending', 'amount', created.amount));

  return created;
end;
$$;

revoke all on function public.request_payout(uuid, numeric, uuid) from public, anon, authenticated;
grant execute on function public.request_payout(uuid, numeric, uuid) to service_role;

-- Staff side: the actor is identified by user id and read from the database.
create or replace function public.payout_staff_ok(p_actor uuid)
returns void
language plpgsql
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.users where id = p_actor;
  if actor_role is null or actor_role not in ('finance', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

revoke all on function public.payout_staff_ok(uuid) from public, anon, authenticated;
grant execute on function public.payout_staff_ok(uuid) to service_role;

create or replace function public.approve_payout(p_payout uuid, p_actor uuid)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.payouts;
begin
  select * into p from public.payouts where id = p_payout for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.status <> 'pending' then raise exception 'PAYOUT_ALREADY_PROCESSED'; end if;
  perform public.payout_staff_ok(p_actor);

  update public.payouts set status = 'approved' where id = p_payout returning * into p;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (p_actor, (select role from public.users where id = p_actor),
          'payout.approved', 'payout', p_payout,
          jsonb_build_object('status', 'pending'), jsonb_build_object('status', 'approved'));

  return p;
end;
$$;

revoke all on function public.approve_payout(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_payout(uuid, uuid) to service_role;

-- Cancellation before money moves: the practitioner for their own pending or
-- approved row, staff for anything unpaid. A note is required either way.
create or replace function public.cancel_payout(p_payout uuid, p_actor uuid, p_note text)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  p          public.payouts;
  prev       text;
  is_owner   boolean;
  actor_role text;
begin
  if nullif(btrim(p_note), '') is null or char_length(p_note) > 2000 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into p from public.payouts where id = p_payout for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p.status in ('paid', 'cancelled') then raise exception 'PAYOUT_ALREADY_PROCESSED'; end if;

  -- Owners cancel their own row before processing starts; staff cancel anything
  -- unpaid.
  select exists (select 1 from public.astrologers where id = p.astrologer_id and user_id = p_actor)
    into is_owner;
  select role into actor_role from public.users where id = p_actor;
  if actor_role not in ('finance', 'admin', 'super_admin')
     and (not is_owner or p.status not in ('pending', 'approved')) then
    raise exception 'FORBIDDEN';
  end if;
  prev := p.status;

  update public.payouts set status = 'cancelled', notes = btrim(p_note)
   where id = p_payout returning * into p;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason)
  values (p_actor, (select role from public.users where id = p_actor),
          'payout.cancelled', 'payout', p_payout,
          jsonb_build_object('status', prev), jsonb_build_object('status', 'cancelled'),
          btrim(p_note));

  return p;
end;
$$;

revoke all on function public.cancel_payout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_payout(uuid, uuid, text) to service_role;

insert into public.schema_migrations (version, name) values ('0025', 'payouts');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0025_payouts_test.sql -- it asserts and rolls back.
