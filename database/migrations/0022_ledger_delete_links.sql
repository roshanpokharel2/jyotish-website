-- 0022_ledger_delete_links.sql
-- Step 9 follow-up (before Step 10) of docs/IMPLEMENTATION-PLAN.md.
--
-- 0020 declared the ledger's booking/payment/astrologer links `on delete set
-- null` AND made ledger_entries append-only by trigger. Deleting an account
-- with any money history therefore makes Postgres UPDATE its ledger rows, the
-- trigger refuses, and the whole delete fails -- the end-to-end suite caught it:
-- removing a customer and a practitioner with a paid booking between them 500s.
-- (Same collision 0009 fixed for audit_log, same fix.)
--
-- Fix: drop the three foreign keys. The columns stay plain uuids, so a ledger
-- row keeps pointing at its booking, payment and practitioner forever -- better
-- than nulling the links -- instead of losing them. The append-only trigger is
-- unchanged: no exception is carved out of it. Writers (approve_payment, later
-- refunds/payouts) still link real rows; they lock them in the same
-- transaction, so integrity holds at write time.
--
-- reversal_of_entry_id keeps its key: ledger rows can never be deleted, so that
-- cascade never fires and the link genuinely cannot dangle.
--
-- Run after 0021_approval_ledger.sql.

begin;

alter table public.ledger_entries
  drop constraint if exists ledger_entries_booking_id_fkey,
  drop constraint if exists ledger_entries_payment_id_fkey,
  drop constraint if exists ledger_entries_astrologer_id_fkey;

comment on column public.ledger_entries.booking_id is
  'Deliberately not a foreign key: the ledger is append-only and must outlive the account (0009 set the precedent).';
comment on column public.ledger_entries.payment_id is
  'Deliberately not a foreign key: the ledger is append-only and must outlive the account (0009 set the precedent).';
comment on column public.ledger_entries.astrologer_id is
  'Deliberately not a foreign key: the ledger is append-only and must outlive the account (0009 set the precedent).';

insert into public.schema_migrations (version, name) values ('0022', 'ledger_delete_links');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0022_ledger_delete_links_test.sql -- it asserts and rolls back.
