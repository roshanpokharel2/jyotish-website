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
