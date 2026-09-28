-- 0027_balances_fix.sql
-- Step 11 follow-up of docs/IMPLEMENTATION-PLAN.md.
--
-- jyotish_balances (0020) joined two per-entry row sets and summed after the
-- join: with two payable rows and one payout row the join fans out to two rows
-- and `paid` counts twice. The 0026 test caught it (payable read 1,400 for
-- 3,400 earned and 1,000 paid). Fix: aggregate each side per practitioner
-- before joining, so every join sees at most one row per side.
--
-- Run after 0026_payout_paid.sql.

begin;

create or replace view public.jyotish_balances as
select
  a.id as astrologer_id,
  coalesce(e.total, 0) as earned,
  coalesce(p.total, 0) as paid,
  coalesce(e.total, 0) - coalesce(p.total, 0) as payable
from public.astrologers a
left join (
  select l.astrologer_id, sum(case when l.direction = 'credit' then l.amount else -l.amount end) as total
    from public.ledger_entries l
    left join public.ledger_entries o on o.id = l.reversal_of_entry_id
   where l.entry_type = 'jyotish_payable'
      or o.entry_type = 'jyotish_payable'
   group by l.astrologer_id
) e on e.astrologer_id = a.id
left join (
  select l.astrologer_id, sum(case when l.direction = 'debit' then l.amount else -l.amount end) as total
    from public.ledger_entries l
    left join public.ledger_entries o on o.id = l.reversal_of_entry_id
   where l.entry_type = 'payout'
      or o.entry_type = 'payout'
   group by l.astrologer_id
) p on p.astrologer_id = a.id
group by a.id, e.total, p.total;

insert into public.schema_migrations (version, name) values ('0027', 'balances_fix');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0026_payout_paid_test.sql -- §5 (two payables, one payout)
-- fails on 0026 and passes on 0027 -- then the whole database/tests directory.
