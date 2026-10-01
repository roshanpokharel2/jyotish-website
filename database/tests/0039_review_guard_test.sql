-- 0039_review_guard_test.sql
-- Self-asserting check for database/migrations/0039_review_guard.sql.
-- Moderation runs as `authenticated` with a moderator's JWT. Creates throwaway users,
-- asserts, and ROLLS BACK. Success: "0039_review_guard: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','39393939-0000-0000-0000-00000000000a','authenticated','authenticated','reviewguard-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','39393939-0000-0000-0000-00000000000d','authenticated','authenticated','reviewguard-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','39393939-0000-0000-0000-00000000000e','authenticated','authenticated','reviewguard-moderator@example.test','', now(), now());

update public.users set role = 'moderator' where id = '39393939-0000-0000-0000-00000000000e';

insert into public.customers (id, user_id, full_name) values
  ('39393939-cccc-0000-0000-00000000000a', '39393939-0000-0000-0000-00000000000a', 'Guard Customer');
insert into public.astrologers (id, user_id, name, status) values
  ('39393939-aaaa-0000-0000-00000000000d', '39393939-0000-0000-0000-00000000000d', 'Guard Jyotish', 'active');
insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '39393939-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  cust     constant uuid := '39393939-cccc-0000-0000-00000000000a';
  user_c   constant uuid := '39393939-0000-0000-0000-00000000000a';
  user_m   constant uuid := '39393939-0000-0000-0000-00000000000e';
  jyotish  constant uuid := '39393939-aaaa-0000-0000-00000000000d';
  call_svc uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  book     uuid;
  r        public.reviews;
  col      text;
  blocked  boolean;
  n        int;
begin
  book := (public.create_booking(cust, jyotish, call_svc,
    (((now() at time zone 'Asia/Kathmandu')::date + 12) + time '10:00') at time zone 'Asia/Kathmandu')).id;
  update public.bookings set status = 'completed' where id = book;
  insert into public.reviews (booking_id, rating, private_feedback) values (book, 2, 'Late') returning * into r;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_m, 'role', 'authenticated')::text, true);

  -- 1. A moderator cannot rewrite the review. Before 0039 the rating change went
  --    through and the public average moved.
  foreach col in array array['rating', 'private_feedback', 'astrologer_id'] loop
    blocked := false;
    begin
      if col = 'rating' then update public.reviews set rating = 5 where id = r.id;
      elsif col = 'private_feedback' then update public.reviews set private_feedback = 'Great' where id = r.id;
      else update public.reviews set astrologer_id = null where id = r.id;
      end if;
    exception when insufficient_privilege then blocked := true;
    end;
    if not blocked then raise exception 'FAIL: a moderator changed the review''s %', col; end if;
  end loop;

  -- 2. Hiding and publishing work, and each is audited with the moderator.
  update public.reviews set status = 'hidden' where id = r.id;
  update public.reviews set status = 'published' where id = r.id;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.audit_log where entity_id = r.id and action = 'review.status_changed';
  -- Both rows share the transaction's timestamp, so check them as a set.
  if n <> 2 or exists (select 1 from public.audit_log where entity_id = r.id and action = 'review.status_changed'
                        and actor_user_id is distinct from user_m)
     or (select array_agg(new_state->>'status' order by new_state->>'status') from public.audit_log
          where entity_id = r.id and action = 'review.status_changed') <> array['hidden', 'published'] then
    raise exception 'FAIL: review audit is wrong (% rows)', n;
  end if;
  if (select rating from public.reviews where id = r.id) <> 2 then
    raise exception 'FAIL: the rating moved';
  end if;

  -- 3. The customer still cannot touch it (RLS: no row to update).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  update public.reviews set status = 'hidden' where id = r.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the customer changed their review'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  raise notice '0039_review_guard: all assertions passed';
end;
$$;

rollback;
