-- 0013_services.sql
-- Step 7 of docs/IMPLEMENTATION-PLAN.md -- the services catalog.
--
-- Prices and durations live in the browser today (script.js: "रु. 1,000", "रु. 600",
-- "रु. 100"), and the `services` table has RLS on with no policy, so nothing can read
-- it. Before bookings and payments move to the server, the server needs one place to
-- read what a service is, what it costs and how long it takes. That is `services`
-- (AD-3: extended, not replaced).
--
--   * Each service: optional practitioner (`astrologer_id`, null = offered by the
--     platform with any practitioner), taxonomy (`consultation_type_id`), `slug`,
--     `consultation_mode`, `duration_minutes`, `price`, `currency`, `status`.
--   * An `active` service must be complete: a mode, a price above zero and, for a
--     timed mode, a duration. Enforced by a constraint, not by the code that reads it.
--   * Anyone (signed in or not) reads active services whose practitioner is active.
--     A practitioner also reads their own; staff read everything.
--   * Only admin / super_admin write (AD-13: practitioners do not set their own price).
--     No delete for anyone: services will be referenced by bookings; retire with
--     `status = 'archived'`.
--   * `is_active` is kept for old readers and follows `status`.
--
-- Seeded from the prices the site shows today. "Direct Consultation" has no price
-- ("contact for price"), so it stays `draft` until one is set. Durations are not shown
-- anywhere on the site; 30 minutes is a placeholder to confirm.
--
-- Run after 0012_schema_migrations.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists astrologer_id        uuid references public.astrologers(id) on delete cascade,
  add column if not exists consultation_type_id uuid references public.consultation_types(id),
  add column if not exists slug                 text,
  add column if not exists consultation_mode    text,
  add column if not exists duration_minutes     integer,
  add column if not exists currency             text not null default 'NPR',
  add column if not exists status               text not null default 'draft',
  add column if not exists updated_at           timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2. Seed from what the site shows (before the constraints, so the existing rows fit)
-- ---------------------------------------------------------------------------
update public.services s set
  slug = v.slug,
  consultation_type_id = (select id from public.consultation_types where slug = v.type_slug),
  consultation_mode = v.mode,
  duration_minutes = v.minutes,
  price = v.price,
  status = v.status
from (values
  ('Live Call Consultation', 'live-call',     'online-live-call',    'audio_video', 30,   1000, 'active'),
  ('Chat Consultation',      'chat',          'chat-consultation',   'chat',        null, 600,  'active'),
  ('Question Service',       'question',      'question-service',    'question',    null, 100,  'active'),
  ('Direct Consultation',    'direct',        'direct-consultation', 'in_person',   null, 0,    'draft')
) as v(name, slug, type_slug, mode, minutes, price, status)
where s.name = v.name and s.slug is null and s.astrologer_id is null;

insert into public.services (name, category, description, slug, consultation_type_id, consultation_mode, duration_minutes, price, status)
select v.name, 'ONLINE', v.description, v.slug,
       (select id from public.consultation_types where slug = v.type_slug), v.mode, 30, 1000, 'active'
from (values
  ('Live Online Chart',      'Discuss your birth chart with the astrologer live.', 'live-chart', 'live-online-chart',    'video'),
  ('Live Question & Answer', 'Direct question and answer over live chat.',         'live-qa',    'live-question-answer', 'chat')
) as v(name, description, slug, type_slug, mode)
where not exists (select 1 from public.services s where s.slug = v.slug and s.astrologer_id is null);

-- Anything else already in the table (not expected) is kept, but not offered.
update public.services set status = 'draft' where slug is null;
update public.services set price = 0 where price is null;
update public.services set is_active = (status = 'active');

-- ---------------------------------------------------------------------------
-- 3. Rules
-- ---------------------------------------------------------------------------
alter table public.services alter column price set not null;

alter table public.services
  drop constraint if exists services_status_check,
  add  constraint services_status_check check (status in ('draft','active','inactive','archived')),
  drop constraint if exists services_mode_check,
  add  constraint services_mode_check check (consultation_mode in ('audio','video','audio_video','chat','in_person','question')),
  drop constraint if exists services_currency_check,
  add  constraint services_currency_check check (currency = 'NPR'),
  drop constraint if exists services_price_check,
  add  constraint services_price_check check (price >= 0),
  drop constraint if exists services_duration_check,
  add  constraint services_duration_check check (duration_minutes between 5 and 480),
  drop constraint if exists services_slug_check,
  add  constraint services_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Nothing half-defined can be offered: the server will charge `price` and block
  -- `duration_minutes` of the practitioner's time.
  drop constraint if exists services_active_complete,
  add  constraint services_active_complete check (
    status <> 'active' or (
      slug is not null and consultation_type_id is not null and consultation_mode is not null
      and price > 0
      and (duration_minutes is not null or consultation_mode in ('chat','question'))
    )
  ),
  -- One slug per owner; the platform-wide rows (null practitioner) count as one owner.
  drop constraint if exists services_owner_slug_key,
  add  constraint services_owner_slug_key unique nulls not distinct (astrologer_id, slug);

create index if not exists idx_services_astrologer on public.services (astrologer_id) where astrologer_id is not null;

create or replace function public.services_sync_is_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop trigger if exists trg_services_sync_is_active on public.services;
create trigger trg_services_sync_is_active
before insert or update on public.services
for each row execute function public.services_sync_is_active();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Who reads and writes
-- ---------------------------------------------------------------------------
-- Visitors cannot read `astrologers` (RLS), so the public policy asks this instead.
-- It answers only "is this practitioner active", which the public listing shows anyway.
create or replace function public.is_active_astrologer(astrologer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.astrologers where id = astrologer and status = 'active');
$$;

revoke all on function public.is_active_astrologer(uuid) from public, anon, authenticated;
grant execute on function public.is_active_astrologer(uuid) to anon, authenticated, service_role;

drop policy if exists "active services are public" on public.services;
create policy "active services are public"
on public.services for select
using (status = 'active' and (astrologer_id is null or public.is_active_astrologer(astrologer_id)));

drop policy if exists "practitioners read own services" on public.services;
create policy "practitioners read own services"
on public.services for select to authenticated
using (astrologer_id in (select id from public.astrologers where user_id = auth.uid()));

drop policy if exists "staff read all services" on public.services;
create policy "staff read all services"
on public.services for select to authenticated
using (public.is_staff());

drop policy if exists "admins create services" on public.services;
create policy "admins create services"
on public.services for insert to authenticated
with check (public.has_role('admin','super_admin'));

drop policy if exists "admins update services" on public.services;
create policy "admins update services"
on public.services for update to authenticated
using (public.has_role('admin','super_admin'))
with check (public.has_role('admin','super_admin'));

insert into public.schema_migrations (version, name) values ('0013', 'services');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0013_services_test.sql -- it asserts and rolls back.
--
--   select slug, consultation_mode, duration_minutes, price, status, is_active
--     from public.services order by slug;
