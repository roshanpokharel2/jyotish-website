-- 0029_reminders.sql
-- Step 13, Checkpoint 13a of docs/IMPLEMENTATION-PLAN.md (plan Step 17) --
-- consultation reminders, generation side.
--
-- generate_reminders() notifies confirmed bookings approaching in the next 24
-- hours and the next hour: the customer in-app and by email, the practitioner
-- in-app (they work in the app daily; same split as 0018's approval mail).
-- reminders(booking_id, kind) is the send record -- its unique key makes a
-- double run a no-op (the plan's whole ask). Scheduling is ops: point a
-- scheduler at the run route (13b) every 15 minutes; pg_cron calling
-- `select public.generate_reminders()` works too.
--
-- Email kinds booking_24h/booking_1h join the email_jobs set (rendered by the
-- drain in this same checkpoint).
--
-- Run after 0028_notify.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. The send record
-- ---------------------------------------------------------------------------
create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind       text not null check (kind in ('booking_24h', 'booking_1h')),
  created_at timestamptz not null default now(),
  unique (booking_id, kind)
);

comment on table public.reminders is
  'One row per reminder sent. The unique key -- not the scheduler -- guarantees at-most-once.';

alter table public.reminders enable row level security;
-- Reads ride with the booking, not this table: no SELECT policy is needed, and
-- writes come only from generate_reminders() (service role).

-- The two new email kinds.
alter table public.email_jobs
  drop constraint if exists email_jobs_kind_check,
  add  constraint email_jobs_kind_check check (kind in (
    'payment_approved','payment_rejected','refund_completed','payout_paid',
    'booking_24h','booking_1h'));

-- ---------------------------------------------------------------------------
-- 2. Generation (server only, at-most-once each)
-- ---------------------------------------------------------------------------
create or replace function public.generate_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  kinds  text[]     := array['booking_24h', 'booking_1h'];
  windows interval[] := array['24 hours', '1 hour'];
  titles  text[]     := array['Consultation tomorrow', 'Consultation in one hour'];
  i       int;
  r       record;
  n       int := 0;
  cust_user  uuid;
  astro_user uuid;
begin
  for i in 1..array_length(kinds, 1) loop
    for r in
      select b.id, b.customer_id, b.astrologer_id, b.scheduled_at, b.price_snapshot, b.currency
        from public.bookings b
       where b.status = 'confirmed'
         and b.scheduled_at > now()
         and b.scheduled_at <= now() + windows[i]
         and not exists (select 1 from public.reminders m
                          where m.booking_id = b.id and m.kind = kinds[i])
    loop
      begin
        insert into public.reminders (booking_id, kind) values (r.id, kinds[i]);
      exception when unique_violation then
        -- A concurrent run sent it first; the notices below must not repeat.
        continue;
      end;

      select c.user_id, a.user_id into cust_user, astro_user
        from public.customers c, public.astrologers a
       where c.id = r.customer_id and a.id = r.astrologer_id;

      perform public.notify_user(cust_user, kinds[i],
        titles[i],
        'Reminder: your ' || r.currency || ' ' || r.price_snapshot || ' consultation is ' ||
          case kinds[i] when 'booking_24h' then 'tomorrow' else 'in about an hour' end || ' at ' ||
          to_char(r.scheduled_at at time zone 'Asia/Kathmandu', 'DD Mon YYYY, HH24:MI') || ' NPT.',
        'booking', r.id, kinds[i], r.id);
      perform public.notify_user(astro_user, kinds[i],
        titles[i],
        'Reminder: a ' || r.currency || ' ' || r.price_snapshot || ' consultation starts ' ||
          case kinds[i] when 'booking_24h' then 'tomorrow' else 'in about an hour' end || ' at ' ||
          to_char(r.scheduled_at at time zone 'Asia/Kathmandu', 'DD Mon YYYY, HH24:MI') || ' NPT.',
        'booking', r.id);
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;

revoke all on function public.generate_reminders() from public, anon, authenticated;
grant execute on function public.generate_reminders() to service_role;

insert into public.schema_migrations (version, name) values ('0029', 'reminders');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0029_reminders_test.sql -- it asserts and rolls back.
