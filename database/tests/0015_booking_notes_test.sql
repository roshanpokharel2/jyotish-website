-- 0015_booking_notes_test.sql
-- Self-asserting check for database/migrations/0015_booking_notes.sql.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0015_booking_notes: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','15151515-0000-0000-0000-00000000000a','authenticated','authenticated','notestest-a@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','15151515-0000-0000-0000-00000000000d','authenticated','authenticated','notestest-j@example.test','', now(), now());
insert into public.customers (id, user_id, full_name) values
  ('15151515-cccc-0000-0000-00000000000a', '15151515-0000-0000-0000-00000000000a', 'Notes A');
insert into public.astrologers (id, user_id, name, status) values
  ('15151515-aaaa-0000-0000-00000000000d', '15151515-0000-0000-0000-00000000000d', 'Notes Jyotish', 'active');
insert into public.availability (astrologer_id, day_of_week, start_time, end_time)
select '15151515-aaaa-0000-0000-00000000000d', d, '09:00', '12:00' from generate_series(0, 6) d;

do $$
declare
  cust    constant uuid := '15151515-cccc-0000-0000-00000000000a';
  jyotish constant uuid := '15151515-aaaa-0000-0000-00000000000d';
  svc     uuid := (select id from public.services where slug = 'live-call' and astrologer_id is null);
  at10    timestamptz := (((now() at time zone 'Asia/Kathmandu')::date + 2) + time '10:00') at time zone 'Asia/Kathmandu';
  b       public.bookings;
  blocked boolean;
begin
  -- 1. The message is stored with the booking, trimmed; blank is no message.
  b := public.create_booking(cust, jyotish, svc, at10, '  Career question  ');
  if b.notes is distinct from 'Career question' then raise exception 'FAIL: notes stored as %', b.notes; end if;
  b := public.create_booking(cust, jyotish, svc, at10 + interval '30 minutes', '   ');
  if b.notes is not null then raise exception 'FAIL: blank notes stored as %', b.notes; end if;

  -- 2. Over 2000 characters is refused, and no booking is left behind.
  update public.bookings set status = 'cancelled' where customer_id = cust;
  blocked := false;
  begin perform public.create_booking(cust, jyotish, svc, at10 + interval '1 hour', repeat('x', 2001));
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: notes over 2000 characters accepted'; end if;
  if exists (select 1 from public.bookings where customer_id = cust and status = 'payment_pending') then
    raise exception 'FAIL: a refused booking was stored';
  end if;

  -- 3. One entry point, still server-only.
  if exists (select 1 from pg_proc where proname = 'create_booking' and pronargs = 4) then
    raise exception 'FAIL: the old four-argument create_booking still exists';
  end if;
  -- By name, not signature: later migrations (0016) replace the function again.
  if exists (select 1 from pg_proc where proname = 'create_booking'
             and (has_function_privilege('anon', oid, 'execute') or has_function_privilege('authenticated', oid, 'execute'))) then
    raise exception 'FAIL: create_booking is callable from the browser';
  end if;

  if not exists (select 1 from public.schema_migrations where version = '0015') then
    raise exception 'FAIL: 0015 is not recorded';
  end if;

  raise notice '0015_booking_notes: all assertions passed';
end $$;

rollback;
