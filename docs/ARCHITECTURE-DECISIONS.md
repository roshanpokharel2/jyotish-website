# Architecture Decisions

Decisions taken when fitting the master architecture onto the existing schema.
Recorded so nobody re-litigates them mid-build. Companion to `IMPLEMENTATION-PLAN.md`.

---

## AD-1 — `astrologers` stays the practitioner table; `consultants` is retired

The schema has two practitioner tables with almost identical columns. `astrologers` is
referenced by `bookings`, `consultations`, `payments`, `availability`, `chat_conversations`,
`question_consultations`, and `tokens`. `consultants` is referenced by one nullable column
on `astrologers` and by no frontend code.

**Decision:** `astrologers` is the jyotish table. `consultants` is deprecated and dropped in a
later cleanup migration once confirmed empty. Renaming `astrologers` → `jyotish` was rejected:
it breaks seven foreign keys and every existing policy for a cosmetic gain.

---

## AD-2 — `bookings` and `consultations` are both kept, with distinct jobs

The master architecture describes one "consultation" entity; the schema has two tables.
Rather than merge them:

- **`bookings`** — the commercial appointment. Who, which service, when, price snapshot,
  commission snapshot, lifecycle status. Payments attach here.
- **`consultations`** — the live session. Provider, room id, actual start/end.

A booking may exist without a consultation (cancelled before joining). This matches the
architecture's own split of video fields onto the session while payment attaches to the order.

---

## AD-3 — `services` is extended, not replaced

The existing `services` table is a global catalog with no owner. The architecture needs
per-practitioner services. Adding `astrologer_id`, `duration_minutes`, `consultation_mode`,
`slug`, `currency` and `status` to it is a smaller change than a new `jyotish_services`
table plus a data migration. `consultation_types` is kept as the taxonomy
(ONLINE / DIRECT / QUESTION) that services reference.

---

## AD-4 — Consultation mode is a column, not three subsystems

`audio`, `video` and `audio_video` share one booking flow, one join authorization path and
one LiveKit room. The mode only changes which publish grants the minted token carries.
It lives on the service and is **snapshotted onto the booking** so that editing a service
later cannot retroactively change a sold booking.

---

## AD-5 — `payments` is altered, not rebuilt

The current status set (`pending|verified|failed|refunded`) cannot express the manual-QR
flow, which needs to distinguish "awaiting payment" from "customer submitted proof" from
"admin is looking". The columns are widened and proof/review columns added. The table has
no client INSERT or UPDATE policy today; that stays — only Edge Functions write payments.

`astrologer_id` becomes nullable because money is paid to the platform, not the
practitioner. What the practitioner is owed lives in `ledger_entries`, not on the payment.

---

## AD-6 — Manual verification and a future eSewa API converge on one state machine

`provider`, `payment_method` and `verification_method` are separate columns from day one.
Manual QR is `(esewa, manual_qr, manual)`; a future integration is `(esewa, api, webhook)`.
Both paths end at `status = 'paid'`, and everything downstream — booking confirmation,
ledger, payouts, notifications — reads only the status. Getting eSewa API access later
means adding a webhook Edge Function, not reworking the marketplace.

---

## AD-7 — Four distinct money numbers

`platform_gross`, `platform_commission`, `jyotish_payable` and `payout` are separate
ledger entry types. "Payable" is what the platform owes; it is not "paid". Nothing is
netted into a single balance column, because a single column cannot be audited.

Ledger rows are append-only. Refunds and corrections are reversal rows carrying
`reversal_of_entry_id`. Nothing financial is ever updated or deleted.

---

## AD-8 — Commission is snapshotted per booking

`platform_settings.consultation_commission_percent` is the current rate. Each booking
stores the rate that applied at purchase time, so changing the platform rate never
rewrites historical earnings.

---

## AD-9 — One role helper, `security definer`

Role checks were inlined as `exists (select 1 from public.users where id = auth.uid() and
role = 'admin')` in roughly eight policies. Replaced by `public.has_role(variadic text[])`,
`security definer` with a locked `search_path`, reading `public.users`. It must not read
a JWT claim, because a claim is influenced by the client.

---

## AD-9b — Role value is `jyotish`, table stays `astrologers`

`public.users.role` uses the architecture's vocabulary
(`customer | jyotish | moderator | support | finance | admin | super_admin`), while the
practitioner table keeps the name `astrologers` for the reasons in AD-1. The mismatch is
deliberate: nothing in the frontend reads `users.role`, so migrating the value cost
nothing, whereas renaming the table breaks seven foreign keys.

## AD-9c — Column-level protection needs a trigger, not a policy

RLS grants or denies a row, never a column. `users` must stay self-updatable (profile
edits) while `role` must not be, so `trg_users_guard_role` rejects a role change unless
the caller is an admin or has no JWT at all (service role / Edge Function / migration).
The same pattern is reused for `astrologers.status` in Step 6 and for any other column a
user owns the row of but must not set.

**Amended by 0006:** account holders no longer own UPDATE on `users` at all (nothing on
the row is theirs to edit). The trigger stays as the second layer and now also
separates admins from super admins: only `super_admin` grants or removes `admin` /
`super_admin`. `customer → jyotish` is allowed for whoever approves a practitioner,
because it only passes once that practitioner's row is `active`, which only a reviewer
can set. Side effects that depend on a guarded row's *new* state (the approval
promotion) belong in an AFTER trigger; the BEFORE trigger cannot see the row as written.

## AD-10 — `service_requests` is not the booking system

The current browser booking flow writes generic `service_requests` rows. That stays as
the intake channel for contact forms, kundali requests and similar, but real bookings go
through `reservations` → `bookings` → `payments`. The two are not merged.

---

## AD-11 — Only `public/site-assets/` is the frontend

`js/` is an unserved duplicate of `public/site-assets/js/`. It is deleted rather than kept
in sync.

---

## AD-12 — Postponed deliberately

Not built, and not designed around, until explicitly revisited: embeddings, vector search,
RAG, LLM integration, AI billing, AI revenue sharing, automatic consultation recording,
automated payouts, split payments, direct customer-to-jyotish transfers.

`knowledge_items` carries `author_id` from the start so attribution and revenue sharing
remain possible later without a migration.

---

## AD-13 — Practitioners propose a price; they do not set it

`astrologers.consultation_fee` is accepted from the applicant once, on the application,
so the reviewer sees what they are asking. After that only a reviewer on someone else's
row, or the service role, may change it (0007). The long-term source of truth for price
is the per-practitioner `services` catalog from Step 7 (name, type, duration, price,
currency, active state); `consultation_fee` is then a legacy display value. A
practitioner may later *request* a price change, but the published price follows the
platform's rules, never a direct self-edit.

Related rule from the same migration: **nobody reviews their own practitioner row**,
whatever their role. Approval is a separation-of-duties control, so a staff member who
also practises needs a second reviewer.

---

## AD-14 — Chat authorization model

- **RLS decides who sees and posts** (0010). Every chat policy goes through
  `is_chat_participant(conversation)`: an active participant of *that* conversation.
  RLS keeps protecting messages even if a client or the server layer is compromised.
- **The browser only posts text.** File/system messages, attachment rows, conversation
  creation, closing and read state are server operations (Next.js, Checkpoint I), which
  validate first and then write with the service role.
- **Messages are immutable.** No edit, no delete, no client-chosen timestamps.
- **Files follow the same rule** (0011). `chat-attachments` is private and has no browser
  upload policy; participants read `{conversation_id}/…`. No bucket lets the browser
  overwrite, move or delete an object.
- **Staff do not read chats** by default. Moderation access, if needed for disputes, is
  a later, audited server operation — not a blanket RLS grant.

**Temporary Phase 1 rule — revisit at Step 10.** Any signed-in customer may open a
conversation with any *active* practitioner. Once bookings and payments exist,
consultation chat will be tied to a booking/consultation relationship; the
`booking_id` / `consultation_id` columns and the index that only limits *general*
conversations are there for that. Do not let this rule become permanent by default.
