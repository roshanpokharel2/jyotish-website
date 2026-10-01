-- 0040_booking_completion_test.sql
-- Self-asserting check for database/migrations/0040_booking_completion.sql.
-- The functions run without a JWT, as the server's service role does; the review
-- insert runs as the customer with a JWT. Creates throwaway users, asserts, and
-- ROLLS BACK. Success: "0040_booking_completion: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','40404040-0000-0000-0000-00000000000a','authenticated','authenticated','complete-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','40404040-0000-0000-0000-00000000000d','authenticated','authenticated','complete-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','40404040-0000-0000-0000-00000000000e','authenticated','authenticated','complete-rival@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','40404040-0000-0000-0000-00000000000f','authenticated','authenticated','complete-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','40404040-0000-0000-0000-000000000005','authenticated','authenticated','complete-support@example.test','', now(), now());

update public.users set role = 'finance' where id = '40404040-0000-0000-0000-00000000000f';
update public.users set role = 'support' where id = '40404040-0000-0000-0000-000000000005';

insert into public.customers (id, user_id, full_name) values
  ('40404040-cccc-0000-0000-00000000000a', '40404040-0000-0000-0000-00000000000a', 'Complete Customer');
insert into public.astrologers (id, user_id, name, status) values
  ('40404040-aaaa-0000-0000-00000000000d', '40404040-0000-0000-0000-00000000000d', 'Complete Jyotish', 'active'),
  ('40404040-aaaa-0000-0000-00000000000e', '40404040-0000-0000-0000-00000000000e', 'Complete Rival', 'active');
insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '40404040-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  cust     constant uuid := '40404040-cccc-0000-0000-00000000000a';
  user_c   constant uuid := '40404040-0000-0000-0000-00000000000a';
  user_j   constant uuid := '40404040-0000-0000-0000-00000000000d';
  user_r   constant uuid := '40404040-0000-0000-0000-00000000000e';
  user_f   constant uuid := '40404040-0000-0000-0000-00000000000f';
  user_s   constant uuid := '40404040-0000-0000-0000-000000000005';
  jyotish  constant uuid := '40404040-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 14;
  ended    public.bookings;   -- paid, ended an hour ago
  future   public.bookings;   -- paid, not yet held
  unpaid   public.bookings;   -- held, never paid
  stale    public.bookings;   -- paid, ended two days ago
  b        public.bookings;
  pay      public.payments;
  msg      text;
  n        int;
  who      uuid;
begin
  -- Paid one at a time: a customer may hold only a few unpaid bookings at once.
  for n in 0..2 loop
    b := public.create_booking(cust, jyotish, call_svc, (day + time '09:00' + n * interval '1 hour') at time zone 'Asia/Kathmandu');
    pay := public.submit_payment_proof((select id from public.payments where booking_id = b.id), 'complete/proof.png');
    pay := public.approve_payment(pay.id, user_f);
    if n = 0 then ended := b; elsif n = 1 then future := b; else stale := b; end if;
  end loop;
  unpaid := public.create_booking(cust, jyotish, call_svc, (day + time '11:30') at time zone 'Asia/Kathmandu');
  -- The consultations happened (moved into the past, as the clock would).
  update public.bookings set scheduled_at = now() - interval '90 minutes', ends_at = now() - interval '1 hour' where id = ended.id;
  update public.bookings set scheduled_at = now() - interval '50 hours', ends_at = now() - interval '49 hours' where id = stale.id;
  update public.bookings set scheduled_at = now() - interval '3 hours', ends_at = now() - interval '150 minutes',
    status = 'confirmed' where id = unpaid.id;

  -- 1. Refusals, by message. Before 0040 there was no such function.
  foreach msg in array array[
    'NOT_FOUND:'                || user_c || ':' || ended.id  || ':completed',   -- the customer
    'NOT_FOUND:'                || user_r || ':' || ended.id  || ':completed',   -- another practitioner
    'NOT_FOUND:'                || user_f || ':' || ended.id  || ':completed',   -- finance is not on the list
    'INVALID_OUTCOME:'          || user_j || ':' || ended.id  || ':cancelled',
    'BOOKING_NOT_ENDED:'        || user_j || ':' || future.id || ':completed',
    'BOOKING_NOT_COMPLETABLE:'  || user_j || ':' || unpaid.id || ':completed'
  ] loop
    begin
      perform public.complete_booking(split_part(msg, ':', 3)::uuid, split_part(msg, ':', 2)::uuid, split_part(msg, ':', 4));
      raise exception 'FAIL: % was not refused', msg;
    exception when others then
      if sqlerrm <> split_part(msg, ':', 1) then raise exception 'FAIL: expected %, got %', split_part(msg, ':', 1), sqlerrm; end if;
    end;
  end loop;

  -- 2. No review before completion.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  begin insert into public.reviews (booking_id, rating) values (ended.id, 5); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg not in ('REVIEW_NOT_ALLOWED', 'new row violates row-level security policy for table "reviews"') then
    raise exception 'FAIL: reviewed an unfinished booking: %', msg;
  end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 3. The practitioner completes it; audited; then the customer can review.
  b := public.complete_booking(ended.id, user_j, 'completed');
  if b.status <> 'completed' then raise exception 'FAIL: status is %', b.status; end if;
  select actor_user_id into who from public.audit_log where entity_id = ended.id and action = 'booking.completed';
  if who is distinct from user_j then raise exception 'FAIL: completion audit actor is %', who; end if;
  begin perform public.complete_booking(ended.id, user_j, 'no_show'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'BOOKING_ALREADY_FINISHED' then raise exception 'FAIL: practitioner re-marked a finished booking: %', msg; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  insert into public.reviews (booking_id, rating) values (ended.id, 5);
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 4. Support corrects it to no_show and back; the same outcome twice is refused.
  b := public.complete_booking(ended.id, user_s, 'no_show');
  if b.status <> 'no_show' then raise exception 'FAIL: correction left %', b.status; end if;
  begin perform public.complete_booking(ended.id, user_s, 'no_show'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'BOOKING_ALREADY_FINISHED' then raise exception 'FAIL: same outcome twice: %', msg; end if;
  perform public.complete_booking(ended.id, user_s, 'completed');

  -- 5. Automatic completion: only the paid booking 24h past its end; once.
  n := public.auto_complete_bookings();
  if (select status from public.bookings where id = stale.id) <> 'completed' then
    raise exception 'FAIL: the stale booking was not completed';
  end if;
  if (select status from public.bookings where id = future.id) <> 'confirmed'
     or (select status from public.bookings where id = unpaid.id) <> 'confirmed' then
    raise exception 'FAIL: auto-complete touched a booking it should not';
  end if;
  if not exists (select 1 from public.audit_log where entity_id = stale.id and action = 'booking.completed'
                  and actor_user_id is null and previous_state->>'status' = 'confirmed') then
    raise exception 'FAIL: auto-completion was not audited';
  end if;
  if public.auto_complete_bookings() <> 0 then raise exception 'FAIL: a second run completed more'; end if;

  -- 6. Browsers cannot call either function.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  begin perform public.complete_booking(future.id, user_j, 'completed'); msg := 'accepted';
  exception when insufficient_privilege then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: a browser called complete_booking'; end if;
  begin perform public.auto_complete_bookings(); msg := 'accepted';
  exception when insufficient_privilege then msg := 'refused'; end;
  if msg <> 'refused' then raise exception 'FAIL: a browser called auto_complete_bookings'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  raise notice '0040_booking_completion: all assertions passed';
end;
$$;

rollback;
