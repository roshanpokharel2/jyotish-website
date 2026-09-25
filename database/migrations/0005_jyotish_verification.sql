-- 0005_jyotish_verification.sql
-- Step 6 of docs/IMPLEMENTATION-PLAN.md
--
-- Practitioner onboarding and verification. The rule this enforces: an unapproved
-- practitioner is never bookable, and the practitioner cannot be the one who decides
-- they are approved.
--
-- Additive and re-runnable. Run after 0004_audit_log.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Lifecycle
-- ---------------------------------------------------------------------------
--   pending_review -> active     (approved by staff)
--   pending_review -> rejected   (with a reason)
--   active        <-> suspended  (staff action)
--   active         -> inactive   (practitioner steps back voluntarily)
--
-- 'active' stays the single bookable state, because chat-app.js and every later
-- booking query already filter on it. Approval makes a practitioner active; there is
-- no separate 'approved' limbo state to keep in sync.

update public.astrologers set status = 'suspended' where status in ('paused','blocked');

alter table public.astrologers alter column status set default 'pending_review';

alter table public.astrologers drop constraint if exists astrologers_status_check;
alter table public.astrologers add constraint astrologers_status_check
  check (status in ('pending_review','active','rejected','suspended','inactive'));

alter table public.astrologers add column if not exists applied_at timestamptz not null default now();
alter table public.astrologers add column if not exists reviewed_by uuid references public.users(id) on delete set null;
alter table public.astrologers add column if not exists reviewed_at timestamptz;
alter table public.astrologers add column if not exists rejection_reason text;
alter table public.astrologers add column if not exists verification_documents jsonb not null default '{}'::jsonb;

comment on column public.astrologers.verification_documents is
  'Storage paths of uploaded credentials in the private jyotish-documents bucket. Never a public URL.';

-- A rejection without a reason is useless to the practitioner and to the audit trail.
alter table public.astrologers drop constraint if exists astrologers_rejection_reason_check;
alter table public.astrologers add constraint astrologers_rejection_reason_check
  check (status <> 'rejected' or rejection_reason is not null);

create index if not exists idx_astrologers_status on public.astrologers (status, name);

-- ---------------------------------------------------------------------------
-- 2. Status is not self-writable
-- ---------------------------------------------------------------------------
-- The practitioner legitimately owns UPDATE on their own row (bio, languages, photo),
-- and RLS grants rows rather than columns -- so without this trigger anyone who can
-- apply could also set themselves 'active' and start taking bookings. Same pattern as
-- the role guard in 0002. See docs/ARCHITECTURE-DECISIONS.md AD-9c.

create or replace function public.guard_astrologer_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_reviewer boolean := public.has_role('moderator','admin','super_admin');
begin
  if tg_op = 'INSERT' then
    -- Self-service applications always start in review, whatever the client sent.
    if auth.uid() is not null and not is_reviewer then
      new.status := 'pending_review';
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
    new.is_active := (new.status = 'active');
    return new;
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is not null and not is_reviewer then
      raise exception 'FORBIDDEN: only staff can change a practitioner''s status'
        using errcode = '42501';
    end if;

    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    new.reviewed_at := now();

    insert into public.audit_log (
      actor_user_id, actor_role, action, entity_type, entity_id,
      previous_state, new_state, reason
    )
    values (
      auth.uid(),
      (select role from public.users where id = auth.uid()),
      'jyotish.status_changed', 'astrologer', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      new.rejection_reason
    );

    -- Approval is what grants the role. An applicant stays 'customer' while pending, so
    -- users.role never claims a practitioner who has not been verified. Only promote
    -- from 'customer' -- never demote staff who also practise.
    if new.status = 'active' then
      update public.users set role = 'jyotish'
       where id = new.user_id and role = 'customer';
    end if;
  end if;

  -- is_active predates the status column and is still read by older queries; keep the
  -- two from drifting rather than leaving a second source of truth.
  new.is_active := (new.status = 'active');
  return new;
end;
$$;

drop trigger if exists trg_astrologers_guard_status on public.astrologers;
create trigger trg_astrologers_guard_status
before insert or update on public.astrologers
for each row execute function public.guard_astrologer_status();

-- ---------------------------------------------------------------------------
-- 3. Visibility
-- ---------------------------------------------------------------------------
-- Customers see only bookable practitioners. Staff see everyone, which is what the
-- applications queue needs. The practitioner keeps self access to their own row.

drop policy if exists "authenticated users can read active astrologers" on public.astrologers;
create policy "authenticated users can read active astrologers"
on public.astrologers
for select using (status = 'active' and auth.role() = 'authenticated');

drop policy if exists "staff can view all astrologers" on public.astrologers;
create policy "staff can view all astrologers"
on public.astrologers
for select using (public.is_staff());

drop policy if exists "reviewers can update any astrologer" on public.astrologers;
create policy "reviewers can update any astrologer"
on public.astrologers
for update using (public.has_role('moderator','admin','super_admin'))
with check (public.has_role('moderator','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 4. Verification documents bucket
-- ---------------------------------------------------------------------------
-- Private. Objects are stored under {auth.uid()}/..., which is what the path checks
-- below rely on. Credentials are personal data: no public URLs, signed URLs only.

insert into storage.buckets (id, name, public)
values ('jyotish-documents', 'jyotish-documents', false)
on conflict (id) do nothing;

drop policy if exists "jyotish can upload own documents" on storage.objects;
create policy "jyotish can upload own documents"
on storage.objects for insert with check (
  bucket_id = 'jyotish-documents'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "jyotish can read own documents" on storage.objects;
create policy "jyotish can read own documents"
on storage.objects for select using (
  bucket_id = 'jyotish-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "staff can read jyotish documents" on storage.objects;
create policy "staff can read jyotish documents"
on storage.objects for select using (
  bucket_id = 'jyotish-documents'
  and public.is_staff()
);

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0005_jyotish_verification_test.sql -- it asserts and rolls back.
--
-- Applications queue:
--   select id, name, status, applied_at from public.astrologers
--    where status = 'pending_review' order by applied_at;
--
-- Approve one (as staff, or from the SQL editor):
--   update public.astrologers set status = 'active' where id = '...';
