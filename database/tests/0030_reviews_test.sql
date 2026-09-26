-- 0030_reviews_test.sql
-- Self-asserting check for database/migrations/0030_reviews.sql.
-- Browser attempts run as `anon` or `authenticated` with a JWT. Creates
-- throwaway users, asserts, and ROLLS BACK.
-- Success: "0030_reviews: all assertions passed".
--
-- The fail-before case is §1: on 0029 nothing stops a review of an unpaid,
-- someone else's, or nonexistent booking; on 0030 every such write is refused.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','30303030-0000-0000-0000-00000000000a','authenticated','authenticated','reviewtest-a@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','30303030-0000-0000-0000-00000000000b','authenticated','authenticated','reviewtest-b@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','30303030-0000-0000-0000-00000000000d','authenticated','authenticated','reviewtest-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','30303030-0000-0000-0000-00000000000e','authenticated','authenticated','reviewtest-moderator@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'moderator' where id = '30303030-0000-0000-0000-00000000000e';

insert into public.customers (id, user_id, full_name) values
  ('30303030-cccc-0000-0000-00000000000a', '30303030-0000-0000-0000-00000000000a', 'Review A'),
  ('30303030-cccc-0000-0000-00000000000b', '30303030-0000-0000-0000-00000000000b', 'Review B');

insert into public.astrologers (id, user_id, name, status) values
  ('30303030-aaaa-0000-0000-00000000000d', '30303030-0000-0000-0000-00000000000d', 'Review Jyotish', 'active');

do $$
declare
  cust_a   constant uuid := '30303030-cccc-0000-0000-00000000000a';
  cust_b   constant uuid := '30303030-cccc-0000-0000-00000000000b';
  user_a   constant uuid := '30303030-0000-0000-0000-00000000000a';
  user_b   constant uuid := '30303030-0000-0000-0000-00000000000b';
  user_j   constant uuid := '30303030-0000-0000-0000-00000000000d';
  user_m   constant uuid := '30303030-0000-0000-0000-00000000000e';
  jyotish  constant uuid := '30303030-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  day      date := (now() at time zone 'Asia/Kathmandu')::date + 11;
  at10     timestamptz := (day + time '10:00') at time zone 'Asia/Kathmandu';
  at1030   timestamptz := (day + time '10:30') at time zone 'Asia/Kathmandu';
  book_a   uuid;
  book_b   uuid;
  msg      text;
  blocked  boolean;
  n        int;
  r        public.reviews;
begin
  insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
  select jyotish, d, '09:00', '12:00' from generate_series(0, 6) d;

  book_a := (public.create_booking(cust_a, jyotish, call_svc, at10)).id;
  book_b := (public.create_booking(cust_b, jyotish, call_svc, at1030)).id;

  -- 1. Only the booking's own customer, only once completed, only once.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  begin insert into public.reviews (booking_id, rating) values (book_a, 5); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'REVIEW_NOT_ALLOWED' then raise exception 'FAIL: review of a held booking: %', msg; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  -- B's own booking is still held too; A's booking is someone else's.
  begin insert into public.reviews (booking_id, rating) values (book_a, 5); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg not in ('REVIEW_NOT_ALLOWED', 'new row violates row-level security policy for table "reviews"') then
    raise exception 'FAIL: review of another customer''s booking: %', msg;
  end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- The consultation happened (completion lands with Steps 18/20).
  update public.bookings set status = 'completed' where id in (book_a, book_b);

  -- 2. The review lands with authorship from the booking, not the request.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  insert into public.reviews (booking_id, rating, private_feedback, customer_id, astrologer_id)
  values (book_a, 5, 'Thorough and kind', '30303030-0000-0000-0000-00000000000b', '30303030-0000-0000-0000-000000000099')
  returning * into r;
  if r.customer_id <> cust_a or r.astrologer_id <> jyotish or r.status <> 'published' then
    raise exception 'FAIL: authorship not taken from the booking: %', row_to_json(r);
  end if;
  -- One per booking...
  begin insert into public.reviews (booking_id, rating) values (book_a, 4); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'duplicate key value violates unique constraint "reviews_booking_id_key"' then
    raise exception 'FAIL: second review of a booking: %', msg;
  end if;
  -- Immutable: the author cannot edit or remove it.
  update public.reviews set rating = 1 where id = r.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a customer edited their review'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- ...and ratings stay 1-5 (as the owner, past RLS, against the constraint).
  begin insert into public.reviews (booking_id, rating) values (book_b, 6); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'new row for relation "reviews" violates check constraint "reviews_rating_check"' then
    raise exception 'FAIL: rating 6: %', msg;
  end if;

  -- 3. B reviews too; the aggregates count published only.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  insert into public.reviews (booking_id, rating) values (book_b, 3);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.practitioner_ratings where astrologer_id = jyotish;
  if n <> 1 then raise exception 'FAIL: rating row missing'; end if;
  if (select review_count from public.practitioner_ratings where astrologer_id = jyotish) <> 2
  or (select avg_rating from public.practitioner_ratings where astrologer_id = jyotish) <> 4.00 then
    raise exception 'FAIL: average is not (5+3)/2';
  end if;

  -- 4. The public surface: stars for everyone, notes and identities for no one.
  set local role anon;
  select count(*) into n from public.public_reviews where astrologer_id = jyotish;
  if n <> 2 then raise exception 'FAIL: visitors see % of 2 reviews', n; end if;
  select count(*) into n from public.practitioner_ratings;
  if n < 1 then raise exception 'FAIL: visitors see no ratings'; end if;
  reset role;
  -- Moderation hides from the public and the average; staff still read all.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_m, 'role', 'authenticated')::text, true);
  update public.reviews set status = 'hidden' where booking_id = book_b;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: moderator hid % rows', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if (select review_count from public.practitioner_ratings where astrologer_id = jyotish) <> 1
  or (select avg_rating from public.practitioner_ratings where astrologer_id = jyotish) <> 5.00 then
    raise exception 'FAIL: hidden review still counted';
  end if;
  set local role anon;
  select count(*) into n from public.public_reviews where astrologer_id = jyotish;
  if n <> 1 then raise exception 'FAIL: hidden review still public'; end if;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reviews;
  if n <> 1 then raise exception 'FAIL: a customer reads % of all reviews', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0030') then
    raise exception 'FAIL: 0030 is not recorded';
  end if;

  raise notice '0030_reviews: all assertions passed';
end $$;

rollback;
