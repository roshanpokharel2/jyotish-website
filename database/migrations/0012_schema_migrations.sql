-- 0012_schema_migrations.sql
-- Phase 1, Checkpoint G of docs/IMPLEMENTATION-PLAN.md
--
-- Nothing recorded which migrations a database had. Files are "re-runnable", but not
-- safely in any order: 0006 and 0007 replace function bodies from earlier files, so
-- re-running an older file silently brings back the behaviour a later one fixed.
--
-- From this migration on, every migration records itself as its last statement,
-- inside its own transaction:
--
--   insert into public.schema_migrations (version, name) values ('NNNN', '<name>');
--
-- A second application therefore fails on the primary key and rolls back completely,
-- whether it comes from scripts/db.mjs or the SQL editor. scripts/db.mjs also refuses
-- it up front, refuses gaps, and refuses re-running 0001-0011.
--
-- 0001-0011 are NOT recorded: when and how each was applied to a given database is
-- not known, so no row is invented for them. The table only holds applications that
-- actually happened through it.
--
-- Run after 0011_storage_buckets.sql.

begin;

create table if not exists public.schema_migrations (
  version    text primary key check (version ~ '^[0-9]{4}$'),
  name       text not null,
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user
);

comment on table public.schema_migrations is
  'One row per migration applied from 0012 on, written by the migration itself. '
  '0001-0011 predate tracking and are deliberately absent.';

-- Internal bookkeeping: no API access at all.
alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0012', 'schema_migrations');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0012_schema_migrations_test.sql -- it asserts and rolls back.
--
--   select * from public.schema_migrations order by version;
--   node scripts/db.mjs --status
