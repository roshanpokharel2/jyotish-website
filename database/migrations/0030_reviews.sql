-- 0030_reviews.sql
-- Step 14, Checkpoint 14a of docs/IMPLEMENTATION-PLAN.md (plan Step 19) --
-- customer reviews, database side.
--
-- One review per booking (unique), stars 1-5, an optional private note for
-- staff eyes only, and a published/hidden moderation flag. Eligibility is
-- checked twice: the INSERT policy admits only the booking's own customer with
-- a completed booking, and a trigger re-checks (for every writer) while filling
-- customer_id/astrologer_id from the booking -- the request never supplies who
-- or for whom. Reviews are immutable once written; staff hide abuse with the
-- status instead of editing it.
--
-- Two public-safe surfaces (private_feedback never leaves the staff room):
-- public_reviews (stars, no who, no notes) for everyone, and
-- practitioner_ratings (count + average over published reviews) for the
-- booking UI. The practitioner's number is always computed, never submitted.
--
-- Bookings become completed by the consultation/admin flow (Steps 18/20); until
-- then eligibility is satisfiable by direct writes, as in the test.
--
-- Run after 0029_reminders.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null unique references public.bookings(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete cascade,
  astrologer_id  uuid references public.astrologers(id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  private_feedback text check (private_feedback is null or char_length(private_feedback) <= 2000),
  status         text not null default 'published' check (status in ('published', 'hidden')),
  created_at     timestamptz not null default now()
);

comment on table public.reviews is
  'One immutable review per completed booking. private_feedback is staff-only; the public reads public_reviews.';

alter table public.reviews enable row level security;

create index if not exists idx_reviews_astrologer on public.reviews (astrologer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Eligibility + authorship, for every writer
-- ---------------------------------------------------------------------------
create or replace function public.guard_review_insert()
returns trigger
language plpgsql
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = new.booking_id;
  if not found then raise exception 'REVIEW_NOT_ALLOWED'; end if;
  if b.status <> 'completed' then raise exception 'REVIEW_NOT_ALLOWED'; end if;

  -- Who and for whom comes from the booking, never from the request.
  new.customer_id := b.customer_id;
  new.astrologer_id := b.astrologer_id;
  return new;
end;
$$;

drop trigger if exists trg_reviews_insert on public.reviews;
create trigger trg_reviews_insert
before insert on public.reviews
for each row execute function public.guard_review_insert();

-- ---------------------------------------------------------------------------
-- 3. Policies: customers write once, read own; staff read and hide
-- ---------------------------------------------------------------------------
-- The policy restates the trigger's rule against the caller's own identity, so
-- a customer can only ever insert for their own completed booking.
drop policy if exists "customers can review own completed bookings" on public.reviews;
create policy "customers can review own completed bookings"
on public.reviews
for insert with check (
  exists (select 1 from public.bookings b
           join public.customers c on c.id = b.customer_id
          where b.id = booking_id and c.user_id = auth.uid() and b.status = 'completed'));

drop policy if exists "customers read own reviews" on public.reviews;
create policy "customers read own reviews"
on public.reviews
for select using (customer_id in (select id from public.customers where user_id = auth.uid()));

-- Moderation reads the notes and flips the flag; finance and above read all.
drop policy if exists "review staff read all reviews" on public.reviews;
create policy "review staff read all reviews"
on public.reviews
for select using (public.has_role('moderator','finance','admin','super_admin'));

drop policy if exists "review staff can hide reviews" on public.reviews;
create policy "review staff can hide reviews"
on public.reviews
for update using (public.has_role('moderator','admin','super_admin'))
with check (public.has_role('moderator','admin','super_admin'));

-- ---------------------------------------------------------------------------
-- 4. Public surfaces (no private_feedback, no customer identity)
-- ---------------------------------------------------------------------------
create or replace view public.public_reviews as
select r.id, r.astrologer_id, r.rating, r.created_at
  from public.reviews r
 where r.status = 'published';

create or replace view public.practitioner_ratings as
select r.astrologer_id,
       count(*) as review_count,
       round(avg(r.rating::numeric), 2) as avg_rating
  from public.reviews r
 where r.status = 'published'
 group by r.astrologer_id;

-- Everyone may read the public surfaces (visitors pick practitioners on them).
-- They are plain owner-side views: the WHERE published clause -- not the
-- caller's RLS -- decides what is visible, which is exactly the plan's
-- "separate view for the public surface". Verified in the test: anon reads the
-- stars and the averages, while private_feedback and customer identity have no
-- column to leak through.
revoke all on public.public_reviews from public, anon, authenticated;
grant select on public.public_reviews to anon, authenticated;
revoke all on public.practitioner_ratings from public, anon, authenticated;
grant select on public.practitioner_ratings to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0030', 'reviews');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0030_reviews_test.sql -- it asserts and rolls back.
