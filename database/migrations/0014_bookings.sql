-- 0014_bookings.sql
-- Step 7 of docs/IMPLEMENTATION-PLAN.md -- availability, free slots, bookings that
-- cannot collide.
--
-- Today a booking is a browser-made id ("KP-ON-12345") plus an email; nothing knows
-- the practitioner's hours, and `bookings` lets any signed-in customer insert their own
-- row with any status ("customers can create own bookings" checks only the owner).
--
--   * `availability`: weekly hours, set by the practitioner (or an admin).
--   * `available_slots(astrologer, service, from, to)`: free start times, computed in
--     the database from the hours, the service's duration and the bookings already
--     holding time. Exposes times only, never who booked.
--   * `bookings`: a booking is created only by `create_booking()` (server, service
--     role). It decides everything from the database -- time slot validity, end time,
--     price, currency, mode, commission -- and starts as `payment_pending` with a hold
--     that expires after `reservation_minutes` (AD-18: the hold is the booking; no
--     separate reservations table).
--   * An exclusion constraint makes two live bookings of one practitioner overlapping
--     in time impossible, whatever writes them and however concurrently.
--   * No browser insert or update on bookings any more.
--
-- Run after 0013_services.sql.

begin;

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Availability (weekly hours, practitioner's local time)
-- ---------------------------------------------------------------------------
alter table public.availability
  drop constraint if exists availability_hours_check,
  add  constraint availability_hours_check check (start_time < end_time),
  -- ponytail: one time zone; allow others (and check them against pg_timezone_names)
  -- when a practitioner outside Nepal joins.
  drop constraint if exists availability_timezone_check,
  add  constraint availability_timezone_check check (timezone = 'Asia/Kathmandu');

drop policy if exists "availability of active practitioners is public" on public.availability;
create policy "availability of active practitioners is public"
on public.availability for select
using (is_active and public.is_active_astrologer(astrologer_id));

drop policy if exists "practitioners and staff read availability" on public.availability;
create policy "practitioners and staff read availability"
on public.availability for select to authenticated
using (astrologer_id in (select id from public.astrologers where user_id = auth.uid()) or public.is_staff());

-- Hours are the practitioner's own time; they set them. Admins can fix them.
drop policy if exists "practitioners manage own availability" on public.availability;
create policy "practitioners manage own availability"
on public.availability for all to authenticated
using (astrologer_id in (select id from public.astrologers where user_id = auth.uid()) or public.has_role('admin','super_admin'))
with check (astrologer_id in (select id from public.astrologers where user_id = auth.uid()) or public.has_role('admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 2. Bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists service_id                  uuid references public.services(id),
  add column if not exists ends_at                     timestamptz,
  add column if not exists hold_expires_at             timestamptz,
  add column if not exists consultation_mode           text,
  add column if not exists price_snapshot              numeric(12,2),
  add column if not exists currency                    text,
  add column if not exists commission_percent_snapshot numeric(5,2);

-- 'pending' and 'rescheduled' are the old values, kept so old rows (if any) stay valid;
-- nothing writes them any more and they hold no time.
alter table public.bookings
  drop constraint if exists bookings_status_check,
  add  constraint bookings_status_check check (status in (
    'payment_pending','confirmed','in_progress','completed','cancelled','no_show','expired',
    'pending','rescheduled')),
  alter column status set default 'payment_pending',
  -- A booking that holds time has a real, non-empty interval (an open-ended range
  -- would block the practitioner forever).
  drop constraint if exists bookings_time_check,
  add  constraint bookings_time_check check (
    status not in ('payment_pending','confirmed','in_progress','completed')
    or (scheduled_at is not null and ends_at > scheduled_at)),
  drop constraint if exists bookings_hold_check,
  add  constraint bookings_hold_check check (status <> 'payment_pending' or hold_expires_at is not null),
  -- The double-booking rule. A payment_pending booking whose hold has expired still
  -- counts here; create_booking() marks it `expired` before taking the slot.
  drop constraint if exists bookings_no_overlap,
  add  constraint bookings_no_overlap exclude using gist (
    astrologer_id with =,
    tstzrange(scheduled_at, ends_at, '[)') with &&
  ) where (status in ('payment_pending','confirmed','in_progress','completed'));

drop policy if exists "customers can create own bookings" on public.bookings;

drop policy if exists "staff read bookings" on public.bookings;
create policy "staff read bookings"
on public.bookings for select to authenticated
using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 3. Free slots
-- ---------------------------------------------------------------------------
-- Slots start at each availability window's start and step by the service's
-- duration. Only slots that start after the hold window are offered: a hold must not
-- outlive the start of what it holds. At most 31 days per call.
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

-- Public: visitors pick a time before signing in. Returns times only.
revoke all on function public.available_slots(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function public.available_slots(uuid, uuid, date, date) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Creating a booking (server only)
-- ---------------------------------------------------------------------------
-- The caller (a Next.js route, service role) passes who and what; everything else is
-- decided here. Errors are raised with a code in the message for the server to map:
-- CUSTOMER_NOT_ACTIVE, SELF_BOOKING, SERVICE_NOT_BOOKABLE, SLOT_UNAVAILABLE, TOO_MANY_HOLDS.
create or replace function public.create_booking(p_customer uuid, p_astrologer uuid, p_service uuid, p_starts_at timestamptz)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  cust    public.customers;
  svc     public.services;
  slot_end timestamptz;
  created public.bookings;
begin
  -- Locking the customer row serialises one customer's bookings, so the hold limit
  -- below cannot be raced.
  select * into cust from public.customers where id = p_customer for update;
  if not found or cust.status <> 'active' then
    raise exception 'CUSTOMER_NOT_ACTIVE';
  end if;
  if exists (select 1 from public.astrologers where id = p_astrologer and user_id = cust.user_id) then
    raise exception 'SELF_BOOKING';
  end if;

  select * into svc from public.services where id = p_service;
  if not found or svc.status <> 'active' or svc.duration_minutes is null
     or (svc.astrologer_id is not null and svc.astrologer_id <> p_astrologer)
     or not public.is_active_astrologer(p_astrologer) then
    raise exception 'SERVICE_NOT_BOOKABLE';
  end if;

  -- Must be one of the offered start times (inside the hours, on the grid, in the
  -- future, not taken).
  if not exists (
    select 1 from public.available_slots(p_astrologer, p_service,
      (p_starts_at at time zone 'Asia/Kathmandu')::date, (p_starts_at at time zone 'Asia/Kathmandu')::date) s
    where s.starts_at = p_starts_at) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  -- ponytail: fixed limit against one customer holding many slots; make it a
  -- platform setting if it ever needs tuning.
  if (select count(*) from public.bookings
       where customer_id = p_customer and status = 'payment_pending' and hold_expires_at > now()) >= 2 then
    raise exception 'TOO_MANY_HOLDS';
  end if;

  slot_end := p_starts_at + svc.duration_minutes * interval '1 minute';

  -- Expired holds still occupy the slot in the exclusion constraint; release them.
  update public.bookings set status = 'expired'
   where astrologer_id = p_astrologer and status = 'payment_pending' and hold_expires_at <= now()
     and tstzrange(scheduled_at, ends_at, '[)') && tstzrange(p_starts_at, slot_end, '[)');

  begin
    insert into public.bookings (
      customer_id, astrologer_id, consultation_type_id, service_id, scheduled_at, ends_at,
      status, hold_expires_at, consultation_mode, price_snapshot, currency, commission_percent_snapshot)
    values (
      p_customer, p_astrologer, svc.consultation_type_id, svc.id, p_starts_at, slot_end,
      'payment_pending', now() + make_interval(mins => public.setting_num('reservation_minutes', 10)::int),
      svc.consultation_mode, svc.price, svc.currency,
      public.setting_num('consultation_commission_percent'))
    returning * into created;
  exception when exclusion_violation then
    -- Someone else took it between the check above and this insert.
    raise exception 'SLOT_UNAVAILABLE';
  end;

  return created;
end;
$$;

revoke all on function public.create_booking(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, timestamptz) to service_role;

insert into public.schema_migrations (version, name) values ('0014', 'bookings');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0014_bookings_test.sql -- it asserts and rolls back.
--
--   select * from public.available_slots('<astrologer>', '<service>', current_date, current_date + 7);
