-- 0001_baseline_fixes.sql
-- Step 2 of docs/IMPLEMENTATION-PLAN.md
--
-- Repairs the existing schema so a fresh Supabase project builds cleanly and so the
-- tables the marketplace is about to use carry updated_at and the indexes their
-- queries need. Additive and re-runnable.
--
-- Run order: database/schema.sql, then this file.

begin;

-- ---------------------------------------------------------------------------
-- 1. Remove the phantom seed astrologer
-- ---------------------------------------------------------------------------
-- schema.sql used to insert an astrologer with user_id '00000000-…', which cannot
-- satisfy `references public.users(id)` -> `references auth.users(id)`. The insert
-- always failed and aborted the tail of the script. The seed is gone from schema.sql;
-- this clears it from any database where it was forced in by hand.

delete from public.astrologers
where user_id = '00000000-0000-0000-0000-000000000000'::uuid;

drop function if exists public.seed_initial_astrologer();

-- ---------------------------------------------------------------------------
-- 2. updated_at on the tables the marketplace will mutate
-- ---------------------------------------------------------------------------
-- payments, notifications and availability are all written repeatedly once manual
-- verification exists (proof submitted -> under review -> paid). Without updated_at
-- there is no cheap way to see when a row last changed.

alter table public.payments      add column if not exists updated_at timestamptz not null default now();
alter table public.notifications add column if not exists updated_at timestamptz not null default now();
alter table public.availability  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists trg_availability_updated_at on public.availability;
create trigger trg_availability_updated_at
before update on public.availability
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Indexes for queries the next steps introduce
-- ---------------------------------------------------------------------------

-- Super Admin payment verification queue: filter by status, newest first (Step 12).
create index if not exists idx_payments_status_created
on public.payments (status, created_at desc);

-- "Which payment belongs to this booking / consultation" lookups.
create index if not exists idx_payments_booking on public.payments (booking_id);
create index if not exists idx_payments_customer on public.payments (customer_id, created_at desc);

-- Jyotish calendar and slot-conflict checks (Steps 8-10).
create index if not exists idx_bookings_astrologer_scheduled
on public.bookings (astrologer_id, scheduled_at);

create index if not exists idx_bookings_status on public.bookings (status, scheduled_at);

-- Session lookup from its booking.
create index if not exists idx_consultations_booking on public.consultations (booking_id);

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Expect 0 rows:
--   select * from public.astrologers where user_id = '00000000-0000-0000-0000-000000000000';
-- Expect 3 rows:
--   select tgname from pg_trigger
--    where tgname in ('trg_payments_updated_at','trg_notifications_updated_at','trg_availability_updated_at');
-- Expect 6 rows:
--   select indexname from pg_indexes
--    where indexname in ('idx_payments_status_created','idx_payments_booking','idx_payments_customer',
--                        'idx_bookings_astrologer_scheduled','idx_bookings_status','idx_consultations_booking');
