-- 0035_availability_exceptions.sql
-- Step 8 of docs/IMPLEMENTATION-PLAN.md (build Checkpoint E1) -- days off.
--
-- Weekly hours (0014) could not be switched off for a date: a holiday still offered
-- every slot.
--   * `availability_exceptions`: whole days (Kathmandu dates, both ends included) a
--     practitioner does not work. Managed like weekly hours: the practitioner's own
--     rows, or an admin. Not public -- the reason is private; available_slots() reads
--     the table as security definer.
--   * available_slots() skips those days. create_booking() only books what
--     available_slots() offers, so the server refuses them too.
--   * Bookings already on a blocked day are left alone: blocking stops new bookings
--     only. Moving or refunding one stays a staff action.
--
-- Run after 0034_question_payments.sql.

begin;

-- ponytail: whole days only; add start/end times when someone needs a half day off.
create table if not exists public.availability_exceptions (
  id            uuid primary key default gen_random_uuid(),
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  starts_on     date not null,
  ends_on       date not null,
  reason        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint availability_exceptions_range_check check (ends_on >= starts_on and ends_on - starts_on <= 366),
  constraint availability_exceptions_reason_check check (reason is null or char_length(reason) <= 200)
);

create index if not exists idx_availability_exceptions_astrologer
  on public.availability_exceptions (astrologer_id, starts_on, ends_on);

drop trigger if exists trg_availability_exceptions_updated_at on public.availability_exceptions;
create trigger trg_availability_exceptions_updated_at
before update on public.availability_exceptions
for each row execute function public.set_updated_at();

alter table public.availability_exceptions enable row level security;

drop policy if exists "practitioners and staff read days off" on public.availability_exceptions;
create policy "practitioners and staff read days off"
on public.availability_exceptions for select to authenticated
using (astrologer_id in (select id from public.astrologers where user_id = auth.uid()) or public.is_staff());

drop policy if exists "practitioners manage own days off" on public.availability_exceptions;
create policy "practitioners manage own days off"
on public.availability_exceptions for all to authenticated
using (astrologer_id in (select id from public.astrologers where user_id = auth.uid()) or public.has_role('admin','super_admin'))
with check (astrologer_id in (select id from public.astrologers where user_id = auth.uid()) or public.has_role('admin','super_admin'));

revoke all on public.availability_exceptions from anon;

-- ---------------------------------------------------------------------------
-- Free slots: as 0014, minus days off
-- ---------------------------------------------------------------------------
create or replace function public.available_slots(p_astrologer uuid, p_service uuid, p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with svc as (
    select s.duration_minutes * interval '1 minute' as len
    from public.services s
    where s.id = p_service
      and s.status = 'active'
      and s.duration_minutes is not null
      and (s.astrologer_id is null or s.astrologer_id = p_astrologer)
      and public.is_active_astrologer(p_astrologer)
      and p_to >= p_from and p_to - p_from <= 31
  ),
  candidates as (
    select distinct slot as starts_at, slot + svc.len as ends_at
    from svc
    cross join generate_series(
      greatest(p_from, (now() at time zone 'Asia/Kathmandu')::date)::timestamp,
      p_to::timestamp, interval '1 day') as day
    join public.availability a
      on a.astrologer_id = p_astrologer and a.is_active
     and a.day_of_week = extract(dow from day)::int
    cross join generate_series(
      (day::date + a.start_time) at time zone a.timezone,
      ((day::date + a.end_time) at time zone a.timezone) - svc.len,
      svc.len) as slot
    where not exists (
      select 1 from public.availability_exceptions x
      where x.astrologer_id = p_astrologer
        and day::date between x.starts_on and x.ends_on)
  )
  select c.starts_at, c.ends_at
  from candidates c
  where c.starts_at >= now() + make_interval(mins => public.setting_num('reservation_minutes', 10)::int)
    and not exists (
      select 1 from public.bookings b
      where b.astrologer_id = p_astrologer
        and tstzrange(b.scheduled_at, b.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)')
        and (b.status in ('confirmed','in_progress','completed')
             or (b.status = 'payment_pending' and b.hold_expires_at > now())))
  order by 1;
$$;

revoke all on function public.available_slots(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function public.available_slots(uuid, uuid, date, date) to anon, authenticated, service_role;

insert into public.schema_migrations (version, name) values ('0035', 'availability_exceptions');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0035_availability_exceptions_test.sql, then 0014-0018 (the
-- booking tests) -- all assert and roll back.
