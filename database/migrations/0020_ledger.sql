-- 0020_ledger.sql
-- Step 9, Checkpoint 9a of docs/IMPLEMENTATION-PLAN.md (plan Step 13) -- the
-- financial ledger.
--
-- Money received, the platform's cut, what the practitioner is owed and what was
-- actually paid out are four distinct numbers (AD-7), so they live as separate
-- append-only rows, never netted into a balance column:
--
--   * `ledger_entries`: one row per money fact. Approval writes the triple
--     (platform_gross, platform_commission, jyotish_payable) in 9b; payouts and
--     refunds add theirs in Steps 14-15. Corrections are reversal rows carrying
--     `reversal_of_entry_id`; originals are never edited or deleted.
--   * `jyotish_balances`: earned, paid out and payable per practitioner, derived
--     from the rows -- including reversals, which count toward whatever type of
--     entry they reverse.
--
-- No browser INSERT/UPDATE/DELETE policy on the table: writes come only from
-- security definer functions (service role). Reads are finance-and-above; the
-- practitioner-facing number arrives with payouts (Step 15), not here.
--
-- Run after 0019_payment_proofs.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------
create table if not exists public.ledger_entries (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid references public.bookings(id) on delete set null,
  payment_id           uuid references public.payments(id) on delete set null,
  astrologer_id        uuid references public.astrologers(id) on delete set null,
  entry_type           text not null check (entry_type in (
    'platform_gross','platform_commission','jyotish_payable','payout','refund_reversal')),
  amount               numeric(12,2) not null check (amount > 0),
  currency             text not null default 'NPR',
  direction            text not null check (direction in ('credit','debit')),
  reversal_of_entry_id uuid references public.ledger_entries(id),
  commission_percent   numeric(5,2),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);

comment on table public.ledger_entries is
  'Append-only money facts. A reversal references its original; no row is ever updated or deleted.';

alter table public.ledger_entries enable row level security;

create index if not exists idx_ledger_booking   on public.ledger_entries (booking_id);
create index if not exists idx_ledger_payment   on public.ledger_entries (payment_id);
create index if not exists idx_ledger_astrologer on public.ledger_entries (astrologer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Append-only, for every role including the service role
-- ---------------------------------------------------------------------------
-- No UPDATE/DELETE policy (blocks PostgREST with a user JWT) plus a trigger
-- that raises (also blocks the service role and any function). Removing history
-- requires dropping this trigger -- a loud, deliberate act, like audit_log.
create or replace function public.ledger_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ledger_entries is append-only: % is not permitted', lower(tg_op)
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_ledger_immutable on public.ledger_entries;
create trigger trg_ledger_immutable
before update or delete on public.ledger_entries
for each row execute function public.ledger_is_append_only();

-- ---------------------------------------------------------------------------
-- 3. Who can read (nobody writes through RLS)
-- ---------------------------------------------------------------------------
-- Entries quote amounts per practitioner, so this is finance-and-above. There is
-- deliberately NO insert policy: writes come from security definer functions,
-- never straight from a browser.
drop policy if exists "finance and admins can read the ledger" on public.ledger_entries;
create policy "finance and admins can read the ledger"
on public.ledger_entries
for select using (public.has_role('finance','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 4. Balances, derived
-- ---------------------------------------------------------------------------
-- earned: what jyotish_payable rows (and their reversals) say is owed, all time.
-- paid: what payout rows (and their reversals) say was actually sent.
-- payable: the difference -- the number a payout request is validated against.
create or replace view public.jyotish_balances as
select
  a.id as astrologer_id,
  coalesce(sum(e.signed), 0) as earned,
  coalesce(sum(p.signed), 0) as paid,
  coalesce(sum(e.signed), 0) - coalesce(sum(p.signed), 0) as payable
from public.astrologers a
left join (
  select l.astrologer_id,
         case when l.direction = 'credit' then l.amount else -l.amount end as signed
    from public.ledger_entries l
    left join public.ledger_entries o on o.id = l.reversal_of_entry_id
   where l.entry_type = 'jyotish_payable'
      or o.entry_type = 'jyotish_payable'
) e on e.astrologer_id = a.id
left join (
  select l.astrologer_id,
         case when l.direction = 'debit' then l.amount else -l.amount end as signed
    from public.ledger_entries l
    left join public.ledger_entries o on o.id = l.reversal_of_entry_id
   where l.entry_type = 'payout'
      or o.entry_type = 'payout'
) p on p.astrologer_id = a.id
group by a.id;

insert into public.schema_migrations (version, name) values ('0020', 'ledger');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0020_ledger_test.sql -- it asserts and rolls back.
--
--   select astrologer_id, earned, paid, payable from public.jyotish_balances;
