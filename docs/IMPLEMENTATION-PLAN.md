# Jyotish Marketplace — Implementation Plan

How the master architecture (eSewa QR + manual verification, audio/video consultations,
ledger, manual payouts) fits onto **this** codebase, as ordered steps.

Read `ARCHITECTURE-DECISIONS.md` first — it records why existing tables are reused
instead of replaced. This file is the build order. Work one step at a time; do not
start a step before its dependencies are green.

---

## 0. Where we are today

### Stack (already correct)

| Layer | What exists |
|---|---|
| Frontend | Next.js App Router shell (`app/`) mounting a legacy browser runtime (`public/site-assets/`) |
| Backend | Supabase only — Postgres, Auth, Storage, Realtime. No Node server. Correct per architecture. |
| DB | `database/schema.sql` — 29 tables, RLS enabled on all of them |
| Privileged ops | **None.** Zero Edge Functions exist. Everything is browser → Supabase with the anon key. |

### What the browser actually uses

`chat_conversations`, `chat_messages`, `chat_participants`, `customers`, `astrologers`,
`question_consultations`, `service_requests`, `vastu_*`, `daily_horoscopes`, `rashifal_entries`.

### What exists but is dead code

`consultants`, `bookings`, `consultations`, `payments`, `tokens`, `availability`,
`services`, `notifications`, `reports`. Declared in the schema, never queried.

**This is good news.** The marketplace core is unbuilt rather than built wrong, so we
add to these tables instead of migrating live data.

### What is missing entirely

`reservations`, `ledger_entries`, `payouts`, `refunds`, `reviews`, `email_jobs`,
`audit_log`, `platform_settings`, `notification_preferences`, `knowledge_items`,
consultation modes (audio/video), payment proof columns, the `payment-proofs`
storage bucket, and every Edge Function.

### Known defects to fix on the way through

1. **Duplicate frontend tree.** `js/` and `public/site-assets/js/` are near-identical.
   Only `public/site-assets/` is served by `app/legacy-runtime.js`. Edits to `js/` do
   nothing. Fixed in Step 1.
2. **Seed astrologer references a non-existent user.** `schema.sql` inserts an
   astrologer with `user_id = '00000000-…'`, but `astrologers.user_id` is
   `not null references public.users(id)`. On a fresh database this insert fails.
   Fixed in Step 2.
3. **Role checks are inlined everywhere.** `exists (select 1 from public.users where
   id = auth.uid() and role = 'admin')` is copy-pasted into ~8 policies. One helper
   function instead — Step 3.
4. **`payments` has no INSERT/UPDATE policy** (read-only to clients). That is
   accidentally correct and we keep it that way: only Edge Functions write payments.

---

## Build order

Each step lists: **what**, **why**, **depends on**, **files**, **test**, **security**.
Migrations are additive `ALTER`s in `database/migrations/NNNN_name.sql`.
`database/schema.sql` stays the original from-scratch snapshot and is **not** rewritten
per step; a fresh project runs it once and then every migration in order. Self-asserting
checks live in `database/tests/`.

**Status:** Steps 1–6 done and applied to the live Supabase project; every test passes.
Apply with `node scripts/db.mjs <file.sql>`.

---

### Step 1 — Repo hygiene

**What** Delete the unserved `js/` copy. Add `database/migrations/`. Add `.env.example`
entries for the service-role key (Edge Functions only, never `NEXT_PUBLIC_`).

**Why** Two copies of 20 modules guarantees a future bug where a fix lands in the
file nobody loads.

**Depends on** nothing.

**Files** delete `js/`; create `database/migrations/`; edit `.env.example`, `README.md`.

**Test** `npm run dev`, load `/` and `/chat`, confirm nothing broke (nothing imports `js/`).

**Security** Confirm no secret is in `public/site-assets/app-config.js` beyond the
Supabase URL + anon key. Anon key is public by design; service-role key must never
appear under `public/` or any `NEXT_PUBLIC_` variable.

---

### Step 2 — Migration baseline + schema repairs

**What** `0001_baseline_fixes.sql`:
- Remove the broken zero-UUID astrologer seed; replace with a documented SQL snippet in
  the README that maps a real `auth.users` row to an astrologer.
- Add `updated_at` triggers missing on `payments`, `notifications`, `availability`.
- Add indexes justified by the queries we are about to write (`payments(status,
  created_at)`, `bookings(astrologer_id, scheduled_at)`).

**Why** A fresh project must build cleanly from `schema.sql` before anything is layered on.

**Depends on** Step 1.

**Files** `database/migrations/0001_baseline_fixes.sql`.

**Test** Run `schema.sql` then `0001` on an empty Supabase project. No errors.

**Security** None new.

---

### Step 3 — Roles and authorization primitives

**What**
- Widen `users.role` check to:
  `customer | jyotish | moderator | support | finance | admin | super_admin`.
  Keep `astrologer` as an accepted alias during transition, then migrate rows to `jyotish`.
- Add `public.has_role(variadic text[])` — `security definer`, `stable`,
  `set search_path = public` — returning whether `auth.uid()` holds any of the roles.
- Rewrite the ~8 inline admin policy predicates to call it.
- Add `public.is_staff()` convenience wrapper.

**Why** Every later step's RLS depends on one trustworthy role check. Section 4 of the
architecture: authorization is server-side, never a frontend boolean.

**Depends on** Step 2.

**Files** `database/migrations/0002_roles.sql`.

**Test** Create one user per role in SQL. Assert `has_role('admin')` is false for a
customer session and true for an admin session, via `set local role authenticated` +
`set local request.jwt.claims`.

**Security** `has_role` must be `security definer` (policies on `users` would otherwise
recurse) with a locked `search_path`. It must read `public.users`, never a JWT claim the
client can influence.

---

### Step 4 — Platform settings

**What** `platform_settings` table: `key text primary key`, `value jsonb`,
`description`, `updated_by`, `updated_at`. Seed:
`consultation_commission_percent` (15), `reservation_minutes` (10),
`join_before_minutes` (15), `join_after_minutes` (30), `minimum_payout`,
`cancellation_window_hours`, `esewa_qr_path`, `esewa_account_label`.
Plus `public.setting(key)` returning jsonb.

**Why** Architecture §28: no `15` or `10` scattered through the code. Every later step
reads its numbers from here, so it must exist before them.

**Depends on** Step 3.

**Files** `database/migrations/0003_platform_settings.sql`.

**Test** Read a setting as a customer (allowed for public keys), write as customer
(denied), write as super_admin (allowed).

**Security** RLS: public-safe keys readable by authenticated users; write restricted to
`has_role('admin','super_admin')`. Never store secrets (API keys) here — those are Edge
Function environment secrets.

---

### Step 5 — Audit log

**What** `audit_log`: `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`,
`previous_state jsonb`, `new_state jsonb`, `reason`, `metadata`, `created_at`.
Insert-only; no update or delete policy for anyone.

**Why** Architecture §36/39: a human approves money manually, so every financial action
must be traceable. Built before the financial steps so they can write to it from day one.

**Depends on** Step 3.

**Files** `database/migrations/0004_audit_log.sql`.

**Test** Insert as service role; attempt update as super_admin → denied.

**Security** No UPDATE/DELETE policy at all. Readable only by `has_role('admin',
'super_admin','finance')`.

---

### Step 6 — Jyotish onboarding and verification

**What**
- Stop using `consultants` (unused). Mark deprecated in a comment; drop in a later
  cleanup migration once confirmed empty in production.
- Extend `astrologers.status` to
  `pending_review | approved | active | suspended | rejected | inactive`.
- Add `applied_at`, `reviewed_by`, `reviewed_at`, `rejection_reason`,
  `verification_documents jsonb`.
- RLS: public/customer SELECT only where `status in ('approved','active')`.
  Self SELECT/UPDATE of own row, but **status is not self-writable** — enforced by a
  trigger that rejects a status change unless `has_role('admin','super_admin')`.
- Private storage bucket `jyotish-documents`, path-prefixed by `auth.uid()`.

**Why** Architecture §5: an unapproved practitioner must never be bookable, and the
frontend must not be the thing enforcing it.

**Depends on** Steps 3, 5.

**Files** `database/migrations/0005_jyotish_verification.sql`;
`public/site-assets/js/jyotish-apply.js`.

**Test** Create an astrologer with `status='pending_review'`; confirm a customer session
cannot select it; attempt self-approval via the client → denied by trigger.

**Security** The status trigger is the control. RLS alone is insufficient because the
practitioner legitimately owns UPDATE on their own row.

---

### Step 7 — Services and consultation modes

**What** Reuse `services`, do not create a new table. Add:
`astrologer_id` (fk, nullable for legacy platform-wide rows), `consultation_type_id`,
`slug`, `duration_minutes`, `currency`, `consultation_mode` check
(`audio | video | audio_video | chat | in_person`), `status`
(`draft|active|inactive|archived`), `updated_at`.
Keep `consultation_types` as the taxonomy (ONLINE/DIRECT/QUESTION) — services reference it.

**Why** Architecture §6/7. Modes are a column, not three parallel systems.

**Depends on** Step 6.

**Files** `database/migrations/0006_services.sql`; jyotish dashboard service CRUD module.

**Test** A jyotish can create a service on their own profile only; setting
`astrologer_id` to another practitioner is rejected by the WITH CHECK clause.

**Security** RLS WITH CHECK must verify `astrologer_id` resolves to `auth.uid()`, or a
jyotish can publish services under a rival's profile.

---

### Step 8 — Availability and slot computation

**What** Keep the `availability` table (weekly recurring rules). Add
`availability_exceptions` (date-specific blocks/holidays). Add a
`public.available_slots(astrologer_id, service_id, from_date, to_date)` SQL function
that returns free slots by subtracting confirmed bookings and live reservations from
the availability rules.

**Why** Slot freeness must be computed server-side; a client computing it will race.

**Depends on** Step 7, and the `reservations` table from Step 9 (build 9 first if you
prefer; the function references it).

**Files** `database/migrations/0007_availability.sql`.

**Test** Book a slot, confirm it disappears from `available_slots` for other users.

**Security** The function is `security definer` but must expose only busy/free, never
the other customer's identity.

---

### Step 9 — Reservations (slot locking)

**What** New `reservations`: `id`, `customer_id`, `astrologer_id`, `service_id`,
`scheduled_start`, `scheduled_end`, `expires_at`, `status`
(`active|consumed|expired|cancelled`), timestamps.
Partial unique index preventing two `active` or `consumed` reservations overlapping the
same practitioner/time. `expires_at` computed server-side as
`now() + setting('reservation_minutes')`.

**Why** Architecture §17. Ten-minute payment window, enforced by the database clock.

**Depends on** Steps 4, 7.

**Files** `database/migrations/0008_reservations.sql`;
Edge Function `supabase/functions/create-reservation/`.

**Test** Two sessions reserve the same slot concurrently → exactly one succeeds. Wait
past expiry → slot bookable again.

**Security** `expires_at` and `scheduled_*` are set by the Edge Function from server
time and the service duration. The client sends only ids. Never accept a client
timestamp.

---

### Step 10 — Bookings and consultations

**What** Define the split clearly and keep both existing tables:
- `bookings` = the commercial appointment (who, what service, when, price snapshot,
  lifecycle status).
- `consultations` = the live session (room id, actual start/end).

Add to `bookings`: `service_id`, `reservation_id`, `consultation_mode` (snapshotted from
the service at booking time), `price_snapshot`, `commission_percent_snapshot`,
`currency`, widened `status`
(`requested|payment_pending|confirmed|in_progress|completed|cancelled|no_show|expired`).
Add to `consultations`: `provider`, `provider_room_id`, `consultation_mode`,
`actual_started_at`, `actual_ended_at`.

**Why** Architecture §8: mode and price are snapshotted so a later service edit cannot
retroactively change a sold booking. Payment state stays on `payments`, never merged
into booking status.

**Depends on** Step 9.

**Files** `database/migrations/0009_bookings.sql`.

**Test** Create a booking, change the parent service's price and mode, confirm the
booking is unchanged.

**Security** Price and commission snapshots are written by the Edge Function from
`services.price` and `platform_settings`, never from the request body.

---

### Step 11 — Payments: eSewa QR + proof upload

**What** ALTER the existing `payments` table (do not replace it):
- Make `astrologer_id` nullable — money goes to the platform, not the practitioner.
- Add `booking_id` link (exists), `provider` (`esewa`), `payment_method`
  (`manual_qr|api|cash|wallet`), `verification_method` (`manual|webhook|api`),
  `proof_storage_path`, `customer_reference`, `admin_notes`, `reviewed_by`,
  `reviewed_at`, `rejection_reason`, `paid_at`, `metadata`, `updated_at`.
- Widen `status` to
  `created|awaiting_payment|proof_submitted|under_review|paid|rejected|cancelled|refunded|partially_refunded`.
- Private storage bucket `payment-proofs`, path `{auth.uid()}/{payment_id}/…`.
- Edge Functions: `create-payment` (derives amount from the service, never the client),
  `submit-payment-proof`.

**Why** Architecture §18–26. The current `payments.status` (`pending|verified|failed|
refunded`) cannot express "customer says they paid, admin has not looked yet".

**Depends on** Step 10.

**Test** Attempt to create a payment with `{"amount": 1}` in the request body →
server ignores it and writes the real service price. Attempt to read another customer's
proof object from storage → denied.

**Security** The highest-risk step.
- Client can never write `payments.status`; no client UPDATE policy on the table.
- `payment-proofs` bucket is private, per-user path prefix, signed URLs only.
- Amount is derived server-side. Proof filename/MIME validated; size capped.

---

### Step 12 — Super Admin verification queue

**What** Admin UI listing `payments` where `status in ('proof_submitted','under_review')`
with signed proof URL, customer, jyotish, service, amount, reference, submitted time.
Edge Functions `approve-payment` and `reject-payment`.

`approve-payment` runs one transaction: verify role → verify payment state → set
`paid` → confirm booking → consume reservation → write ledger entries → write
notifications and email jobs → write audit log.

**Why** Architecture §27–30. This is the MVP's money gate.

**Depends on** Steps 11, 13 (ledger must exist for the transaction to complete).

**Files** `supabase/functions/approve-payment/`, `reject-payment/`; admin UI module.

**Test** Approve a payment twice → the second call returns
`PAYMENT_ALREADY_PROCESSED` and creates no second ledger entry. Call it with a
customer's JWT → `FORBIDDEN`.

**Security** Role check inside the function against the database, not the JWT. The whole
approval is one SQL function called by the Edge Function so a partial failure cannot
leave a paid payment with no ledger row. Idempotent on payment state.

---

### Step 13 — Financial ledger

**What** `ledger_entries`: `id`, `booking_id`, `payment_id`, `astrologer_id`,
`entry_type` (`platform_gross|platform_commission|jyotish_payable|payout|refund_reversal`),
`amount`, `currency`, `direction` (`credit|debit`), `reversal_of_entry_id`,
`commission_percent`, `metadata`, `created_at`. No UPDATE or DELETE policy for anyone.
Plus a `jyotish_balances` view: earned, paid out, payable.

**Why** Architecture §31/§42. Money received by the platform, commission, amount payable
to the jyotish, and amount actually paid are four distinct numbers.

**Depends on** Step 10.

**Test** Approve a NPR 2,000 booking at 15% → three entries (gross 2,000, commission
300, payable 1,700). `jyotish_balances` shows payable 1,700, paid 0.

**Security** Append-only. Corrections are reversal rows referencing
`reversal_of_entry_id`; originals are never edited or deleted.

---

### Step 14 — Refunds (manual)

**What** `refunds`: `id`, `payment_id`, `amount`, `reason`, `status`
(`requested|approved|processing|completed|rejected`), `refund_method`,
`external_reference`, `proof_storage_path`, `processed_by`, `processed_at`, `notes`.
Admin records the real transfer; the system then writes reversal ledger entries.

**Why** Architecture §23/24: changing a status does not move money. The record describes
a transfer a human actually made.

**Depends on** Step 13.

**Security** Refund amount must be `<=` the paid amount minus refunds already completed;
enforced by a constraint plus a check in the Edge Function.

---

### Step 15 — Jyotish payouts (manual)

**What** `payouts` with statuses `pending|approved|processing|paid|failed|cancelled`,
`external_reference`, `processed_by`, `processed_at`. Jyotish requests a payout against
their `payable` balance; admin records the real transfer; a `payout` ledger entry debits
the payable balance.

**Depends on** Step 13.

**Security** Requested amount validated against the computed balance server-side, never
the number the dashboard displayed.

---

### Step 16 — Notifications and email jobs

**What** Reuse `notifications` (add `data jsonb`, rename semantics of `is_read` to
`read_at` or keep both). Add `notification_preferences` and `email_jobs`
(`pending|processing|sent|failed|cancelled`, `attempts`, `last_error`, `scheduled_for`).
A `send-emails` Edge Function drains the queue, invoked by pg_cron.

**Why** Architecture §14/§38: approval must not fail because the email provider is down.

**Depends on** Step 12.

**Security** `email_jobs` readable only by staff — payloads contain personal data.

---

### Step 17 — Reminders

**What** pg_cron job scheduling 24-hour and 1-hour reminders. A unique
`(booking_id, reminder_kind)` key makes a double run a no-op.

**Depends on** Step 16.

---

### Step 18 — Audio / video consultations

**What** LiveKit. Edge Function `join-consultation`: authenticate → confirm the caller
is the booking's customer or its jyotish → booking confirmed and payment paid → server
time inside
`[start - join_before_minutes, end + join_after_minutes]` → mint a short-lived token
whose grants match `consultation_mode` (audio: publish audio only; video/audio_video:
audio + video). Room is `consultation_{id}`, one per consultation. Recording off.

**Why** Architecture §12–21, §41–44.

**Depends on** Steps 10, 12.

**Security** Token grants are derived from the stored mode, not a request parameter. No
token is ever persisted. LiveKit API secret lives only in Edge Function secrets.

---

### Step 19 — Reviews

**What** `reviews` with `unique(booking_id)`, rating 1–5, `private_feedback`, `status`.
Eligibility (customer owns the booking, booking completed, no existing review) enforced
by policy and trigger. Practitioner rating is computed from reviews, never submitted.

**Depends on** Step 18.

**Security** `private_feedback` must not be exposed by the public review RLS policy —
use a separate view for the public surface rather than relying on the client to omit
the column.

---

### Step 20 — Admin dashboard consolidation

**What** `/admin` sections: Overview, Jyotish Applications, Jyotish, Customers, Services,
Bookings, Payment Verification, Refunds, Payouts, Reviews, Settings, Audit Log.
Role-gated per section, with every mutation going through an Edge Function.

**Depends on** Steps 6, 12, 14, 15, 19.

---

### Step 21 — Knowledge foundation (no AI)

**What** `knowledge_items` per architecture §46 — `author_id`, `content_type`, `status`,
`visibility`, `language`. Authoring and moderation only.

**Explicitly not built:** embeddings, vector search, RAG, LLM calls, AI billing.

---

## Rules that hold across every step

1. The client never writes payment status, booking confirmation, ledger rows, payout
   amounts, roles, or timestamps. Those are Edge Function territory.
2. Amounts are read from the database, never from the request body.
3. Time comes from the database, never from the browser.
4. Financial rows are append-only; corrections are reversals.
5. No secret ever appears in a `NEXT_PUBLIC_` variable or under `public/`.
6. Every migration is additive and re-runnable; `schema.sql` is regenerated after each.
7. Errors use the codes in architecture §35: `UNAUTHENTICATED`, `FORBIDDEN`,
   `NOT_FOUND`, `INVALID_INPUT`, `CONFLICT`, `PAYMENT_ALREADY_PROCESSED`,
   `RESERVATION_EXPIRED`, `CONSULTATION_NOT_JOINABLE`, `REVIEW_NOT_ALLOWED`.
