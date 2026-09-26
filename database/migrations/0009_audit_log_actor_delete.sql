-- 0009_audit_log_actor_delete.sql
-- Phase 1, Checkpoint D of docs/IMPLEMENTATION-PLAN.md
--
-- 0004 declared audit_log.actor_user_id `references users on delete set null` AND made
-- audit_log append-only by trigger. Deleting a user who ever acted therefore makes
-- Postgres UPDATE their audit rows, the trigger refuses, and the whole delete fails.
-- Reproduced in dev before this migration:
--   delete from auth.users where id = <an admin who changed a role>
--   -> 42501 audit_log is append-only: update is not permitted
--
-- Fix: drop the foreign key. actor_user_id stays a plain uuid, so the log keeps WHO
-- acted even after their account is gone (with actor_role, the role they held then),
-- instead of losing it to null. The append-only trigger is unchanged -- no exception
-- is carved out of it.
--
-- Additive and re-runnable. Run after 0008_customer_status_guard.sql.

begin;

alter table public.audit_log drop constraint if exists audit_log_actor_user_id_fkey;

comment on column public.audit_log.actor_user_id is
  'auth.uid() of the actor, or null for the service role. Deliberately not a foreign key: '
  'the log is append-only and must outlive the account (0009).';

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0009_audit_log_actor_delete_test.sql
