-- 0038_admin_guards_test.sql
-- Self-asserting check for database/migrations/0038_admin_guards.sql.
-- Browser writes run as `authenticated` with an admin's or moderator's JWT;
-- create_booking() runs without a JWT, as the server does. Creates throwaway users,
-- asserts, and ROLLS BACK. Success: "0038_admin_guards: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','38383838-0000-0000-0000-00000000000a','authenticated','authenticated','guards-admin@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','38383838-0000-0000-0000-00000000000b','authenticated','authenticated','guards-moderator@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','38383838-0000-0000-0000-00000000000c','authenticated','authenticated','guards-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','38383838-0000-0000-0000-00000000000d','authenticated','authenticated','guards-jyotish@example.test','', now(), now());

update public.users set role = 'admin'     where id = '38383838-0000-0000-0000-00000000000a';
update public.users set role = 'moderator' where id = '38383838-0000-0000-0000-00000000000b';

insert into public.customers (id, user_id, full_name) values
  ('38383838-cccc-0000-0000-00000000000c', '38383838-0000-0000-0000-00000000000c', 'Guards Customer');
insert into public.astrologers (id, user_id, name, status) values
  ('38383838-aaaa-0000-0000-00000000000d', '38383838-0000-0000-0000-00000000000d', 'Guards Jyotish', 'active');
insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '38383838-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  admin_u  constant uuid := '38383838-0000-0000-0000-00000000000a';
  moder_u  constant uuid := '38383838-0000-0000-0000-00000000000b';
  cust     constant uuid := '38383838-cccc-0000-0000-00000000000c';
  jyotish  constant uuid := '38383838-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  old_price numeric := (select price from public.services where id = call_svc);
  kept     public.bookings;
  bad      record;
  act      text;
  blocked  boolean;
  n        int;
  a        public.audit_log;
begin
  kept := public.create_booking(cust, jyotish, call_svc,
    (((now() at time zone 'Asia/Kathmandu')::date + 2) + time '10:00') at time zone 'Asia/Kathmandu');

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);

  -- 1. Bad values are refused. Before 0038 the first one was accepted, and setting_num()
  --    then failed for every booking.
  for bad in select * from (values
      ('consultation_commission_percent', '"abc"'), ('consultation_commission_percent', '-5'),
      ('consultation_commission_percent', '500'),   ('reservation_minutes', '0'),
      ('reservation_minutes', '7.5'),               ('join_before_minutes', '"15"'),
      ('join_after_minutes', '2000'),               ('cancellation_window_hours', 'null'),
      ('minimum_payout', '-1'),                     ('default_currency', '"USD"'),
      ('esewa_account_label', '""'),                ('esewa_account_id', '123'),
      ('esewa_qr_path', '"javascript:alert(1)"')) as t(k, v)
  loop
    blocked := false;
    begin
      update public.platform_settings set value = bad.v::jsonb where key = bad.k;
    exception when check_violation then
      blocked := sqlerrm like 'INVALID_SETTING: ' || bad.k || ' must be %';
    end;
    if not blocked then raise exception 'FAIL: % = % was accepted', bad.k, bad.v; end if;
  end loop;

  -- 2. Good values are accepted and audited with the admin and the old value.
  update public.platform_settings set value = '12.5' where key = 'consultation_commission_percent';
  update public.platform_settings set value = '"https://example.test/qr.png"' where key = 'esewa_qr_path';
  update public.platform_settings set value = '0' where key = 'minimum_payout';
  reset role;
  select * into a from public.audit_log where action = 'setting.updated' and metadata->>'key' = 'consultation_commission_percent'
   and created_at = now() limit 1;
  if a.actor_user_id is distinct from admin_u or a.previous_state->'value' <> '15'::jsonb or a.new_state->'value' <> '12.5'::jsonb then
    raise exception 'FAIL: setting audit row is %', row_to_json(a);
  end if;
  if public.setting_num('consultation_commission_percent') <> 12.5 then
    raise exception 'FAIL: setting_num reads %', public.setting_num('consultation_commission_percent');
  end if;

  -- 3. The browser cannot add, delete, rename or re-expose a setting.
  set local role authenticated;
  foreach act in array array['insert', 'delete', 'rename', 'public'] loop
    blocked := false;
    begin
      if act = 'insert' then
        insert into public.platform_settings (key, value) values ('surprise', '1');
      elsif act = 'delete' then
        delete from public.platform_settings where key = 'consultation_commission_percent';
      elsif act = 'rename' then
        update public.platform_settings set key = 'commission' where key = 'consultation_commission_percent';
      else
        update public.platform_settings set is_public = true where key = 'consultation_commission_percent';
      end if;
    exception when insufficient_privilege then blocked := true;
    end;
    if not blocked then raise exception 'FAIL: an admin could % a setting', act; end if;
  end loop;

  -- 4. A moderator writes nothing (RLS: the update matches no row).
  perform set_config('request.jwt.claims', json_build_object('sub', moder_u, 'role', 'authenticated')::text, true);
  update public.platform_settings set value = '50' where key = 'consultation_commission_percent';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a moderator changed a setting'; end if;

  -- 5. Service edits: audited (rows from this transaction: created_at = now()); an existing booking keeps its price.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  update public.services set price = old_price + 500 where id = call_svc;
  update public.services set description = 'Reworded only' where id = call_svc;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.audit_log where entity_id = call_svc and action = 'service.updated' and created_at = now();
  select * into a from public.audit_log where entity_id = call_svc and action = 'service.updated' and created_at = now() limit 1;
  if n <> 1 or a.actor_user_id is distinct from admin_u
     or (a.previous_state->>'price')::numeric <> old_price or (a.new_state->>'price')::numeric <> old_price + 500 then
    raise exception 'FAIL: service audit (% rows) is %', n, row_to_json(a);
  end if;
  if (select price_snapshot from public.bookings where id = kept.id) <> old_price then
    raise exception 'FAIL: the booking''s price moved with the service';
  end if;

  -- 6. The service role is held to the same value rules.
  blocked := false;
  begin update public.platform_settings set value = '"abc"' where key = 'minimum_payout';
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: the service role stored a bad value'; end if;

  raise notice '0038_admin_guards: all assertions passed';
end;
$$;

rollback;
