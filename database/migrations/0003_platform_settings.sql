-- 0003_platform_settings.sql
-- Step 4 of docs/IMPLEMENTATION-PLAN.md
--
-- One place for the business rules that would otherwise become magic numbers
-- scattered through migrations, Edge Functions and UI: commission, reservation
-- window, join window, payout floor, cancellation window.
--
-- Every later step reads its numbers from here, which is why this comes first.
-- Secrets never go in this table -- those are Edge Function environment secrets.
--
-- Additive and re-runnable. Run after 0002_roles.sql.

begin;

create table if not exists public.platform_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  is_public   boolean not null default false,
  updated_by  uuid references public.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

comment on column public.platform_settings.is_public is
  'True when any authenticated user may read the value (e.g. the join window shown in the UI). False keeps it staff-only.';

alter table public.platform_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Readers
-- ---------------------------------------------------------------------------
-- setting() is security definer so business logic can read a staff-only value
-- (e.g. the commission rate) while the calling customer still cannot select the row.

create or replace function public.setting(setting_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select value from public.platform_settings where key = setting_key;
$$;

comment on function public.setting(text) is
  'Raw jsonb value of a platform setting. Returns null when the key is absent -- callers must handle that.';

-- Numeric convenience: `(setting('x'))::text::numeric` in every caller is noise, and
-- most settings are numbers.
create or replace function public.setting_num(setting_key text, fallback numeric default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value::text::numeric from public.platform_settings where key = setting_key), fallback);
$$;

-- These are security definer, so EXECUTE bypasses the is_public split entirely: a
-- caller who can run setting('consultation_commission_percent') reads it regardless of
-- policy. They are therefore locked to service_role.
--
-- Nothing legitimate loses access. Edge Functions run as service_role; SQL business
-- logic runs inside security definer functions, which execute as the owner and so are
-- unaffected by these grants; the UI reads public settings from the table via RLS.
--
-- Supabase's default privileges grant EXECUTE on new public functions to anon and
-- authenticated BY NAME, so `revoke from public` alone would leave them callable.
revoke all on function public.setting(text) from public, anon, authenticated;
revoke all on function public.setting_num(text, numeric) from public, anon, authenticated;
grant execute on function public.setting(text) to service_role;
grant execute on function public.setting_num(text, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

drop policy if exists "anyone authenticated can read public settings" on public.platform_settings;
create policy "anyone authenticated can read public settings"
on public.platform_settings
for select using (is_public = true and auth.role() = 'authenticated');

drop policy if exists "staff can read all settings" on public.platform_settings;
create policy "staff can read all settings"
on public.platform_settings
for select using (public.is_staff());

drop policy if exists "admins can manage settings" on public.platform_settings;
create policy "admins can manage settings"
on public.platform_settings
for all using (public.has_role('admin','super_admin'))
with check (public.has_role('admin','super_admin'));

-- ---------------------------------------------------------------------------
-- Stamp who changed what
-- ---------------------------------------------------------------------------

create or replace function public.stamp_setting_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists trg_platform_settings_stamp on public.platform_settings;
create trigger trg_platform_settings_stamp
before update on public.platform_settings
for each row execute function public.stamp_setting_update();

-- ---------------------------------------------------------------------------
-- Seeds
-- ---------------------------------------------------------------------------
-- `on conflict do nothing` so re-running never overwrites a value an admin has tuned.

insert into public.platform_settings (key, value, description, is_public) values
  ('consultation_commission_percent', '15'::jsonb,
   'Platform cut of a consultation, in percent. Snapshotted onto each booking at purchase time.', false),

  ('reservation_minutes', '10'::jsonb,
   'How long a slot is held while the customer pays. Enforced server-side; the countdown in the UI is cosmetic.', true),

  ('join_before_minutes', '15'::jsonb,
   'How early a participant may join a consultation.', true),

  ('join_after_minutes', '30'::jsonb,
   'How long after the scheduled end a participant may still join.', true),

  ('cancellation_window_hours', '24'::jsonb,
   'Cancelling at least this long before the start qualifies for a full refund.', true),

  ('minimum_payout', '1000'::jsonb,
   'Smallest jyotish payable balance that may be requested as a payout, in NPR.', false),

  ('default_currency', '"NPR"'::jsonb,
   'Currency for prices, payments, ledger entries and payouts.', true),

  ('esewa_account_label', '"Jyotish and Vastu Sewa Kendra"'::jsonb,
   'Name shown beside the QR so customers can confirm they are paying the official account.', true),

  ('esewa_account_id', '"9851001890"'::jsonb,
   'Platform eSewa ID shown with the QR. Display only -- it authorises nothing.', true),

  ('esewa_qr_path', '""'::jsonb,
   'Storage path of the platform eSewa QR image. Set once the QR is uploaded (Step 11).', true)
on conflict (key) do nothing;

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0003_platform_settings_test.sql -- it asserts and rolls back.
--
--   select key, value, is_public from public.platform_settings order by key;
--   select public.setting_num('consultation_commission_percent');  -- 15
