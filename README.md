# Jyotish Consultation Platform

This workspace now includes the real Supabase backend foundation and a functional chat consultation MVP for a multi-astrologer platform.

## Next.js app

The main Jyotish site now runs through the Next.js App Router. The existing browser-only booking, astrology, vastu, chat, and Supabase flows are isolated in `public/site-assets` and mounted by reusable client runtime components. The chat MVP is available at `/chat`.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use `npm run build` to create a production build and `npm start` to serve it.

### UI extension contract

- Use CSS tokens such as `var(--navy)`, `var(--ivory)`, `var(--ink)`, `var(--ink-soft)`, `var(--line)`, and `var(--gold)` instead of hard-coded colors so new components stay consistent with the website design.
- Add visible text to the relevant `T` language object in `public/site-assets/script.js`, and render it through `T[LANG]`. Hard-coded user-facing text will not translate automatically.
- Use semantic headings, labels connected to controls, keyboard-focusable buttons, and `setText()` for static labels. Announce significant view/language/theme changes with `announce()`.

## What you have built

- Real Supabase schema for a scalable consultation platform
- Multi-role design for customers, astrologers, and administrators
- Chat conversation model with participants, message history, attachments, and read receipts
- Secure RLS policies for scoped access
- Realtime messaging support for customer ↔ astrologer chat
- Payment, consultation, booking, token, and availability tables prepared for future phases
- A working browser-based chat MVP that connects to Supabase Auth and Realtime

## Where the build is going

`docs/IMPLEMENTATION-PLAN.md` is the ordered build plan for the marketplace
(eSewa QR payments with manual Super Admin verification, ledger, manual payouts,
audio/video consultations). `docs/ARCHITECTURE-DECISIONS.md` records why existing
tables are extended rather than replaced. Work through the plan a step at a time.

## Project structure

- `database/schema.sql` — complete relational schema and seed data (from-scratch snapshot)
- `database/migrations/` — numbered additive SQL applied on top of the snapshot
- `docs/` — implementation plan and architecture decisions
- `app/` — Next.js App Router shell and legacy site loader
- `public/site-assets/` — the browser runtime; **this is the only frontend tree that is served**
- `.env.example` — environment variable template
- `README.md` — setup and deployment instructions

---

## 1. Developer setup — your own Supabase project

Every developer works against **their own free Supabase project**, never the shared or
production one. Budget about 15 minutes.

### 1.1 Prerequisites

- Node.js **22 LTS or newer** (`node -v`). 20.9+ still runs the app, but Node 20 is past
  end of life (April 2026)
- A Supabase account (https://supabase.com, the free plan is enough)

### 1.2 Create the Supabase project

1. Dashboard → **New project**. Pick any name and region, and **save the database
   password** — you need it in step 1.3.
2. Leave **Enable Data API** on (the browser talks to the database through it).
   "Enable automatic RLS" may be on or off; the schema enables RLS itself.
3. **Authentication → Sign In / Providers → Email**: keep Email enabled. For local
   development turn **Confirm email off** — Supabase's built-in mailer sends only a few
   emails per hour, so sign-ups otherwise stall.
4. **Authentication → URL Configuration**: set **Site URL** to `http://localhost:3000`.

Nothing else is configured by hand: tables, policies, storage buckets and realtime all
come from the SQL in step 1.4.

### 1.3 Create `.env`

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Fill in, from your project:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` | `https://<project-ref>.supabase.co` — shown under Project Settings → Data API, and in the **Connect** dialog (same value in both) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → **Publishable** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **Secret** key (`sb_secret_…`). Server only — never in a `NEXT_PUBLIC_` variable or under `public/` |
| `SUPABASE_DB_URL` | **Connect** button (top of the dashboard) → **Session pooler** URI, port 5432, with your database password put in. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`) |
| `SUPABASE_DB_TARGET` | Leave `development` |
| `NEXT_PUBLIC_DEFAULT_ASTROLOGER_ID` | Leave empty for now (step 1.6) |

`.env` is git-ignored. Next.js reads it and passes only the `NEXT_PUBLIC_*` values to
the browser (`app/layout.js`), so `public/site-assets/app-config.js` needs no editing.

### 1.4 Build the database

```bash
npm install
npm run db:setup      # schema.sql + every migration, in order
npm run db:test       # every database test; each rolls back, so nothing is left behind
npm run db:status     # 0001–0011 "pre-tracking", 0012 onward "applied"
```

`db:setup` prints `target: development (project <your-ref>)` first — check that it is
**your** project. The scripts refuse to run unless `.env` says `development` and the
database URL belongs to the same project as `SUPABASE_URL`. Every test must end in
`all assertions passed`.

### 1.5 Run the app and make yourself admin

```bash
npm run dev           # http://localhost:3000
```

1. On the site, open **My Account** and sign up with your email. This creates your
   customer account.
2. Make that account the super admin. In the Supabase **SQL editor** run:
   ```sql
   update public.users set role = 'super_admin' where email = 'you@example.com';
   ```
   Only the SQL editor, a migration or the server can do this; the database refuses role
   changes from the browser. The change is recorded in `audit_log`.

### 1.6 Create a practitioner (for chat and bookings)

Nobody can approve their own practitioner application, so use a **second** account
(a second browser profile or a private window):

1. Sign up with another email → **My Account** → the Jyotish tab → submit the application.
2. Signed in as the super admin, **My Account** → the applications tab → **Approve**.
   The applicant becomes an active practitioner with the `jyotish` role.
3. Optional: to make them the default practitioner in the app, copy their id from the
   SQL editor into `NEXT_PUBLIC_DEFAULT_ASTROLOGER_ID` and restart `npm run dev`:
   ```sql
   select id, name from public.astrologers where status = 'active';
   ```

### 1.7 Everyday commands

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies only the migrations this database does not have yet — run it after pulling |
| `npm run db:test` | Runs every database test |
| `npm run db:status` | Lists which migrations this database has |
| `npm run test:server` | End-to-end check of the server API against a running app (`npm run dev` in another terminal; `API_BASE=http://localhost:3100` for another port). Creates and deletes throwaway users |
| `npm run db:reset` | **Development only. Deletes all app data** and rebuilds from scratch. Logins survive but come back as plain customers — redo step 1.5 part 2 |

To add a migration, read `database/migrations/README.md` first: new files are numbered,
record themselves in `schema_migrations`, and come with a test in `database/tests/`.

### 1.8 Troubleshooting

| Message | Fix |
|---|---|
| `REFUSED: SUPABASE_DB_TARGET is "", expected "development"` | Add `SUPABASE_DB_TARGET=development` to `.env` |
| `REFUSED: SUPABASE_DB_URL does not point at the project in SUPABASE_URL` | The two values come from different projects, or the DB URL is not a Supabase URI |
| `password authentication failed` | Wrong database password in `SUPABASE_DB_URL`, or special characters not URL-encoded. Reset it under Project Settings → Database |
| `getaddrinfo ENOTFOUND db.<ref>.supabase.co` | You used the direct connection (IPv6-only on the free plan). Use the **Session pooler** URI |
| `REFUSED: this database is already set up` | `db:setup` is for an empty project; use `npm run db:migrate` |
| Sign-up hangs on "check your email" | Turn off Confirm email (step 1.2), or confirm the user under Authentication → Users |

## 2. Environment variables

`.env.example` is the reference and says which values are browser-safe. The rule that
matters: only `NEXT_PUBLIC_*` values ever reach the browser. The secret key, the database
URL and any future API secrets stay server-side.

---

## 3. SQL schema

The SQL schema is in `database/schema.sql`.

This schema includes:

- `users`
- `customers`
- `astrologers`
- `consultants`
- `consultation_types`
- `consultations`
- `bookings`
- `tokens`
- `payments`
- `chat_conversations`
- `chat_participants`
- `chat_messages`
- `message_attachments`
- `message_reads`
- `notifications`
- `availability`
- `services`
- `reports`

The design is structured so that more astrologers, multiple consultation types, assignments, billing, and future dashboards can be added without replacing the backend.

---

## 4. Authentication setup

Email/password sign-in (section 1.2). Each Auth user gets a `public.users` row
automatically (`handle_new_user`); signing in on the site creates their `customers` row.
Practitioners apply from My Account and are approved by staff (section 1.6) — do not
insert active `astrologers` rows by hand.

---

## 5. Storage setup

Nothing to create by hand: `database/migrations/0011_storage_buckets.sql` creates the
private `chat-attachments`, `vastu-files` and `jyotish-documents` buckets (10 MB,
JPEG / PNG / PDF) and their policies. Chat files are uploaded by the server, not the
browser; participants read them.

---

## 6. Realtime setup

Nothing to enable by hand: `schema.sql` adds `chat_messages`, `chat_conversations` and
`chat_participants` to the `supabase_realtime` publication. The browser app uses `supabase.channel(...).on('postgres_changes', ...)` to receive live messages.

---

## 7. RLS policies

The schema includes Row Level Security on all sensitive tables.

Key guarantees:

- Customer A cannot access Customer B’s chat
- Astrologer A cannot access Astrologer B’s conversations
- Only participants can read or write chat messages
- Only self-owned records can be updated by a user
- Files remain under secure bucket policies

This is implemented with policies such as checking `auth.uid() = user_id` and conversation participant membership.

---

## 8. How to create the first astrologer account

Through the application flow in section 1.6: the practitioner applies from My Account,
a different staff account approves. Approval sets the row `active` and promotes the user
to the `jyotish` role; both steps are audited. The first production practitioner is
created the same way.

---

## 9. How to test customer ↔ astrologer chat

**Not usable yet.** Since Phase 1 Checkpoint E the database only accepts chat messages
through the rules in `0010_chat_rls.sql`, and creating conversations and uploading files
move to server endpoints (Checkpoint I). The chat page is repaired in Checkpoint J, and
this section is rewritten then. Until then, `database/tests/0010_chat_rls_test.sql` is the
reference for what chat allows.

---

## 10. How to deploy the project

1. Deploy the Next.js app (e.g. Vercel) and set the same variables as `.env` in the
   host's environment settings — `NEXT_PUBLIC_*` values plus the server-side secrets.
2. The production database is migrated only on an explicit, approved decision: a
   `.env` with `SUPABASE_DB_TARGET=production`, then
   `node scripts/db.mjs database/migrations --production`. Without both, the runner refuses.
3. Keep all sensitive keys on the server only.

---

## Business rules for future phases

The backend is structured to support:

- multi-astrologer selection
- customer and astrologer dashboards
- admin dashboards
- token-based consultation access
- direct, online, and in-person consultation types
- question-based consultation flows
- appointment/date/time scheduling
- payment records and verification
- reports and notifications
- future Android and iOS apps via the same Supabase backend

---

## Notes

- The current MVP is intentionally focused on secure chat, real-time messaging, and backend scalability.
- Phase 2 extends the same database and tables rather than replacing them.
- The app does not simulate chat; it uses the real Supabase backend and Realtime engine.

## Kundali calculation

The Kundali screen uses OpenStreetMap Nominatim for exact birthplace selection, a coordinate-based timezone lookup, and Astronomy Engine 2.1.19 for deterministic planetary positions. The result stores coordinates, timezone, UTC timestamp, Lahiri ayanamsha, calculation method, and ephemeris version. Apply the `calculation_parameters` migration in `database/schema.sql` when using Supabase persistence.

The browser will refuse to generate a chart if the location or timezone cannot be verified. Sunrise/moonrise and advanced interpretation rules should be supplied by a server-side ephemeris/rules service before production use; configure that service through `APP_CONFIG.astrologyEngineUrl` rather than allowing text generation to calculate astronomical values.

## Run in VS Code

The site runs through Next.js. Use `npm run dev` and open `http://localhost:3000`; the consultation chat is at `http://localhost:3000/chat`.

