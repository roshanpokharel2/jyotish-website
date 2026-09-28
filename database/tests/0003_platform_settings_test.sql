-- 0003_platform_settings_test.sql
-- Self-asserting check for database/migrations/0003_platform_settings.sql.
-- Creates a throwaway customer, asserts, and ROLLS BACK.
-- Success: "0003_platform_settings: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000','33333333-3333-3333-3333-333333333333',
        'authenticated','authenticated','settingstest-customer@example.test','', now(), now());

do $$
declare
  customer_id constant uuid := '33333333-3333-3333-3333-333333333333';
  visible_public  int;
  visible_private int;
  blocked boolean := false;
begin
  -- 1. Seeds landed and the numeric helper casts correctly.
  if public.setting_num('consultation_commission_percent') <> 15 then
    raise exception 'FAIL: commission seed is % , expected 15',
      public.setting_num('consultation_commission_percent');
  end if;
  -- Raised from 10 to 20 by 0018 (time to pay and upload proof).
  if public.setting_num('reservation_minutes') <> 20 then
    raise exception 'FAIL: reservation_minutes seed is wrong';
  end if;
  if public.setting('default_currency') <> '"NPR"'::jsonb then
    raise exception 'FAIL: default_currency seed is wrong';
  end if;

  -- 2. Missing key returns null, and the fallback is used when given.
  if public.setting('no_such_key') is not null then
    raise exception 'FAIL: setting() invented a value for a missing key';
  end if;
  if public.setting_num('no_such_key', 42) <> 42 then
    raise exception 'FAIL: setting_num() ignored its fallback';
  end if;

  -- 3. The reservation window is usable as an interval -- this is the shape Step 9 needs.
  if (now() + (public.setting_num('reservation_minutes') || ' minutes')::interval) <= now() then
    raise exception 'FAIL: reservation_minutes does not produce a future expiry';
  end if;

  -- 4. RLS: a customer sees public settings only.
  -- Claims mirror a real Supabase access token: auth.uid() reads `sub`, auth.role()
  -- reads `role`. A fixture with only `sub` would fail policies that check auth.role().
  set local role authenticated;
  perform set_config('request.jwt.claims',
                     json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);

  select count(*) into visible_public  from public.platform_settings where is_public;
  select count(*) into visible_private from public.platform_settings where not is_public;

  if visible_public = 0 then
    raise exception 'FAIL: customer cannot read any public setting';
  end if;
  if visible_private <> 0 then
    raise exception 'FAIL: customer can read % staff-only settings', visible_private;
  end if;

  -- 5. ...and cannot reach a staff-only value through the reader functions either.
  --    They are security definer, so EXECUTE would bypass the is_public split.
  blocked := false;
  begin
    perform public.setting_num('consultation_commission_percent');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: a customer read the commission rate through setting_num()';
  end if;

  -- 6. A customer cannot write settings.
  begin
    update public.platform_settings set value = '0'::jsonb where key = 'consultation_commission_percent';
    if found then
      raise exception 'FAIL: a customer changed the commission rate';
    end if;
  exception when insufficient_privilege then
    blocked := true;
  end;

  reset role;
  if public.setting_num('consultation_commission_percent') <> 15 then
    raise exception 'FAIL: commission rate was modified by a non-admin';
  end if;

  raise notice '0003_platform_settings: all assertions passed';
end $$;

rollback;
