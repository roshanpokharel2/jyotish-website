-- 0033_consultation_join.sql
-- Step 17, Checkpoint 17a of docs/IMPLEMENTATION-PLAN.md (plan Step 18) --
-- who may join a consultation, decided by the database.
--
-- consultation_join_info() answers the whole eligibility question in one
-- transaction, on database time: the caller is the booking's customer or its
-- practitioner (anyone else gets NOT_FOUND, so callers cannot probe bookings),
-- the booking is live (confirmed or in_progress), its payment is paid, and now
-- sits inside [start - join_before_minutes, end + join_after_minutes]. Anything
-- else is CONSULTATION_NOT_JOINABLE. On success it returns the room, the
-- stored consultation mode, and the caller's identity for the token -- the
-- route (17b) mints from exactly these, so grants always match the mode.
--
-- Run after 0032_refund_delete_links.sql.

begin;

create or replace function public.consultation_join_info(p_booking uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b          public.bookings;
  cust_user  uuid;
  astro_user uuid;
  win_before int;
  win_after  int;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then raise exception 'NOT_FOUND'; end if;

  select c.user_id, a.user_id into cust_user, astro_user
    from public.customers c, public.astrologers a
   where c.id = b.customer_id and a.id = b.astrologer_id;
  if p_user is distinct from cust_user and p_user is distinct from astro_user then
    raise exception 'NOT_FOUND';
  end if;

  if b.status not in ('confirmed', 'in_progress') then
    raise exception 'CONSULTATION_NOT_JOINABLE';
  end if;

  -- Exactly one paid row must exist: a refunded payment no longer admits anyone.
  if not exists (select 1 from public.payments p
                  where p.booking_id = b.id and p.status = 'paid') then
    raise exception 'CONSULTATION_NOT_JOINABLE';
  end if;

  win_before := public.setting_num('join_before_minutes', 15)::int;
  win_after := public.setting_num('join_after_minutes', 30)::int;
  if now() < b.scheduled_at - make_interval(mins => win_before)
     or now() > b.ends_at + make_interval(mins => win_after) then
    raise exception 'CONSULTATION_NOT_JOINABLE';
  end if;

  return jsonb_build_object(
    'room', 'consultation_' || b.id,
    'mode', b.consultation_mode,
    'identity', p_user,
    'name', case when p_user = cust_user
      then (select full_name from public.customers where id = b.customer_id)
      else (select name from public.astrologers where id = b.astrologer_id) end);
end;
$$;

revoke all on function public.consultation_join_info(uuid, uuid) from public, anon, authenticated;
grant execute on function public.consultation_join_info(uuid, uuid) to service_role;

insert into public.schema_migrations (version, name) values ('0033', 'consultation_join');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0033_consultation_join_test.sql -- it asserts and rolls back.
