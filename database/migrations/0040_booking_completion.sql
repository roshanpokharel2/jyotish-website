-- 0040_booking_completion.sql
-- Checkpoint C1 of docs/IMPLEMENTATION-PLAN.md (booking completion)
--
-- Nothing moved a booking past `confirmed`: a paid consultation stayed confirmed
-- forever, so a customer could never review it (0030 requires `completed`) and staff
-- lists never showed a finished consultation. No client may update bookings (no
-- UPDATE policy since 0014), so completion is a service-role function, called by the
-- server after it has identified the caller.
--
-- complete_booking(booking, actor, outcome):  outcome 'completed' | 'no_show'
--   * the actor is the booking's own practitioner, or support / admin / super_admin;
--   * the booking is confirmed or in_progress, has a paid payment, and has ended;
--   * staff may also correct a finished booking between completed and no_show;
--   * every change is audited (booking.completed / booking.no_show) with the actor.
-- auto_complete_bookings():
--   * paid bookings still confirmed / in_progress 24 hours after their end become
--     completed, audited with no actor. Re-running changes nothing. Run by the
--     reminders scheduler (POST /api/reminders/run).
-- Money is untouched: the ledger is written at payment approval (0021), so
-- completion changes no balance, payout or refund.
--
-- Additive and re-runnable. Run after 0039_review_guard.sql.

begin;

create or replace function public.complete_booking(p_booking uuid, p_actor uuid, p_outcome text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b          public.bookings;
  actor_role text := (select role from public.users where id = p_actor);
  is_staff   boolean := coalesce(actor_role in ('support', 'admin', 'super_admin'), false);
  is_own     boolean;
begin
  if p_outcome is null or p_outcome not in ('completed', 'no_show') then
    raise exception 'INVALID_OUTCOME';
  end if;

  select * into b from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  is_own := exists (select 1 from public.astrologers where id = b.astrologer_id and user_id = p_actor);
  if not is_own and not is_staff then
    -- The customer and everyone else learn nothing about the booking.
    raise exception 'NOT_FOUND';
  end if;

  if b.status in ('completed', 'no_show') then
    if not is_staff then
      raise exception 'BOOKING_ALREADY_FINISHED';
    end if;
    if b.status = p_outcome then
      raise exception 'BOOKING_ALREADY_FINISHED';
    end if;
  elsif b.status not in ('confirmed', 'in_progress') then
    raise exception 'BOOKING_NOT_COMPLETABLE';
  elsif not exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'paid') then
    raise exception 'BOOKING_NOT_COMPLETABLE';
  elsif now() < b.ends_at then
    raise exception 'BOOKING_NOT_ENDED';
  end if;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (p_actor, actor_role, 'booking.' || p_outcome, 'booking', b.id,
          jsonb_build_object('status', b.status), jsonb_build_object('status', p_outcome));
  update public.bookings set status = p_outcome where id = b.id returning * into b;
  return b;
end;
$$;

create or replace function public.auto_complete_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with due as (
    select b.id, b.status from public.bookings b
     where b.status in ('confirmed', 'in_progress')
       and b.ends_at < now() - interval '24 hours'
       and exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'paid')
       for update
  ), done as (
    update public.bookings b set status = 'completed' from due where b.id = due.id
    returning due.id, due.status as old_status
  ), logged as (
    insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                  previous_state, new_state, reason)
    select null, null, 'booking.completed', 'booking', id,
           jsonb_build_object('status', old_status), jsonb_build_object('status', 'completed'),
           'automatic: 24 hours after the end'
      from done
    returning 1
  )
  select count(*) into n from logged;
  return n;
end;
$$;

revoke all on function public.complete_booking(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_booking(uuid, uuid, text) to service_role;
revoke all on function public.auto_complete_bookings() from public, anon, authenticated;
grant execute on function public.auto_complete_bookings() to service_role;

insert into public.schema_migrations (version, name) values ('0040', 'booking_completion');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0040_booking_completion_test.sql
