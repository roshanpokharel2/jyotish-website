-- 0016_booking_subject.sql
-- Step 7, Checkpoint 7d of docs/IMPLEMENTATION-PLAN.md.
--
-- A consultation needs the birth details of the person it is about (name, date, time
-- and place of birth). Until now the practitioner got them in the formsubmit.co email
-- the browser sent. Practitioners cannot read customer profiles (RLS), and the person
-- may not be the account holder, so the details the customer entered are stored on the
-- booking as `subject`, in the same insert. The practitioner reads them through their
-- booking (existing policy); nobody else does.
--
-- The server route builds `subject` from a fixed list of validated fields; the
-- database only insists on a JSON object of bounded size.
--
-- Supersedes create_booking() from 0015.
--
-- Run after 0015_booking_notes.sql.

begin;

alter table public.bookings
  add column if not exists subject jsonb,
  drop constraint if exists bookings_subject_check,
  add  constraint bookings_subject_check check (jsonb_typeof(subject) = 'object' and pg_column_size(subject) <= 4096);

drop function if exists public.create_booking(uuid, uuid, uuid, timestamptz, text);

create or replace function public.create_booking(
  p_customer uuid, p_astrologer uuid, p_service uuid, p_starts_at timestamptz,
  p_notes text default null, p_subject jsonb default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  cust     public.customers;
  svc      public.services;
  slot_end timestamptz;
  created  public.bookings;
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
      status, hold_expires_at, consultation_mode, price_snapshot, currency, commission_percent_snapshot,
      notes, subject)
    values (
      p_customer, p_astrologer, svc.consultation_type_id, svc.id, p_starts_at, slot_end,
      'payment_pending', now() + make_interval(mins => public.setting_num('reservation_minutes', 10)::int),
      svc.consultation_mode, svc.price, svc.currency,
      public.setting_num('consultation_commission_percent'), nullif(btrim(p_notes), ''), p_subject)
    returning * into created;
  exception when exclusion_violation then
    -- Someone else took it between the check above and this insert.
    raise exception 'SLOT_UNAVAILABLE';
  end;

  return created;
end;
$$;

revoke all on function public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, uuid, timestamptz, text, jsonb) to service_role;

insert into public.schema_migrations (version, name) values ('0016', 'booking_subject');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0016_booking_subject_test.sql, then 0014's and 0015's tests
-- (they call the function without a subject) -- all assert and roll back.
