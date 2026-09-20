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

## What I need to configure

Before running the app, set up the Supabase project and paste your values into the project configuration.

## Project structure

- `database/schema.sql` — complete relational schema and seed data (from-scratch snapshot)
- `database/migrations/` — numbered additive SQL applied on top of the snapshot
- `docs/` — implementation plan and architecture decisions
- `app/` — Next.js App Router shell and legacy site loader
- `public/site-assets/` — the browser runtime; **this is the only frontend tree that is served**
- `.env.example` — environment variable template
- `README.md` — setup and deployment instructions

---

## 1. Supabase project setup steps

1. Create a new Supabase project at https://supabase.com
2. Open the SQL editor and run the SQL in `database/schema.sql`
3. Run each file in `database/migrations/` in numeric order (see `database/migrations/README.md`)
4. Create a storage bucket named `chat-attachments`
5. Enable Realtime for the relevant tables (see schema comments)
6. Enable Email/Password auth in Supabase Authentication
7. Create the first astrologer user through Auth > Users, then map that user to the `astrologers` table — see section 8. There is **no** seeded astrologer; `astrologers.user_id` requires a real Auth user.
8. Fill the values in `public/site-assets/app-config.js` for the browser runtime, or migrate them to the Next.js environment variables in `.env.local`
9. Run `npm run dev` and open `/chat`

---

## 2. Required environment variables

This is a browser project using Supabase anon key for front-end access. Keep your service role secret only on the server.

For the browser runtime, add the following in `public/site-assets/app-config.js`:

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
  defaultAstrologerId: '00000000-0000-0000-0000-000000000000',
};
```

For server-side use in future backend APIs, use these environment variables:

```bash
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

> Never expose the service role key in the browser.

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

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Email authentication
3. Set allowed email domains if needed
4. Use the front-end auth flow in `chat-app.js`
5. A customer or astrologer is connected to the app through the `users` table and a role-specific record

For a customer:

```sql
INSERT INTO public.customers (id, user_id, full_name, phone, status)
VALUES ('<customer-user-id>', '<customer-user-id>', 'Customer Name', '98XXXXXXXX', 'active');
```

For an astrologer:

```sql
INSERT INTO public.astrologers (id, user_id, name, status, consultation_fee)
VALUES ('<astrologer-user-id>', '<astrologer-user-id>', 'Krishna Prasad Pokharel', 'active', 600);
```

---

## 5. Storage setup

Create a storage bucket named `chat-attachments`.

Bucket policy recommendations:

- Users can upload files only when they are participants in the conversation
- Users can read files only if they belong to the same conversation
- Only authenticated users can access the bucket
- Avoid static public access

The SQL schema includes helper logic and policies for attachments.

---

## 6. Realtime setup

Enable Realtime in Supabase for the following tables:

- `chat_messages`
- `chat_conversations`
- `chat_participants`

Then run the SQL in `database/schema.sql` which includes:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
```

The browser app uses `supabase.channel(...).on('postgres_changes', ...)` to receive live messages.

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

1. Sign up a new user in Supabase Auth for the astrologer
2. Copy that user ID
3. Run SQL similar to:

```sql
INSERT INTO public.astrologers (
  id,
  user_id,
  name,
  photo_url,
  biography,
  qualification,
  experience_years,
  specialization,
  languages,
  consultation_fee,
  status,
  is_active
)
VALUES (
  gen_random_uuid(),
  '<AUTH_USER_ID>',
  'Krishna Prasad Pokharel',
  NULL,
  'Astrologer and spiritual guidance specialist.',
  'Jyotisha / Vastu / Numerology',
  12,
  'Vedic astrology, kundali analysis, vastu',
  ARRAY['Nepali', 'Hindi', 'English'],
  600,
  'active',
  true
);
```

This keeps Krishna Prasad Pokharel as the first database astrologer without hard-coding the app around one person.

---

## 9. How to test customer ↔ astrologer chat

1. Create a customer auth user and a separate astrologer auth user
2. Insert a matching record into `public.customers` and `public.astrologers`
3. In the app, sign in as the customer and choose the astrologer
4. Click Create Chat or Open Consultation
5. Send a message from the customer device
6. Sign in as the astrologer on a second device
7. Open the same conversation and confirm the message appears in realtime
8. Send a reply from the astrologer, then confirm delivery/read states
9. Test file upload by attaching an image or PDF to a message
10. Close the chat and verify no deletion occurs; history remains saved

---

## 10. How to deploy the project

1. Commit the project to GitHub or your hosting repo
2. Deploy the static frontend to Netlify, Vercel, or static hosting
3. Configure the Supabase URL and anon key in the deployed app config
4. Ensure your Supabase project has the SQL schema, auth, storage bucket, and realtime enabled
5. Keep all sensitive keys on secure backend services only

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

