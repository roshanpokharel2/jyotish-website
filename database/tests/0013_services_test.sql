-- 0013_services_test.sql
-- Self-asserting check for database/migrations/0013_services.sql.
-- Every attempt runs as `anon` or as `authenticated` with a JWT, the way the browser does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0013_services: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','13131313-0000-0000-0000-00000000000c','authenticated','authenticated','svctest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','13131313-0000-0000-0000-00000000000a','authenticated','authenticated','svctest-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','13131313-0000-0000-0000-00000000000b','authenticated','authenticated','svctest-rival@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','13131313-0000-0000-0000-00000000000d','authenticated','authenticated','svctest-moderator@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','13131313-0000-0000-0000-00000000000e','authenticated','authenticated','svctest-admin@example.test','', now(), now());

update public.users set role = 'moderator' where id = '13131313-0000-0000-0000-00000000000d';
update public.users set role = 'admin'     where id = '13131313-0000-0000-0000-00000000000e';

-- Practitioners are set up the way a reviewer's approval leaves them (no JWT here).
insert into public.astrologers (id, user_id, name, status) values
  ('13131313-aaaa-0000-0000-000000000001', '13131313-0000-0000-0000-00000000000a', 'Svc Jyotish', 'active'),
  ('13131313-aaaa-0000-0000-000000000002', '13131313-0000-0000-0000-00000000000b', 'Svc Rival',   'active');

do $$
declare
  customer_id  constant uuid := '13131313-0000-0000-0000-00000000000c';
  jyotish_id   constant uuid := '13131313-0000-0000-0000-00000000000a';
  moderator_id constant uuid := '13131313-0000-0000-0000-00000000000d';
  admin_id     constant uuid := '13131313-0000-0000-0000-00000000000e';
  own_astro    constant uuid := '13131313-aaaa-0000-0000-000000000001';
  rival_astro  constant uuid := '13131313-aaaa-0000-0000-000000000002';
  call_type    uuid := (select id from public.consultation_types where slug = 'online-live-call');
  svc          uuid;
  stamp        timestamptz;
  blocked      boolean;
  n            int;
begin
  -- 1. The seeded catalog matches the site, complete and in sync.
  select count(*) into n from public.services
   where astrologer_id is null and status = 'active'
     and (slug, price) in (('live-call',1000),('live-chart',1000),('live-qa',1000),('chat',600),('question',100));
  if n <> 5 then raise exception 'FAIL: expected the 5 priced services active, found %', n; end if;
  if not exists (select 1 from public.services where slug = 'direct' and status = 'draft') then
    raise exception 'FAIL: the unpriced direct consultation is offered';
  end if;
  if exists (select 1 from public.services where is_active <> (status = 'active')) then
    raise exception 'FAIL: is_active does not follow status';
  end if;

  -- 2. A visitor reads the active catalog, not drafts. This is what failed before 0013
  --    (RLS on, no policy: the catalog was unreadable).
  set local role anon;
  select count(*) into n from public.services where slug in ('live-call','live-chart','live-qa','chat','question');
  if n <> 5 then raise exception 'FAIL: a visitor sees % of the 5 active services', n; end if;
  if exists (select 1 from public.services where status <> 'active') then
    raise exception 'FAIL: a visitor sees a service that is not active';
  end if;
  blocked := false;
  begin insert into public.services (name, category, price) values ('x', 'ONLINE', 1);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a visitor created a service'; end if;
  update public.services set price = 1 where slug = 'live-call';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a visitor changed a price'; end if;
  reset role;

  -- 3. A customer cannot change the catalog.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', customer_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin insert into public.services (name, category, price, slug, status) values ('x', 'ONLINE', 1, 'cheap', 'draft');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer created a service'; end if;
  update public.services set price = 1 where slug = 'live-call';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a customer changed a price'; end if;
  delete from public.services where slug = 'live-call';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a customer deleted a service'; end if;

  -- 4. A moderator is staff (reads everything) but does not set prices.
  perform set_config('request.jwt.claims', json_build_object('sub', moderator_id, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.services where slug = 'direct') then
    raise exception 'FAIL: staff cannot see a draft service';
  end if;
  update public.services set price = 1 where slug = 'live-call';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a moderator changed a price'; end if;

  -- 5. A practitioner cannot publish or re-price services, not even their own (AD-13).
  perform set_config('request.jwt.claims', json_build_object('sub', jyotish_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.services (astrologer_id, name, category, price, slug, consultation_type_id, consultation_mode, duration_minutes, status)
    values (own_astro, 'Own', 'ONLINE', 5000, 'own', call_type, 'audio', 30, 'active');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a practitioner published their own service'; end if;
  blocked := false;
  begin
    insert into public.services (astrologer_id, name, category, price, slug, consultation_type_id, consultation_mode, duration_minutes, status)
    values (rival_astro, 'Rival', 'ONLINE', 1, 'rival', call_type, 'audio', 30, 'active');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a practitioner published a service under a rival'; end if;

  -- 6. An admin sets up practitioner services.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  insert into public.services (astrologer_id, name, category, price, slug, consultation_type_id, consultation_mode, duration_minutes, status)
  values (own_astro, 'Own call', 'ONLINE', 1500, 'call', call_type, 'audio', 45, 'draft') returning id into svc;
  insert into public.services (astrologer_id, name, category, price, slug, consultation_type_id, consultation_mode, duration_minutes, status)
  values (rival_astro, 'Rival call', 'ONLINE', 1200, 'call', call_type, 'audio', 30, 'draft');

  -- 7. Nothing half-defined can go active.
  blocked := false;
  begin update public.services set price = 0, status = 'active' where id = svc;
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a free service went active'; end if;
  blocked := false;
  begin update public.services set duration_minutes = null, status = 'active' where id = svc;
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a timed service went active without a duration'; end if;
  blocked := false;
  begin update public.services set consultation_mode = 'phone' where id = svc;
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an unknown mode was accepted'; end if;
  blocked := false;
  begin update public.services set currency = 'USD' where id = svc;
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a second currency was accepted'; end if;
  blocked := false;
  begin update public.services set price = -1 where id = svc;
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a negative price was accepted'; end if;

  -- 8. Slugs: one per owner, platform rows included; the same slug under two owners is fine.
  blocked := false;
  begin
    insert into public.services (astrologer_id, name, category, price, slug) values (own_astro, 'Dup', 'ONLINE', 1, 'call');
  exception when unique_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: duplicate slug for one practitioner'; end if;
  blocked := false;
  begin
    insert into public.services (name, category, price, slug) values ('Dup', 'ONLINE', 1, 'live-call');
  exception when unique_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: duplicate platform-wide slug'; end if;

  -- 9. Activating works; is_active follows, and updated_at is the database's time
  --    whatever the writer sends.
  update public.services set status = 'active', is_active = false, updated_at = '2000-01-01' where id = svc;
  select updated_at into stamp from public.services where id = svc;
  if stamp <> now() or not (select is_active from public.services where id = svc) then
    raise exception 'FAIL: activation did not set is_active / updated_at';
  end if;

  -- 10. Admins do not delete either; services are archived.
  delete from public.services where id = svc;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: an admin deleted a service'; end if;

  -- 11. The practitioner sees their own service, not the rival's draft.
  perform set_config('request.jwt.claims', json_build_object('sub', jyotish_id, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.services where id = svc) then
    raise exception 'FAIL: a practitioner cannot see their own service';
  end if;
  if exists (select 1 from public.services where astrologer_id = rival_astro) then
    raise exception 'FAIL: a practitioner sees a rival''s draft service';
  end if;

  -- 12. A suspended practitioner's services disappear from the public catalog.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  update public.astrologers set status = 'suspended' where id = own_astro;
  set local role anon;
  if exists (select 1 from public.services where id = svc) then
    raise exception 'FAIL: a suspended practitioner''s service is still offered';
  end if;
  reset role;
  update public.astrologers set status = 'active' where id = own_astro;
  set local role anon;
  if not exists (select 1 from public.services where id = svc) then
    raise exception 'FAIL: an active practitioner''s active service is not offered';
  end if;
  reset role;

  -- 13. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0013') then
    raise exception 'FAIL: 0013 is not recorded';
  end if;

  raise notice '0013_services: all assertions passed';
end $$;

rollback;
