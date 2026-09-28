-- 0023_refunds.sql
-- Step 10, Checkpoint 10a of docs/IMPLEMENTATION-PLAN.md (plan Step 14) --
-- recording manual refunds.
--
-- A refund record describes a transfer a human actually made (plan §23/24:
-- changing a status never moves money). The flow is staff-only -- support takes
-- the customer's call, finance/admin/super_admin record and decide -- and goes
-- requested -> approved -> (processing ->) completed, with rejection from
-- requested or approved. Completion writes the reversal ledger entries in 10b;
-- this checkpoint is the record and its guards:
--
--   * Only paid payments are refundable, and open (non-rejected) refunds for
--     one payment never total more than was paid -- enforced by a trigger, not
--     just the functions.
--   * Status steps are trigger-guarded; completed demands the transfer's
--     external reference, rejection demands a note.
--   * No browser INSERT/UPDATE/DELETE policy: every step is a server-only
--     function, each writing its audit row.
--
-- Skipped: staff HTTP endpoints (they arrive with the admin dashboard, Step 20;
-- until then finance works through these functions), the refund-proof upload
-- endpoint (the column exists; external_reference + notes carry the evidence).
--
-- Run after 0022_ledger_delete_links.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------
create table if not exists public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments(id),
  amount             numeric(12,2) not null check (amount > 0),
  currency           text not null default 'NPR',
  reason             text not null check (char_length(reason) between 1 and 1000),
  status             text not null default 'requested' check (status in (
    'requested','approved','processing','completed','rejected')),
  refund_method      text not null default 'esewa' check (refund_method in ('esewa')),
  external_reference text,
  proof_storage_path text,
  processed_by       uuid references public.users(id) on delete set null,
  processed_at       timestamptz,
  notes              text check (notes is null or char_length(notes) <= 2000),
  created_at         timestamptz not null default now()
);

comment on table public.refunds is
  'Manual refunds: each row describes a real transfer a human made. Completion writes reversal ledger entries (10b).';

alter table public.refunds enable row level security;

create index if not exists idx_refunds_payment on public.refunds (payment_id, created_at desc);
create index if not exists idx_refunds_status on public.refunds (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Only the legal steps, with evidence where a step needs it
-- ---------------------------------------------------------------------------
create or replace function public.guard_refund_status()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'requested' then raise exception 'INVALID_REFUND_STATUS'; end if;
    return new;
  end if;

  if old.status = new.status then return new; end if;

  ok := (old.status = 'requested' and new.status in ('approved', 'rejected'))
     or (old.status = 'approved'  and new.status in ('processing', 'completed', 'rejected'))
     or (old.status = 'processing' and new.status = 'completed');
  if not ok then raise exception 'INVALID_REFUND_STATUS'; end if;

  if new.status = 'rejected' and nullif(btrim(new.notes), '') is null then
    raise exception 'INVALID_REFUND_STATUS';
  end if;
  if new.status = 'completed'
     and (new.processed_by is null or new.processed_at is null
          or nullif(btrim(new.external_reference), '') is null) then
    raise exception 'INVALID_REFUND_STATUS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_refunds_status on public.refunds;
create trigger trg_refunds_status
before insert or update of status on public.refunds
for each row execute function public.guard_refund_status();

-- ---------------------------------------------------------------------------
-- 3. Never promise more than was paid
-- ---------------------------------------------------------------------------
-- Every open (non-rejected) refund reserves its amount: their total per payment
-- must stay within what the payment brought in. Rejected rows release their
-- reservation. Runs on insert and on any amount/status rewrite, whatever the
-- writer -- a second approval cannot sneak past the first one's reservation.
create or replace function public.guard_refund_amount()
returns trigger
language plpgsql
as $$
declare
  paid numeric(12,2);
  open numeric(12,2);
begin
  if tg_op = 'UPDATE'
     and new.amount = old.amount
     and (new.status = old.status or (old.status = 'rejected') = (new.status = 'rejected')) then
    return new;
  end if;

  select p.amount into paid from public.payments p where p.id = new.payment_id;
  if not found or (select status from public.payments where id = new.payment_id) <> 'paid' then
    raise exception 'REFUND_NOT_ALLOWED';
  end if;

  select coalesce(sum(r.amount), 0) into open from public.refunds r
   where r.payment_id = new.payment_id and r.status <> 'rejected'
     and (tg_op = 'INSERT' or r.id <> new.id);
  if open + new.amount > paid then
    raise exception 'REFUND_TOO_LARGE';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_refunds_amount on public.refunds;
create trigger trg_refunds_amount
before insert or update of amount, status on public.refunds
for each row execute function public.guard_refund_amount();

-- ---------------------------------------------------------------------------
-- 4. Who can read (nobody writes through RLS)
-- ---------------------------------------------------------------------------
drop policy if exists "finance and admins can read refunds" on public.refunds;
create policy "finance and admins can read refunds"
on public.refunds
for select using (public.has_role('finance','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 5. The steps (completion and its reversals land in 10b)
-- ---------------------------------------------------------------------------
-- The actor is identified by user id; their role is read from the database.
-- Finance, admin and super_admin record and decide -- nobody refunds a payment
-- for their own booking.
create or replace function public.refund_actor_ok(p_actor uuid, p_payment uuid)
returns void
language plpgsql
as $$
declare
  actor_role text;
  cust_user  uuid;
  astro_user uuid;
begin
  select role into actor_role from public.users where id = p_actor;
  if actor_role is null or actor_role not in ('finance', 'admin', 'super_admin') then
    raise exception 'FORBIDDEN';
  end if;
  select c.user_id, a.user_id into cust_user, astro_user
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    join public.customers c on c.id = b.customer_id
    join public.astrologers a on a.id = b.astrologer_id
   where p.id = p_payment;
  if p_actor = cust_user or p_actor = astro_user then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

revoke all on function public.refund_actor_ok(uuid, uuid) from public, anon, authenticated;
grant execute on function public.refund_actor_ok(uuid, uuid) to service_role;

create or replace function public.request_refund(p_payment uuid, p_actor uuid, p_amount numeric, p_reason text)
returns public.refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.refunds;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_INPUT'; end if;
  if nullif(btrim(p_reason), '') is null or char_length(p_reason) > 1000 then
    raise exception 'INVALID_INPUT';
  end if;
  perform public.refund_actor_ok(p_actor, p_payment);

  insert into public.refunds (payment_id, amount, currency, reason, status)
  select p_payment, p_amount, p.currency, btrim(p_reason), 'requested'
    from public.payments p where p.id = p_payment
  returning * into created;
  if not found then raise exception 'NOT_FOUND'; end if;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id, new_state, reason)
  values (p_actor, (select role from public.users where id = p_actor),
          'refund.requested', 'refund', created.id,
          jsonb_build_object('status', 'requested', 'amount', created.amount), btrim(p_reason));

  return created;
end;
$$;

revoke all on function public.request_refund(uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.request_refund(uuid, uuid, numeric, text) to service_role;

create or replace function public.approve_refund(p_refund uuid, p_actor uuid)
returns public.refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.refunds;
begin
  select * into r from public.refunds where id = p_refund for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.status <> 'requested' then raise exception 'REFUND_ALREADY_PROCESSED'; end if;
  perform public.refund_actor_ok(p_actor, r.payment_id);

  update public.refunds set status = 'approved' where id = p_refund returning * into r;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state)
  values (p_actor, (select role from public.users where id = p_actor),
          'refund.approved', 'refund', p_refund,
          jsonb_build_object('status', 'requested'), jsonb_build_object('status', 'approved'));

  return r;
end;
$$;

revoke all on function public.approve_refund(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_refund(uuid, uuid) to service_role;

create or replace function public.reject_refund(p_refund uuid, p_actor uuid, p_note text)
returns public.refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  r    public.refunds;
  prev text;
begin
  if nullif(btrim(p_note), '') is null or char_length(p_note) > 2000 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into r from public.refunds where id = p_refund for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if r.status not in ('requested', 'approved') then raise exception 'REFUND_ALREADY_PROCESSED'; end if;
  perform public.refund_actor_ok(p_actor, r.payment_id);
  prev := r.status;

  update public.refunds set status = 'rejected', notes = btrim(p_note)
   where id = p_refund returning * into r;

  insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                previous_state, new_state, reason)
  values (p_actor, (select role from public.users where id = p_actor),
          'refund.rejected', 'refund', p_refund,
          jsonb_build_object('status', prev), jsonb_build_object('status', 'rejected'),
          btrim(p_note));

  return r;
end;
$$;

revoke all on function public.reject_refund(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reject_refund(uuid, uuid, text) to service_role;

insert into public.schema_migrations (version, name) values ('0023', 'refunds');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0023_refunds_test.sql -- it asserts and rolls back.
