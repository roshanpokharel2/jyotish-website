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

**Status:** Steps 1–6 done. Phase 1 security hardening done (Checkpoints A–K, see
below). Step 7 done (7a services catalog, 7b availability and bookings, 7c booking
endpoint, 7d booking form, 7e practitioner directory). Plan Steps 11–19 and 21 done
in 0018–0033; each migration's header names its build checkpoint, and the plan step it
covers is noted under that step below. Question service Q1 done (0034,
below). The project in `.env` is the **development**
database; 0001–0034 are applied there and every test in `database/tests/` passes. Nothing from Phase 1 has been applied
to a production project.
Apply with `node scripts/db.mjs <file.sql>`; it refuses to run unless `.env` declares
`SUPABASE_DB_TARGET=development` (production needs `=production` plus `--production`).

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

### Phase 1 — Security hardening (before Step 7)

Fixes found while verifying Steps 1–6 against the database. One checkpoint per
migration, each tested in development before the next starts.

#### Checkpoint A — `0006_users_hardening.sql` ✅ (applied to development)

**What**
- Dropped `"users can update own profile"`. The row holds only the mirrored email and
  the staff-assigned role, and no client code updates it.
- Role rules in `guard_user_role_change()`: granting or removing `admin` /
  `super_admin` needs `super_admin`; other changes need `admin`+; `customer → jyotish`
  is allowed when the user has an `active` practitioner row (the approval path);
  no JWT (service role) may do anything. Every change is audited.
- Moved the approval promotion out of the BEFORE trigger `guard_astrologer_status()`
  into a new AFTER trigger `trg_astrologers_promote`, so the row is already active when
  the role guard checks it.
- `scripts/db.mjs`: production guard (`SUPABASE_DB_TARGET`, project-ref cross-check),
  BOM stripping.

**Why** Before this, a moderator's approval raised `FORBIDDEN` (reproduced in dev), any
admin could make themselves `super_admin`, and account holders could rewrite
`users.email`.

**Test** `database/tests/0006_users_hardening_test.sql`, run as `authenticated` with a
JWT: fails on the pre-0006 schema, passes after; 0002–0005 tests still pass; 0006 is
re-runnable.

**Rollback** Fix forward. Undoing 0006 would reopen the holes above.

#### Checkpoint B — `0007_astrologer_protected_fields.sql` ✅ (applied to development)

**What** `guard_astrologer_status()` now protects more than `status`:
- On your **own** practitioner row you are never a reviewer, whatever your role; only
  the service role is exempt.
- A self-service insert is forced to `pending_review` with `reviewed_by`, `reviewed_at`,
  `rejection_reason`, `consultant_id` cleared and `applied_at = now()`. The proposed
  `consultation_fee` is kept for the reviewer to see.
- Afterwards a non-reviewer cannot change `id`, `user_id`, `consultant_id`,
  `consultation_fee`, `applied_at`, `reviewed_by`, `reviewed_at`, `rejection_reason`,
  `created_at` or `status`. `verification_documents` is editable only while
  `pending_review`. Profile fields (bio, languages, photo…) stay self-editable.

**Why** Reproduced in dev: an applicant raised their own fee after applying, forged a
reviewer stamp and a back-dated `applied_at`, and a moderator approved their own
application. The existing super_admin's practitioner row was self-approved the same way
before this fix (audit entry `jyotish.status_changed` with that super_admin as actor).

**Test** `database/tests/0007_astrologer_protected_fields_test.sql`: fails before 0007,
passes after; 0002–0006 still pass; 0007 is re-runnable.

**Client impact** None for the application form or the staff queue. A staff member who
is also a practitioner can no longer approve or re-price their own row from the UI —
another reviewer or the SQL editor does it.

**Rollback** Fix forward.

#### Checkpoint C — `0008_customer_status_guard.sql` ✅ (applied to development)

**What**
- New trigger `trg_customers_guard`: a customer insert with a JWT always lands
  `active`; an update with a JWT may not change `id`, `user_id`, `status` or
  `created_at`. Status changes come from the service role and are audited
  (`customer.status_changed`).
- `auth-module.js` `syncMainCustomer()` no longer sends `status` in the login upsert.

**Why** Reproduced in dev: the login upsert sent `status:'active'`, so a blocked
customer was unblocked by signing in again.

**Test** `database/tests/0008_customer_status_guard_test.sql`: fails before 0008,
passes after; 0002–0007 still pass; re-runnable. Plus a real round trip over the
Supabase HTTP APIs with the anon key: sign in, first login creates an `active` customer,
a blocked customer's login sync succeeds and they stay blocked, and a cached old client
that still sends `status` gets `403 / 42501`.

**Not done here** Blocking does not yet *deny* anything: a blocked customer can still
sign in and use the site. Enforcing it belongs in the server layer and booking policies.
There is also no staff UI or policy for changing a customer's status; it is SQL-editor
only until the admin dashboard.

**Rollback** Fix forward.

#### Checkpoint D — `0009_audit_log_actor_delete.sql` ✅ (applied to development)

**What** Dropped the foreign key `audit_log.actor_user_id → users`. The column stays a
plain uuid; the append-only trigger is unchanged.

**Why** Reproduced in dev: deleting any user who had ever acted failed with
`42501 audit_log is append-only`, because `on delete set null` tried to UPDATE their
audit rows. Account deletion was impossible for every staff member. Dropping the FK
also means the log keeps the deleted actor's id (with `actor_role`) instead of nulling it.

**Test** `database/tests/0009_audit_log_actor_delete_test.sql`: fails before 0009,
passes after (actor deleted, audit entry unchanged, log still append-only);
0002–0008 still pass; re-runnable.

**Rollback** Fix forward. Re-adding the FK would bring the delete failure back.

#### Checkpoint E — `0010_chat_rls.sql` ✅ (applied to development)

**What**
- `public.is_chat_participant(conversation)` — one security-definer membership check
  (active participant of *that* conversation), used by every chat policy.
- `chat_messages`: read = participant of that conversation; post = as yourself, active
  participant, conversation active, `message_type = 'text'`, body 1–4000 chars; **no
  update or delete policy**. A BEFORE INSERT trigger sets `created_at`, `status`,
  `delivered_at`, `read_at` and bumps the conversation's `last_message_at`.
- `chat_participants`: you also see co-participants of your conversations.
- `message_attachments`: read by participants of the message's conversation; the
  browser insert policy is gone (the server writes attachment rows, Checkpoint I).
- Unique index: one open general conversation per customer/practitioner pair.

**Why** The stored policies compared `cp.conversation_id = cp.conversation_id`. Reproduced
in dev: a customer in one conversation read another customer's private messages, posted
into their conversation, edited both parties' messages, and moved a message between
conversations. Impersonation was already blocked.

**Test** `database/tests/0010_chat_rls_test.sql` (2 conversations, 3 users, 14 groups
of checks incl. closed conversations, removed participants, attachments, duplicate
conversations): fails before 0010, passes after; 0002–0009 still pass; re-runnable.

**Not done here** Realtime delivery under the new policies is verified end to end with
the repaired client in Checkpoint J. Conversation creation, read state and attachments
are server endpoints (Checkpoint I). Storage bucket policies are Checkpoint F.

**Rollback** Fix forward. The old policies are the vulnerability.

#### Checkpoint F — `0011_storage_buckets.sql` ✅ (applied to development)

**What**
- Buckets `chat-attachments` and `vastu-files` created; all three buckets (with
  `jyotish-documents`) private, 10 MB, JPEG / PNG / PDF only.
- `chat-attachments`: the browser upload policy is gone — the server uploads
  (Checkpoint I). Participants still read `{conversation_id}/…`.
- `vastu-files`: uploads must be `{auth.uid()}/{own vastu project id}/{file}`.
- `jyotish-documents`: only reviewers (moderator / admin / super_admin) read other
  people's credentials; support and finance no longer do.
- No UPDATE or DELETE policy on any bucket, so nothing is overwritten or moved.
- `is_chat_participant()` is executable by `anon` (always false there). Without it an
  anonymous request that reached `chat_participants` failed with "permission denied".

**Why** Reproduced in dev: every chat and Vastu upload failed with `Bucket not found`;
`jyotish-documents` accepted an HTML file containing a script; the browser could upload
straight into a chat conversation, bypassing 0010's server-only attachment rule.

**Test** `database/tests/0011_storage_buckets_test.sql`: fails before 0011, passes
after; 0002–0010 still pass; re-runnable. Plus an HTTP round trip through the Storage
API with the anon key: a valid Vastu PNG uploads and its owner downloads it; an HTML
file, a 10 MB + 1 byte file, a foreign project folder, an overwrite and a browser
chat upload are refused; there is no public or anonymous download.

**Client impact** `vastu-upload.js` already uses the required path and types. The chat
page's file button now gets a 403 (its `message_type = 'file'` insert was already refused
by 0010); it moves to the server endpoint in I/J.

**Not done here** Nothing deletes old Storage files yet (retention is a later decision).
The size and type limits trust the declared `Content-Type`; checking what the file
really contains is a server-side job if uploads move behind the server.

**Rollback** Fix forward.

#### Checkpoint G — `0012_schema_migrations.sql` + `scripts/db.mjs` ✅ (applied to development)

**What**
- `public.schema_migrations (version, name, applied_at, applied_by)`: RLS on, no
  grants to `anon` / `authenticated`. From 0012 on, every migration inserts its own row
  inside its own transaction, so a duplicate fails and rolls back — also from the SQL editor.
- 0001–0011 are **not** recorded: how and when each reached a given database is not
  known, so no history is invented.
- `db.mjs` refuses, before running: an already recorded migration; 0001–0011 once
  tracking exists; out-of-order or gapped migrations; a migration without its own
  `schema_migrations` insert; a concurrent run (advisory lock). `--status` lists state.

**Why** Nothing recorded what a database had, and "re-runnable" was not safe: re-running
0005 would bring back the guard 0006/0007 replaced. Reproduced in dev before 0012: the
runner re-applied 0011 without objection.

**Test** `database/tests/0012_schema_migrations_test.sql`: fails before 0012 (no table),
passes after (0012 recorded, nothing below it, duplicate and malformed versions refused,
no API read/write). Runner exercised in dev: duplicate 0012 → refused; 0005 and 0011 →
refused; 0013 before 0012 → refused; gap → refused; migration without its insert →
refused; raw re-run of 0012 through SQL → rolled back on the primary key; second runner
while one holds the lock → refused (exit 4). 0002–0011 tests still pass.

**Fresh install verified** on the dev project (its data was disposable): every
repo-owned object in `public`, the storage policies and buckets were dropped, then
`schema.sql` + 0001–0012 ran in one pass without errors. A catalog fingerprint (674
entries: tables, columns, constraints, indexes, policies, grants, functions, triggers,
buckets, realtime) is identical to the database before the reset, apart from CRLF line
endings in 10 function bodies first pasted through the SQL editor. All tests and the
Storage HTTP round trip pass on the rebuilt database. The existing login was kept and
re-linked (`super_admin`, customer row); the practitioner row and old audit rows are gone.

Repeatable with `database/dev/reset.sql` + rebuild + `database/dev/relink_users.sql`
(see `database/migrations/README.md`); a second full cycle rebuilt the identical
fingerprint. That run also fixed `db.mjs` reading tracking state only once per batch.

Supabase's optional `ensure_rls` event trigger (auto-enables RLS on new tables) calls
`public.rls_auto_enable()`, which is **not** a repo object. Any reset must leave that
function alone; dropping it cascades to the event trigger.

**Rollback** Fix forward. Dropping the table only removes the protection.

#### Checkpoint H — Next.js server foundation ✅ (running against development)

**What**
- `lib/server/supabase.js` — the only holder of the secret key: one admin client, config
  validated on first use (URL shape, both URLs equal, secret is not the publishable key).
  Errors name variables, never values. `import 'server-only'` makes any client import a
  build error. Realtime is stubbed out (the server never subscribes; also keeps
  supabase-js working on Node < 22).
- `lib/server/auth.js` — `requireUser(request, { roles })`: `Authorization: Bearer
  <access token>` verified by Supabase Auth (`auth.getUser`), then role and customer
  status read fresh from the database. **Non-active customers are refused here** (403
  `account_inactive`) — the enforcement Checkpoint C left open.
- `lib/server/http.js` — `route()` wrapper: JSON responses, `Cache-Control: no-store`,
  `HttpError` for caller-facing errors, everything else logged and returned as a bare 500.
- `GET /api/me` — the first endpoint: `{ id, email, role, customerId }`.
- `scripts/env.mjs` — `.env` loading + development guard shared by `db.mjs` and the new
  `scripts/test-server.mjs` (`npm run test:server`); the guard now also refuses when
  `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` differ.
- Dependency: `@supabase/supabase-js` (server only; the browser keeps its CDN copy).

**Why** Checkpoints I–K need a trusted layer that writes with the service role only
after authorizing the caller from server-side facts.

**Test** Before: `GET /api/me` → 404. After, `npm run test:server` against a production
build (14 checks): no token / garbage / missing `Bearer` / payload-forged token /
publishable key as token → 401; signed-in customer → 200 with the db role and only the
four fields; blocked customer → 403; a role change applies on the next request; signed-out
session and deleted user → 401; wrong method → 405; responses `no-store`; throwaway users
removed. Also: a client component importing `lib/server` fails `next build`; the secret
key appears nowhere in `.next` or the repo (outside `.env`); a server started with the
publishable key in place of the secret returns a generic 500 and logs only the variable
name.

**Not done here** No write endpoints yet (added in Checkpoint I, with request-body
limits and validation). No rate limiting. `auth.getUser` costs one Auth round
trip per request; local JWT verification is an option if that ever matters.

**Rollback** Delete `app/api` and `lib/server`; nothing in the database depends on them.

#### Checkpoint I — chat server endpoints ✅ (running against development)

**What** Four routes, all behind `requireUser()` (so blocked customers are refused):
- `POST /api/chat/conversations` `{ astrologerId }` — opens the caller's general
  conversation with an **active** practitioner, or returns the open one. Concurrent
  opens converge on one row (the 0010 unique index; a `23505` re-reads). Participants
  are upserted on every open, so a half-created conversation heals. Not with yourself.
- `POST /api/chat/conversations/:id/close` — either participant; idempotent.
- `POST /api/chat/conversations/:id/read` — sets the caller's `last_read_at` to server time.
- `POST /api/chat/conversations/:id/attachments` — multipart, one `file`. Type decided by
  the file's **first bytes** (JPEG / PNG / PDF), never the name or declared type; 10 MB;
  stored at `chat-attachments/{conversation}/{random}.{ext}`; posted as the caller's
  `image` / `file` message plus a `message_attachments` row. A failed later step removes
  the message and the file. Closed conversation → 409.
- Anything that is not an active participant of the conversation (including a malformed
  id) gets 404, so ids cannot be probed.
- `lib/server/http.js`: `readBody` (streams, 413 past the cap whatever Content-Length
  says), `readJson` (JSON object only, 4 KB default, 415 / 400), `isUuid`.
  `lib/server/chat.js`: participant lookup, content sniffing, file-name cleaning.

Text messages still go straight from the browser under the 0010 policy; the server only
does what the browser is not trusted to do.

**Why** 0010/0011 removed the browser's ability to create conversations, write read
state and upload chat files; these endpoints are the replacement.

**Test** Before: every new route → 404 (verified by building without `app/api/chat`:
the chat checks fail). After, `npm run test:server`, 58 checks, including: browser cannot
create a conversation directly (RLS); open refuses no token, non-JSON, malformed JSON,
array body, non-uuid, body over 4 KB, unknown / suspended practitioner, blocked customer,
self; three concurrent opens → one conversation; stranger → 404 on read / attach / close;
a practitioner cannot close another customer's conversation; HTML renamed `.png` → 415;
empty, two files, non-multipart, over 10 MB refused and leave no rows or files; `../`
in a file name is stripped; the other participant can download, a stranger cannot;
after close text posts and uploads are refused, history stays readable, and opening
again starts a new conversation. Test users and files are removed. No database change.

**Not done here** The browser still uses its old chat code (Checkpoint J switches it to
these endpoints). No rate limiting (with the payment endpoints). Uploads are buffered in
memory, up to 10 MB each. A suspended practitioner's existing conversations stay open;
`message_reads` and per-message `read_at` are unused (read state is `last_read_at`).

**Rollback** Delete `app/api/chat` and `lib/server/chat.js`; no database change.

#### Checkpoint J — chat page repair ✅ (running against development)

**What**
- `public/site-assets/chat-app.js` rewritten against 0010/0011 and Checkpoint I:
  - role and account status from `/api/me`; the "I am signing in as" picker is gone (it
    was only a label, but it decided which UI you got);
  - open / close / read / attach through `/api/chat/*`; text posts and reads go direct
    under RLS; no client-set `status`, timestamps or conversation updates;
  - a conversation list for both sides; the practitioner is not offered themselves;
  - conversations are opened with `astrologers.id` (the old code passed the
    practitioner's *user* id as `astrologer_id` and the user id as `customer_id`);
  - realtime: new messages and the other side closing arrive live; on every
    "Subscribed to PostgreSQL" (first connect and reconnects) the page re-fetches, so
    nothing sent in between is lost;
  - attachments open through a 60-second signed URL fetched on click;
  - everything rendered with `textContent` (no `innerHTML` with data);
  - no silent sign-up on a failed sign-in, no placeholder customer
    (`'Customer User'`, `'0000000000'`) — a first visit creates the profile row from the
    account's name / email; status is set by the database (0008).
- `chat-mvp.html`: markup to match; supabase-js pinned to `2.109.0` (was the floating
  `@2`, i.e. whatever the CDN served that day) — same version as the server.
- `app/legacy-runtime.js`: legacy scripts run **once per document**. A second mount
  (Fast Refresh, or client-side navigation back) reloads the page instead of re-running
  them. Keyed by content, not by the `scripts` array's identity.

**Why** The page could not work at all. It waited for `DOMContentLoaded`, which has
already fired when `LegacyRuntime` injects it, so under Next.js it never started; the
queries it made (conversation insert, participant insert, conversation update, direct
storage upload) are all refused since 0010/0011. The duplicate-script errors seen in the
dev log ("Identifier 'APP' / 'mainSupabase' … has already been declared", 2 on `/chat`,
15 on `/`) were Fast Refresh re-running classic scripts and leaving the page half-dead.

**Test**
- `npm run test:server` now also covers realtime (the npm script passes
  `--experimental-websocket` for Node 20): the practitioner receives a customer's
  message live and as stored; a stranger subscribed to all chat messages, filtered or
  not, receives nothing; the other side sees a close live. 62 checks, passed on 4
  consecutive runs; the first run, before waiting for "Subscribed to PostgreSQL",
  missed the live message once.
- A one-off browser run (headless Edge via playwright-core, not added to the repo),
  against both `next dev` and a production build, customer and practitioner side by
  side: sign-in, badge from the db role, profile row created on first visit, chat
  opened via the server, `<b>` shown as text, practitioner's view auto-opens with the
  message, reply arrives live, attachment sent and arrives live, opens as a signed URL,
  both sides marked read, close disables the other side's composer live, reload keeps
  session and history, sign-out. No page errors; the only failed request is the
  site-wide missing `/favicon.ico`.
- Before the runtime fix, triggering Fast Refresh logged the redeclaration errors above;
  after it, none on either page.

**Not done here** Unread counts / "seen" ticks (the data is there: `last_read_at`).
Typing indicators, pagination (all messages load at once), image previews. Practitioners
see "Customer consultation" rather than a name: they cannot read customer profiles
(RLS), and exposing a display name is a separate decision. `/` still loads the floating
`supabase-js@2` (pinned in Checkpoint K). No favicon.

**Rollback** Revert the four files; no database or server change.

#### Checkpoint K — customer data out of the browser (first pass) ✅ (running against development)

**What**
- **Nothing customer-related is written to `localStorage` any more.** Removed from the
  booking, chat-consultation, kundali, shop order, class enrolment, contact, chat-widget,
  vastu (request record and floor-plan pins) and Ask flows. The only browser storage left
  is Supabase's own sign-in session.
- **Existing copies are deleted** on every page load (`site-helpers.js`): every key
  prefix the old code wrote (`booking_`, `chat_`, `kundali_`, `order_`, `enroll_`,
  `contact_`, `site_chat_`, `ask_question_`, `vastu_request_`, `vastu_annotation_pins…`,
  `jyotish_ask_birth_profile`, `jyotish_ask_history`); other keys are left alone.
- **Signed-in submissions go to the database instead.** Booking and kundali already did
  (`service_requests`); chat consultation, shop order, class enrolment and contact now do
  too (the request types already existed).
- **"Booked services"** reads `service_requests` (RLS, 0002: staff see every request,
  anyone else only their own) instead of whatever this browser had stored. Signed out it
  shows a sign-in prompt.
- **Ask a question**: the birth profile is read from and saved to the customer's
  `customers` row, the history from `question_consultations`; asking requires sign-in (a
  signed-out question was only ever saved in the browser, so it reached nobody).
- **Login sync** (`syncMainCustomer`) creates the customer profile once from the sign-up
  details and never overwrites it again. It used to upsert `full_name` / `phone` on every
  sign-in *and every auth event* (token refresh), reverting the customer's edits.
- **Sign-out reloads the page** (also when signing out in another tab), so the previous
  account's profile, birth details and history are not left in memory.
- supabase-js pinned to `2.109.0` on `/` as well (the floating `@2` served 2.117.2).

**Why** Section 4F of the brief. On a shared computer, anyone could open the public
"Booked services" page and read or download every earlier visitor's name, phone number,
birth date, time and place and payment reference; the Ask form even prefilled the next
visitor with the previous one's birth profile. And a customer's profile edits were
silently undone at their next sign-in.

**Test** One-off headless-Edge run on the real home page (production build), before
(committed code) and after:

| Check | Before | After |
|---|---|---|
| Old records removed from `localStorage` on load, other keys kept | fail (all 12 kept) | pass |
| "Booked services" signed out | fail (showed a previous visitor's name, phone, birth date) | pass (sign-in prompt) |
| Contact form signed out / signed in writes nothing to `localStorage` | fail | pass |
| Ask signed out asks to sign in | fail | pass |
| Second sign-in keeps the edited name and phone | fail (reset to sign-up values) | pass |
| Ask prefilled from the database profile | fail (prefilled with the *previous visitor's* name) | pass |
| Contact form signed in saved as a service request | fail (nowhere) | pass |
| "Booked services" shows own request, not another user's | pass | pass |
| Sign-out leaves no user, profile or birth details in memory, no token in storage | — (timed out: no reload) | pass |

Passed three times after the fix, including on the pinned supabase-js. The first run
after the change caught a bug in the clean-up itself (removing keys while walking by
index skips some in Chromium); fixed by collecting the keys first. No page errors;
`npm run test:server` still passes. No database change.

**Not done here**
- **Signed-out submissions still reach nobody** except booking and kundali, which email
  the details to a third party (`formsubmit.co`) from the browser. Chat consultation,
  order, enrolment and contact sent signed out now leave no record at all, exactly as
  far as the business is concerned as before (the copy only ever lived in that visitor's
  browser). Replacing these flows is Step 7 (bookings through the server) — or earlier,
  requiring sign-in for them, if you decide so. *(7d: booking now requires sign-in and
  goes through the server; the formsubmit.co code is deleted. The rest is still open.)*
- Client-generated booking / order ids and client-declared payment state (Step 7–8).
- Staff "Booked services" lists the latest 500 requests with no paging or status
  handling; it is a read-only stopgap until the admin workflow exists.

**Rollback** Revert the files. The clean-up has already deleted old copies from browsers
that loaded the page; that is intended and not undone.

---

### Step 7 — Bookings through the server

Brief step 7: bookings must not depend on localStorage, formsubmit.co, client ids,
client payment status or client-declared ownership; the server decides customer,
practitioner, service, price, duration, availability and status; the database prevents
double booking. Built in checkpoints 7a–7d. It absorbs the database half of the old
Steps 8–10 below (availability, slot locking, booking columns).

#### Checkpoint 7a — services catalog — `0013_services.sql` ✅ (applied to development)

**What**
- `services` extended (AD-3): `astrologer_id` (null = offered by the platform with any
  practitioner), `consultation_type_id` (the ONLINE / DIRECT / QUESTION taxonomy),
  `slug` (unique per owner, platform rows counted as one owner), `consultation_mode`
  (`audio | video | audio_video | chat | in_person | question`), `duration_minutes`
  (5–480), `currency` (`NPR` only), `status` (`draft | active | inactive | archived`),
  `updated_at` (database time, whatever the writer sends). `price` is now `not null`, ≥ 0.
- **An `active` service must be complete**: slug, type, mode, price above zero, and a
  duration unless the mode is `chat` / `question`. A constraint, so nothing
  half-defined can be sold whatever code writes it.
- **Reads:** anyone, signed in or not, reads active services whose practitioner (if any)
  is active, through `is_active_astrologer()` (visitors cannot read `astrologers`). A
  practitioner also reads their own; staff read all.
- **Writes: admin / super_admin only.** Practitioners do not create or re-price
  services, not even their own (AD-13 — this replaces the earlier plan of practitioner
  self-service with a WITH CHECK). No delete policy for anyone: bookings will reference
  services, so they are retired with `archived`. `is_active` stays for old readers and
  follows `status`.
- Seeded from the prices the site shows: live call (audio/video), live online chart
  (video), live Q&A (chat) NPR 1,000 each; chat consultation NPR 600; question NPR 100.
  All platform-wide. Direct consultation is `draft` (the site says "contact for price").

**Why** Prices existed only as display text in `script.js`, and `services` had RLS on
with no policy, so nothing — browser or server — could read a price. The booking and
payment steps must take price and duration from the database, never from the request.

**Test** `database/tests/0013_services_test.sql`: fails before 0013 (the columns do not
exist; a visitor read of `services` returned 0 rows), passes after; 0002–0012 still pass.
Covers: seeded catalog matches the site; visitors see exactly the active services;
visitor, customer, moderator and practitioner cannot create, re-price or delete (own
service or a rival's); admin creates practitioner services; free, duration-less,
unknown-mode, foreign-currency and negative-price services refused; duplicate slugs
refused per owner, allowed across owners; `is_active` / `updated_at` cannot be forged;
admins cannot delete; a practitioner sees their own service, not a rival's draft; a
suspended practitioner's services leave the public catalog and come back on
reactivation. Plus the public REST API with the anon key: GET returns the five active
services; PATCH and DELETE change nothing; POST → 401 `42501`. The runner refuses a
second application of 0013.

**Not done here**
- The browser still shows the hard-coded prices; the booking form reads the catalog in
  the booking-flow checkpoint.
- No admin UI: prices are changed in the SQL editor (README section 3).
- Durations (30 minutes) are placeholders — the site never stated them.
- No practitioner-specific services exist yet (there is no active practitioner in
  development); the model supports them.

**Rollback** Fix forward. The table had no readers or writers before, so reverting the
browser later is unaffected; dropping the policies only makes the catalog unreadable again.

#### Checkpoint 7b — availability, free slots, no double booking — `0014_bookings.sql` ✅ (applied to development)

**What**
- **`availability`** (weekly hours, practitioner's local time): the practitioner sets
  their own, an admin can fix them; nobody sets another practitioner's. Public read for
  active practitioners. `start_time < end_time`; one time zone (`Asia/Kathmandu`) for now.
- **`available_slots(astrologer, service, from, to)`** — free start times computed in the
  database: each availability window stepped by the service's duration, minus time held
  by bookings, only slots starting after the hold window, at most 31 days per call.
  Callable by visitors; returns times only, never who booked.
- **`create_booking(customer, astrologer, service, starts_at)`** — service role only
  (the server). Refuses a non-active customer, a practitioner booking themselves, a
  service that is not active / timed / offered by that practitioner, a suspended
  practitioner, and any start time that `available_slots` does not offer. Takes end
  time, price, currency, mode and commission from the database. Starts
  `payment_pending` with `hold_expires_at = now() + reservation_minutes` (10). At most
  two live holds per customer (the customer row is locked, so this cannot be raced).
  Errors are codes: `CUSTOMER_NOT_ACTIVE`, `SELF_BOOKING`, `SERVICE_NOT_BOOKABLE`,
  `SLOT_UNAVAILABLE`, `TOO_MANY_HOLDS`.
- **`bookings`**: `service_id`, `ends_at`, `hold_expires_at`, `consultation_mode`,
  `price_snapshot`, `currency`, `commission_percent_snapshot`; statuses
  `payment_pending | confirmed | in_progress | completed | cancelled | no_show | expired`
  (old `pending` / `rescheduled` still valid, hold no time).
- **The double-booking rule is an exclusion constraint** (`btree_gist`): two bookings of
  one practitioner that hold time (`payment_pending`, `confirmed`, `in_progress`,
  `completed`) cannot overlap, whoever writes them. A booking that holds time must have
  a real interval. An expired hold is marked `expired` by the next booking of that time.
- **The browser can no longer write bookings**: the old policy "customers can create
  own bookings" (checked only ownership, so a customer could insert a `confirmed`
  booking with no payment) is dropped. No browser update either. Staff can read bookings.
- AD-18: the hold *is* the booking; there is no separate `reservations` table.

**Why** The database had no notion of a practitioner's time, so nothing could stop two
customers buying the same hour, and the one booking policy let a customer declare their
own booking confirmed.

**Test** `database/tests/0014_bookings_test.sql`: fails before 0014 (a signed-in customer
inserts their own `confirmed` booking), passes after; 0002–0013 still pass. Covers:
hours set only by their practitioner, invalid hours / time zone refused; visitors see
exactly the 6 half-hour slots of a 09:00–12:00 window, none for a practitioner without
hours, nothing for a range over 31 days; visitors and signed-in users cannot call
`create_booking`; a booking's end, price, currency, mode, commission and hold come from
the database; a held slot disappears from the free list; a second booking of it is
refused, and so is an overlapping row written directly and a `confirmed` row without
a time; off-grid, out-of-hours and past times refused; another practitioner's, draft and
untimed services refused; blocked customer and self-booking refused; a third hold
refused; customers see only their own bookings, practitioners only theirs, and a
customer cannot confirm or re-price theirs; a service price change leaves the booking's
price alone; an expired hold frees the slot and is marked `expired` when retaken; a
suspended practitioner offers no slots and takes no bookings.
Plus, against the real database: **10 connections booking the same slot at the same
moment → exactly 1 succeeds, 9 get `SLOT_UNAVAILABLE`, 1 row stored** (three runs;
throwaway users removed). And the public REST API with the anon key: `available_slots`
answers; `create_booking` → 401 "permission denied"; inserting a booking → 401 `42501`.

**Not done here**
- No endpoint or UI yet (7c: `POST /api/bookings`; 7d: the booking form).
- Date-specific days off (`availability_exceptions`) are not built; a practitioner
  blocks a day by deactivating hours.
- Nothing yet moves a booking past `payment_pending`; expired holds are marked lazily
  (the free-slot list already ignores them). Payment and confirmation are Step 8.
- Slots start at the window's start and step by the service duration; mixing services
  of different lengths can leave gaps.

**Rollback** Fix forward. Dropping the constraint or restoring the old insert policy
would bring double booking and self-confirmed bookings back.

#### Checkpoint 7c — booking endpoint — `POST /api/bookings` + `0015_booking_notes.sql` ✅ (running against development)

**What**
- `app/api/bookings/route.js`: `POST { astrologerId, serviceId, startsAt, notes? }`
  behind `requireUser()` (blocked customers refused). Validates shape only — uuids, an
  instant with an explicit time zone, notes as text ≤ 2000 characters, 4 KB body (16 KB
  since 7d) — then
  calls `create_booking()` with the **caller's own customer id** from the database.
  Anything else in the body (price, status, owner, end time, currency) is ignored.
- Database refusals map to: `self` 400, `not_found` 404 (unknown / draft / untimed /
  other practitioner's service, unknown or suspended practitioner), `slot_unavailable`
  409, `too_many_holds` 409, `account_inactive` 403.
- Response: id, status, service, practitioner, start, end, hold expiry, mode, price,
  currency, notes — not the commission snapshot.
- `0015_booking_notes.sql`: `create_booking()` takes `p_notes` and stores it (trimmed,
  blank → null) in the same insert; `bookings.notes` ≤ 2000 characters; the
  four-argument version is dropped. Supersedes the function from 0014.
- Free slots need no endpoint: the browser calls `available_slots()` directly (public).

**Why** The trusted entry point for 7b's rules; the browser only says which time it
wants.

**Test**
- `database/tests/0015_booking_notes_test.sql`: fails before 0015 (no notes parameter),
  passes after; 0002–0014 still pass. Notes stored and trimmed, blank → null, over
  2000 refused with nothing stored, one server-only entry point.
- `npm run test:server` against a production build, 26 new checks (88 total, three
  runs). Before: built without `app/api/bookings`, 20 of them fail (404). After, all
  pass: a visitor gets the 6 free times; the browser cannot write a booking; no token
  401; bad ids / time without zone / long or non-text notes 400; blocked customer 403;
  practitioner booking themselves 400; unknown or draft service and unknown practitioner
  404; an off-grid time 409; a booking with forged `price: 1`, `status: 'confirmed'`,
  another customer's id, a longer end and `USD` comes back `payment_pending`, NPR 1,000,
  30 minutes, held ~10 minutes, stored for the caller; the held time disappears from the
  free list; the same time again 409; **three customers requesting one time at once →
  one 200, two 409**; a third hold 409 `too_many_holds`; customers see only their own
  bookings, the practitioner sees theirs, a customer cannot confirm their own; GET 405.
  No `[api]` errors in the server log; the secret key is not in `.next/static`.

**Not done here** The booking form still used its old flow (done in 7d). No cancel endpoint:
an unpaid hold simply expires. No rate limiting (with the payment endpoints).

**Rollback** Delete `app/api/bookings`; 0015 is fix-forward (the notes parameter is
optional, so 0014-style calls keep working).

#### Checkpoint 7d — the booking form uses the server — `booking-flow.js` + `0016_booking_subject.sql` ✅ (running against development)

**What**
- `public/site-assets/js/booking-flow.js` rewritten. Online: type → method →
  practitioner → time → terms → details → `POST /api/bookings`. **Sign-in required**
  before the method step (a login button otherwise).
  - Practitioners are the active rows of `astrologers`; the service is the active one
    for the chosen method (`live-call` / `live-chart` / `live-qa`), the practitioner's
    own row winning over the platform-wide one; price and length shown from it.
  - Times: one `available_slots()` call for the next 14 days, grouped by day, shown in
    Nepal time.
  - Details pre-filled from the customer's profile; sent as `subject`, the message as
    `notes`.
  - Confirmation shows the server's reference (first 8 characters of the id), time,
    price and hold expiry. No auto-reset. A time taken meanwhile returns to a fresh
    time list; two open holds and other refusals get a message.
  - **Removed:** the "I've paid" attestation and payment-reference field, the
    browser-made `KP-ON-…` id, the `service_requests` copy, the formsubmit.co email
    and the hard-coded practitioner.
  - In-person: no bookable service exists (draft, no price), so it is a contact step
    (phone / WhatsApp) instead of a fake booking.
- `0016_booking_subject.sql`: `bookings.subject` (jsonb object, ≤ 4 KB) — the birth
  details of the person the consultation is about, which the practitioner used to get by
  email. Practitioners cannot read customer profiles, and the person may not be the
  account holder. Stored in the same insert by `create_booking(…, p_notes, p_subject)`
  (supersedes 0015's). Readable through the booking's existing policies only.
- The route validates `subject` field by field (name, AD birth date — real, not in the
  future — birth time HH:MM, birth place, country; optional phone, email, BS date) and
  drops anything else. Body limit 16 KB (2000 characters of Devanagari notes are ~6 KB).
- "Booked Services" (`bookings-admin.js`) lists bookings alongside the older requests;
  RLS scopes them (own, practitioner's own, staff all).
- `site-helpers.js` / `site-config.js`: the formsubmit.co helpers and endpoint are
  deleted (the kundali one had no caller already).

**Why** The form was the last piece of the old flow: it made its own booking ids, took
the customer's word that they had paid, and emailed birth details to a third party.

**Test**
- `database/tests/0016_booking_subject_test.sql`: fails before 0016 (no subject
  parameter), passes after; 0002–0015 still pass (0015's privilege check made
  signature-independent). Subject stored; non-object and oversized refused; the
  practitioner reads it, another practitioner and another customer do not; one
  server-only entry point.
- `npm run test:server`: 6 new checks, 94 total. Future, impossible date, bad time, no
  birth place, non-object subject → 400; subject stored trimmed with unknown fields
  (`role: 'admin'`) dropped; the practitioner reads the birth details.
- Headless Edge walk of the real page (throwaway practitioner with hours, and a
  customer), formsubmit.co blocked and recorded. **Before** (the committed form): 5 of
  11 fail — no sign-in gate, no database practitioner, no booking row. **After**: 11/11 —
  signed out asks to log in; the database practitioner, price (NPR 1,000) and length
  (30 min) are shown; the booking row is the customer's, `payment_pending`, at the
  chosen time, with birth details and message; confirmation shows the reference and
  hold; Booked Services lists it; nothing sent to formsubmit.co; nothing in
  `localStorage` but the sign-in session; no page errors.

**Not done here**
- **No payment yet (Step 8).** A booking is held for 10 minutes and then lapses; the
  confirmation says it is confirmed once payment is received and shows no payment
  instructions. **Do not deploy 7d to production before Step 8.**
- The practitioner has no view of their upcoming bookings besides Booked Services.
- Signed-out chat, order, enrolment and contact submissions still reach nobody (Checkpoint K
  follow-up).

**Rollback** Revert the browser files; 0016 is fix-forward (`p_subject` is optional).

#### Checkpoint 7e — practitioner directory — `0017_practitioner_directory.sql` ✅ (applied to development)

**What**
- Dropped the policy "authenticated users can read active astrologers". RLS grants
  whole rows, so it let any signed-in user read every column of every active
  practitioner, including `verification_documents`, `rejection_reason`, `reviewed_by`
  and `user_id`.
- `active_practitioners()` (security definer, signed-in users only, as before) returns
  the public profile of active practitioners: id, name, photo, biography,
  qualification, experience, specialization, languages, fee. The caller's own row is
  left out. A practitioner still reads their own full row; staff read all (AD-19).
- The booking form and `/chat` read the directory instead of the table (`/chat` no
  longer needs `user_id` to hide the caller).

**Why** Found while building 7d: the form asked for three columns, but the database
would have returned the rest, identity documents included, to any customer.

**Test**
- Before 0017, a rolled-back probe showed that a signed-in stranger reads
  `["citizenship.pdf"] / internal reviewer note`. After, it reads nothing.
- `database/tests/0017_practitioner_directory_test.sql`: fails before 0017, passes after.
  Covers:
  - the directory has no private columns;
  - a customer reads no practitioner row, finds the active practitioner in the
    directory, does not see applicants, and keeps their booking;
  - the practitioner keeps their row, bookings and hours, and is not listed to
    themselves;
  - staff still read every row;
  - visitors cannot call the directory.
- `0005_jyotish_verification_test.sql`: "an approved practitioner is visible to
  customers" is now checked through the directory.
- 0002–0017 pass.
- `npm run test:server`: 4 new checks, 98 total. Over REST, a customer reads no row,
  the directory has public columns only, visitors are refused, and a practitioner is
  not offered to themselves.
- Headless Edge, booking walk: 11/11. `/chat` lists the practitioner, with no page
  errors.

**Rollback** Fix forward. Restoring the policy restores the leak.

---

### Question service (NPR 100) — through the server and the payment system

The old ask form inserted `question_consultations` from the browser. The row stayed
`UNPAID`, had no practitioner, and was never picked up. RLS let the customer write the
answer and let the practitioner mark the row paid. The customer now picks the
practitioner, and there is no answer deadline yet.

#### Checkpoint Q1 — database — `0034_question_payments.sql` ✅ (applied to development)

**What**
- `create_question` (server only) takes the practitioner, the price from the `question`
  service (a practitioner's own row wins) and the commission setting, and opens an
  `awaiting_payment` payment. Refuses `CUSTOMER_NOT_ACTIVE`, `SELF_BOOKING`,
  `SERVICE_NOT_BOOKABLE`, and `TOO_MANY_UNPAID` (2 awaiting payment).
- A payment has exactly one source: `payments.booking_id` or
  `payments.question_consultation_id` (AD-20).
- Proof, approval, rejection and refunds handle both kinds:
  - approval → question `PAID`, `paid_at`, three ledger rows (`booking_id` null), and
    both people notified;
  - rejection → `FAILED` / `CLOSED`;
  - full refund → `REFUNDED`.
  The reviewer and refund self-checks read the payment's own customer and
  practitioner. A refund reverses the ledger with the original rows' links and
  commission.
- `answer_question` (server only): assigned practitioner only, draft → `IN REVIEW`,
  final → `ANSWERED`, then locked; the final answer notifies the customer. The old
  notification trigger is dropped (it would send twice).
- RLS: the browser can no longer insert or update question rows. A practitioner sees a
  question only once it is paid; the customer still reads their own.
- Checks: question 1–2000 characters, answer ≤ 5000, birth snapshot a JSON object
  ≤ 4 KB. The `Q-000123` number stays the existing identity column.
- The 2 legacy `UNPAID` rows are untouched (README §3 has the query).

**Test** `database/tests/0034_question_payments_test.sql` fails on 0033 (a customer
inserts a question with its own answer) and passes on 0034. It covers:
- server-set price and practitioner;
- each refusal;
- one source per payment;
- self-review refused;
- approval, ledger and notifications;
- practitioner and rival visibility;
- draft, final and locked answers;
- rejection;
- full refund and balance;
- the legacy row unchanged.

All tests 0002–0034 and `npm run test:server` pass.

**Until Q3** the old ask form's direct insert, and the practitioner panel's
direct answer, were refused by RLS. That was intended: they were the holes.

**Rollback** Fix forward. Restoring the dropped policies restores the holes.

---

### Step 8 — Availability and slot computation

> **Done in Checkpoint 7b** (0014), except `availability_exceptions`.

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

> **Replaced by Checkpoint 7b** (AD-18): the hold is a `payment_pending` booking with
> `hold_expires_at`; no `reservations` table. The concurrency test below passed.

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

> **Booking columns, statuses and snapshots done in Checkpoint 7b** (no `reservation_id`:
> AD-18). The `consultations` columns remain for the audio/video step.

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

> **Done in 0018–0019** (build Checkpoints 8a–8b): payment rules, the private
> `payment-proofs` bucket, `POST /api/payments/:id/proof`.

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

> **Done in 0018 and 0021** (build Checkpoints 8a, 9b): `approve_payment` /
> `reject_payment`, `app/api/payments/review-queue`.

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

> **Done in 0020–0022 and 0027** (build Step 9 and its follow-ups).

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

> **Done in 0023–0024 and 0032** (build Checkpoints 10a–10b, 16a follow-up).

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

> **Done in 0025–0026** (build Checkpoints 11a–11b).

**What** `payouts` with statuses `pending|approved|processing|paid|failed|cancelled`,
`external_reference`, `processed_by`, `processed_at`. Jyotish requests a payout against
their `payable` balance; admin records the real transfer; a `payout` ledger entry debits
the payable balance.

**Depends on** Step 13.

**Security** Requested amount validated against the computed balance server-side, never
the number the dashboard displayed.

---

### Step 16 — Notifications and email jobs

> **Done in 0028** (build Checkpoint 12a) plus `app/api/email/drain`.

**What** Reuse `notifications` (add `data jsonb`, rename semantics of `is_read` to
`read_at` or keep both). Add `notification_preferences` and `email_jobs`
(`pending|processing|sent|failed|cancelled`, `attempts`, `last_error`, `scheduled_for`).
A `send-emails` Edge Function drains the queue, invoked by pg_cron.

**Why** Architecture §14/§38: approval must not fail because the email provider is down.

**Depends on** Step 12.

**Security** `email_jobs` readable only by staff — payloads contain personal data.

---

### Step 17 — Reminders

> **Done in 0029** (build Checkpoint 13a).

**What** pg_cron job scheduling 24-hour and 1-hour reminders. A unique
`(booking_id, reminder_kind)` key makes a double run a no-op.

**Depends on** Step 16.

---

### Step 18 — Audio / video consultations

> **Join rules done in 0033** (build Checkpoint 17a).

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

> **Done in 0030** (build Checkpoint 14a).

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

> **Done in 0031** (build Step 15).

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
