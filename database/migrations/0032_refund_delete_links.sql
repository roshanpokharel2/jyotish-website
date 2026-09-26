-- 0032_refund_delete_links.sql
-- Step 16, Checkpoint 16a follow-up of docs/IMPLEMENTATION-PLAN.md.
--
-- refunds.payment_id was a foreign key, so deleting an account with refund
-- history makes Postgres restrict the cascading payments delete and the whole
-- user delete fails -- the end-to-end suite caught it again (same collision
-- 0009 fixed for audit_log and 0022 for ledger_entries, same fix).
--
-- The column stays a plain uuid: refund rows keep pointing at their payment
-- forever instead of blocking the delete. Writers (request_refund and friends)
-- lock the payment in the same transaction, so integrity holds at write time.
--
-- Run after 0031_knowledge.sql.
-- (No sequence gap: 0031 is knowledge; this amends 0023 the way 0022 amended
-- 0020.)

begin;

alter table public.refunds
  drop constraint if exists refunds_payment_id_fkey;

comment on column public.refunds.payment_id is
  'Deliberately not a foreign key: refund history must outlive the account (0009/0022).';

insert into public.schema_migrations (version, name) values ('0032', 'refund_delete_links');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0032_refund_delete_links_test.sql -- it asserts and rolls back.
