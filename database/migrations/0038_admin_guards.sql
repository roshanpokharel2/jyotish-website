-- 0038_admin_guards.sql
-- Step 20, Checkpoint A3 of docs/IMPLEMENTATION-PLAN.md
--
-- The staff dashboard lets admins edit platform settings and services through RLS
-- (0003, 0013). Two gaps, reproduced in dev before this migration:
--   1. Settings are unvalidated jsonb. An admin saving consultation_commission_percent
--      = "abc" breaks the `value::text::numeric` cast in setting_num(), so every new
--      booking and question fails; -5 or 500 is accepted and snapshotted onto bookings.
--      "admins can manage settings" is `for all`, so an admin could also delete the row,
--      and setting_num() then returns null into the commission snapshot.
--   2. Nothing records who changed a setting or a service's price.
--
-- guard_platform_setting(), for every caller:
--   * known keys must hold the right type and range (below); the service role is held
--     to the same rules, since every reader trusts them;
--   * default_currency must be NPR -- the money tables accept nothing else (0013, 0018);
-- and for callers with a JWT (admins in the browser):
--   * no new keys, no renamed keys, no deletes, no is_public changes -- which settings
--     exist and who may read them is decided in migrations, not in the browser.
-- Audit (AFTER triggers, so a refused write leaves no row):
--   * setting.updated with the old and new value;
--   * service.created / service.updated with name, mode, duration, price and status,
--     only when one of those changed. Bookings keep their price snapshot (0014), so a
--     price change never touches a booking already made.
--
-- Additive and re-runnable. Run after 0037_customer_status.sql. Before applying to a
-- project with tuned settings, check the current values pass:
--   select key, value from public.platform_settings;

begin;

-- ---------------------------------------------------------------------------
-- 1. Settings: types, ranges, and what the browser may not do
-- ---------------------------------------------------------------------------

create or replace function public.guard_platform_setting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v    jsonb;
  num  numeric;
  bad  text;
begin
  if auth.uid() is not null then
    if tg_op = 'DELETE' then
      raise exception 'FORBIDDEN: platform settings cannot be deleted here' using errcode = '42501';
    elsif tg_op = 'INSERT' then
      raise exception 'FORBIDDEN: new platform settings are added by a migration' using errcode = '42501';
    elsif new.key is distinct from old.key or new.is_public is distinct from old.is_public then
      raise exception 'FORBIDDEN: a setting''s key and visibility are fixed' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;

  v := new.value;
  if jsonb_typeof(v) = 'number' then
    num := v::text::numeric;
  end if;

  bad := case new.key
    when 'consultation_commission_percent' then
      case when num is null or num < 0 or num > 100 then 'a number from 0 to 100' end
    when 'reservation_minutes' then
      case when num is null or num <> trunc(num) or num < 1 or num > 1440 then 'whole minutes from 1 to 1440' end
    when 'join_before_minutes' then
      case when num is null or num <> trunc(num) or num < 0 or num > 1440 then 'whole minutes from 0 to 1440' end
    when 'join_after_minutes' then
      case when num is null or num <> trunc(num) or num < 0 or num > 1440 then 'whole minutes from 0 to 1440' end
    when 'cancellation_window_hours' then
      case when num is null or num <> trunc(num) or num < 0 or num > 1440 then 'whole hours from 0 to 1440' end
    when 'minimum_payout' then
      case when num is null or num < 0 then 'an amount of 0 or more' end
    when 'default_currency' then
      case when v is distinct from '"NPR"'::jsonb then '"NPR" (the only currency payments accept)' end
    when 'esewa_account_label' then
      case when jsonb_typeof(v) <> 'string' or btrim(v #>> '{}') = '' or length(v #>> '{}') > 200 then 'text of 1 to 200 characters' end
    when 'esewa_account_id' then
      case when jsonb_typeof(v) <> 'string' or btrim(v #>> '{}') = '' or length(v #>> '{}') > 200 then 'text of 1 to 200 characters' end
    when 'esewa_qr_path' then
      case when jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 500
             or not ((v #>> '{}') = '' or (v #>> '{}') ~* '^https?://') then 'empty, or an http(s) address of up to 500 characters' end
    else
      case when auth.uid() is not null then 'a known setting' end
  end;

  if bad is not null then
    raise exception 'INVALID_SETTING: % must be %', new.key, bad using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_platform_settings_guard on public.platform_settings;
create trigger trg_platform_settings_guard
before insert or update or delete on public.platform_settings
for each row execute function public.guard_platform_setting();

create or replace function public.audit_platform_setting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.value is not distinct from old.value then
    return null;
  end if;
  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, metadata)
  values (auth.uid(), (select role from public.users where id = auth.uid()),
          'setting.updated', 'setting', null,
          jsonb_build_object('key', old.key, 'value', old.value),
          jsonb_build_object('key', new.key, 'value', new.value),
          jsonb_build_object('key', new.key));
  return null;
end;
$$;

drop trigger if exists trg_platform_settings_audit on public.platform_settings;
create trigger trg_platform_settings_audit
after update on public.platform_settings
for each row execute function public.audit_platform_setting();

-- ---------------------------------------------------------------------------
-- 2. Services: audit what customers pay and get
-- ---------------------------------------------------------------------------

create or replace function public.audit_service_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  after_state jsonb := jsonb_build_object('name', new.name, 'consultation_mode', new.consultation_mode,
    'duration_minutes', new.duration_minutes, 'price', new.price, 'status', new.status);
  before_state jsonb;
begin
  if tg_op = 'UPDATE' then
    before_state := jsonb_build_object('name', old.name, 'consultation_mode', old.consultation_mode,
      'duration_minutes', old.duration_minutes, 'price', old.price, 'status', old.status);
    if before_state = after_state then
      return null;
    end if;
  end if;
  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (auth.uid(), (select role from public.users where id = auth.uid()),
          case tg_op when 'INSERT' then 'service.created' else 'service.updated' end,
          'service', new.id, before_state, after_state);
  return null;
end;
$$;

drop trigger if exists trg_services_audit on public.services;
create trigger trg_services_audit
after insert or update on public.services
for each row execute function public.audit_service_change();

insert into public.schema_migrations (version, name) values ('0038', 'admin_guards');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0038_admin_guards_test.sql
