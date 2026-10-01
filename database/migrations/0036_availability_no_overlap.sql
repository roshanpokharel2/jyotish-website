-- 0036_availability_no_overlap.sql
-- Step 8 of docs/IMPLEMENTATION-PLAN.md (build Checkpoint H1) -- weekly hours that
-- cannot overlap.
--
-- Practitioners are about to set their own weekly hours in the browser (H2). Nothing
-- stopped two active windows on one weekday from overlapping (09:00-12:00 plus
-- 10:00-11:00). available_slots() steps from each window's start, so the calendar
-- would offer staggered, overlapping start times. bookings_no_overlap (0014) still
-- prevented a double booking: confusing, not unsafe.
--   * An exclusion constraint: no two active windows of one practitioner overlap on
--     the same weekday. Touching windows (09:00-12:00, 12:00-15:00) are allowed.
--     Inactive windows are not checked.
--
-- Before applying to a database with hours in it, find overlaps (must return 0 rows):
--   select a.astrologer_id, a.day_of_week, a.start_time, a.end_time, b.start_time, b.end_time
--   from public.availability a join public.availability b
--     on a.astrologer_id = b.astrologer_id and a.day_of_week = b.day_of_week and a.id < b.id
--    and a.is_active and b.is_active and a.start_time < b.end_time and b.start_time < a.end_time;
--
-- Run after 0035_availability_exceptions.sql.

begin;

-- btree_gist (0014) supplies the = operators for uuid and integer.
alter table public.availability
  drop constraint if exists availability_no_overlap,
  add  constraint availability_no_overlap exclude using gist (
    astrologer_id with =,
    day_of_week with =,
    tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time, '[)') with &&
  ) where (is_active);

insert into public.schema_migrations (version, name) values ('0036', 'availability_no_overlap');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0036_availability_no_overlap_test.sql, then 0014 and 0035 --
-- all assert and roll back.
