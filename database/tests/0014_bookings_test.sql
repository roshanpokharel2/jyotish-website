-- 0014_bookings_test.sql
-- Self-asserting check for database/migrations/0014_bookings.sql.
-- Browser attempts run as `anon` or `authenticated` with a JWT; create_booking() runs
-- without a JWT, as the server's service role does. Creates throwaway users, asserts,
-- and ROLLS BACK. Success: "0014_bookings: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','14141414-0000-0000-0000-00000000000a','authenticated','authenticated','booktest-a@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','14141414-0000-0000-0000-00000000000b','authenticated','authenticated','booktest-b@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','14141414-0000-0000-0000-00000000000c','authenticated','authenticated','booktest-blocked@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','14141414-0000-0000-0000-00000000000d','authenticated','authenticated','booktest-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','14141414-0000-0000-0000-00000000000e','authenticated','authenticated','booktest-rival@example.test','', now(), now());

insert into public.customers (id, user_id, full_name) values
  ('14141414-cccc-0000-0000-00000000000a', '14141414-0000-0000-0000-00000000000a', 'Book A'),
  ('14141414-cccc-0000-0000-00000000000b', '14141414-0000-0000-0000-00000000000b', 'Book B'),
  ('14141414-cccc-0000-0000-00000000000c', '14141414-0000-0000-0000-00000000000c', 'Book Blocked'),
  ('14141414-cccc-0000-0000-00000000000d', '14141414-0000-0000-0000-00000000000d', 'Book Jyotish as customer');
update public.customers set status = 'blocked' where id = '14141414-cccc-0000-0000-00000000000c';

insert into public.astrologers (id, user_id, name, status) values
  ('14141414-aaaa-0000-0000-00000000000d', '14141414-0000-0000-0000-00000000000d', 'Book Jyotish', 'active'),
  ('14141414-aaaa-0000-0000-00000000000e', '14141414-0000-0000-0000-00000000000e', 'Book Rival',   'active');

-- A service only the rival offers.
insert into public.services (id, astrologer_id, name, category, slug, consultation_type_id, consultation_mode, duration_minutes, price, status)
values ('14141414-5555-0000-0000-00000000000e', '14141414-aaaa-0000-0000-00000000000e', 'Rival hour', 'ONLINE', 'rival-hour',
        (select id from public.consultation_types where slug = 'online-live-call'), 'audio', 60, 3000, 'active');

do $$
declare
  cust_a    constant uuid := '14141414-cccc-0000-0000-00000000000a';
  cust_b    constant uuid := '14141414-cccc-0000-0000-00000000000b';
  cust_blk  constant uuid := '14141414-cccc-0000-0000-00000000000c';
  cust_self constant uuid := '14141414-cccc-0000-0000-00000000000d';
  user_a    constant uuid := '14141414-0000-0000-0000-00000000000a';
  user_b    constant uuid := '14141414-0000-0000-0000-00000000000b';
  user_j    constant uuid := '14141414-0000-0000-0000-00000000000d';
  user_r    constant uuid := '14141414-0000-0000-0000-00000000000e';
  jyotish   constant uuid := '14141414-aaaa-0000-0000-00000000000d';
  rival     constant uuid := '14141414-aaaa-0000-0000-00000000000e';
  rival_svc constant uuid := '14141414-5555-0000-0000-00000000000e';
  call_svc  uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day       date := (now() at time zone 'Asia/Kathmandu')::date + 2;
  at10      timestamptz;
  b         public.bookings;
  first_id  uuid;
  blocked   boolean;
  msg       text;
  clock     text;
  n         int;
begin
  at10 := (day + time '10:00') at time zone 'Asia/Kathmandu';

  -- 1. The browser can no longer write bookings. Before 0014 this insert, with a
  --    self-declared 'confirmed' status and no payment, succeeded.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.bookings (customer_id, astrologer_id, consultation_type_id, scheduled_at, status)
    values (cust_a, jyotish, (select id from public.consultation_types where slug = 'online-live-call'), at10, 'confirmed');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer wrote their own confirmed booking'; end if;

  -- 2. Availability: the practitioner sets their own hours; nobody else can.
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, 1, '09:00', '12:00');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer set a practitioner''s hours'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', user_r, 'role', 'authenticated')::text, true);
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, 1, '09:00', '12:00');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a rival set another practitioner''s hours'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time) values (jyotish, 1, '12:00', '09:00');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: hours ending before they start were accepted'; end if;
  blocked := false;
  begin insert into public.availability (astrologer_id, day_of_week, start_time, end_time, timezone) values (jyotish, 1, '09:00', '12:00', 'Mars/Olympus');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an unknown time zone was accepted'; end if;

  -- 3. Visitors see the free slots: 09:00 to 11:30, every 30 minutes.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from public.available_slots(jyotish, call_svc, day, day);
  if n <> 6 then raise exception 'FAIL: expected 6 free slots, got %', n; end if;
  if not exists (select 1 from public.available_slots(jyotish, call_svc, day, day) where starts_at = at10 and ends_at = at10 + interval '30 minutes') then
    raise exception 'FAIL: 10:00 is not offered';
  end if;
  if exists (select 1 from public.available_slots(rival, call_svc, day, day)) then
    raise exception 'FAIL: slots offered for a practitioner with no hours';
  end if;
  if exists (select 1 from public.available_slots(jyotish, call_svc, day, day + 40)) then
    raise exception 'FAIL: a range over 31 days was computed';
  end if;

  -- 4. Nobody but the server creates bookings.
  blocked := false;
  begin perform public.create_booking(cust_a, jyotish, call_svc, at10);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a visitor can call create_booking'; end if;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  blocked := false;
  begin perform public.create_booking(cust_a, jyotish, call_svc, at10);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a signed-in user can call create_booking'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. A booking takes everything from the database.
  b := public.create_booking(cust_a, jyotish, call_svc, at10);
  first_id := b.id;
  if b.status <> 'payment_pending' or b.ends_at <> at10 + interval '30 minutes'
     or b.price_snapshot <> 1000 or b.currency <> 'NPR' or b.commission_percent_snapshot <> 15
     or b.consultation_mode <> 'audio_video' or b.service_id <> call_svc
     or b.hold_expires_at <> now() + make_interval(mins => public.setting_num('reservation_minutes', 10)::int) then
    raise exception 'FAIL: booking fields not taken from the database: %', row_to_json(b);
  end if;
  if exists (select 1 from public.available_slots(jyotish, call_svc, day, day) where starts_at = at10) then
    raise exception 'FAIL: a held slot is still offered';
  end if;

  -- 6. Double booking is refused -- through the function and through a raw insert.
  msg := null;
  begin perform public.create_booking(cust_b, jyotish, call_svc, at10);
  exception when others then msg := sqlerrm; end;
  if msg is distinct from 'SLOT_UNAVAILABLE' then raise exception 'FAIL: second booking of a slot: %', coalesce(msg, 'accepted'); end if;
  blocked := false;
  begin
    insert into public.bookings (customer_id, astrologer_id, consultation_type_id, scheduled_at, ends_at, status)
    values (cust_b, jyotish, (select id from public.consultation_types where slug = 'online-live-call'),
            at10 + interval '15 minutes', at10 + interval '45 minutes', 'confirmed');
  exception when exclusion_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an overlapping booking was written directly'; end if;
  blocked := false;
  begin
    insert into public.bookings (customer_id, astrologer_id, consultation_type_id, status)
    values (cust_b, jyotish, (select id from public.consultation_types where slug = 'online-live-call'), 'confirmed');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a confirmed booking without a time was accepted'; end if;

  -- 7. Only offered times: off the grid, outside the hours, in the past.
  foreach clock in array array['10:10', '13:00'] loop
    begin perform public.create_booking(cust_b, jyotish, call_svc, (day + clock::time) at time zone 'Asia/Kathmandu'); msg := 'accepted';
    exception when others then msg := sqlerrm; end;
    if msg <> 'SLOT_UNAVAILABLE' then raise exception 'FAIL: a time that is not offered: %', msg; end if;
  end loop;
  begin perform public.create_booking(cust_b, jyotish, call_svc, at10 - interval '3 days'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SLOT_UNAVAILABLE' then raise exception 'FAIL: a past time: %', msg; end if;

  -- 8. Only bookable services: another practitioner's, a draft, an untimed one.
  foreach first_id in array array[rival_svc,
      (select id from public.services where slug = 'direct' and astrologer_id is null),
      (select id from public.services where slug = 'question' and astrologer_id is null)] loop
    begin perform public.create_booking(cust_b, jyotish, first_id, at10 + interval '1 hour'); msg := 'accepted';
    exception when others then msg := sqlerrm; end;
    if msg <> 'SERVICE_NOT_BOOKABLE' then raise exception 'FAIL: service % bookable: %', first_id, msg; end if;
  end loop;
  first_id := b.id;

  -- 9. Blocked customers and self-bookings are refused.
  begin perform public.create_booking(cust_blk, jyotish, call_svc, at10 + interval '1 hour'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'CUSTOMER_NOT_ACTIVE' then raise exception 'FAIL: blocked customer: %', msg; end if;
  begin perform public.create_booking(cust_self, jyotish, call_svc, at10 + interval '1 hour'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SELF_BOOKING' then raise exception 'FAIL: practitioner booked themselves: %', msg; end if;

  -- 10. One customer cannot hold more than two slots at once.
  perform public.create_booking(cust_a, jyotish, call_svc, at10 + interval '30 minutes');
  begin perform public.create_booking(cust_a, jyotish, call_svc, at10 + interval '1 hour'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'TOO_MANY_HOLDS' then raise exception 'FAIL: third hold: %', msg; end if;

  -- 11. Who sees which booking: own, practitioner's, staff; not other customers.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.bookings where customer_id = cust_a) then
    raise exception 'FAIL: a customer sees another customer''s booking';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_r, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.bookings where astrologer_id = jyotish) then
    raise exception 'FAIL: a rival practitioner sees another practitioner''s bookings';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  select count(*) into n from public.bookings where astrologer_id = jyotish;
  if n <> 2 then raise exception 'FAIL: the practitioner sees % of their 2 bookings', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  update public.bookings set status = 'confirmed', price_snapshot = 1 where id = first_id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a customer confirmed or re-priced their own booking'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 12. A sold booking keeps its price when the service changes.
  update public.services set price = 1200 where id = call_svc;
  if (select price_snapshot from public.bookings where id = first_id) <> 1000 then
    raise exception 'FAIL: a service price change rewrote a booking';
  end if;

  -- 13. An expired hold frees the slot, and taking it marks the old hold expired.
  update public.bookings set hold_expires_at = now() - interval '1 minute' where id = first_id;
  if not exists (select 1 from public.available_slots(jyotish, call_svc, day, day) where starts_at = at10) then
    raise exception 'FAIL: an expired hold still blocks the slot';
  end if;
  b := public.create_booking(cust_b, jyotish, call_svc, at10);
  if (select status from public.bookings where id = first_id) <> 'expired' then
    raise exception 'FAIL: the expired hold was not marked expired';
  end if;

  -- 14. A suspended practitioner offers no slots and takes no bookings.
  update public.astrologers set status = 'suspended' where id = jyotish;
  if exists (select 1 from public.available_slots(jyotish, call_svc, day, day)) then
    raise exception 'FAIL: a suspended practitioner offers slots';
  end if;
  begin perform public.create_booking(cust_b, jyotish, call_svc, at10 + interval '1 hour'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'SERVICE_NOT_BOOKABLE' then raise exception 'FAIL: booked a suspended practitioner: %', msg; end if;

  -- 15. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0014') then
    raise exception 'FAIL: 0014 is not recorded';
  end if;

  raise notice '0014_bookings: all assertions passed';
end $$;

rollback;
