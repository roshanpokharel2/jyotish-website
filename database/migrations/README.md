# Migrations

Numbered, additive SQL applied in order on top of `../schema.sql`.

- `schema.sql` is the from-scratch snapshot. A brand-new Supabase project runs it once,
  then every migration in order.
- Migrations are **additive and re-runnable**: `add column if not exists`,
  `create index if not exists`, `drop trigger if exists` before `create trigger`.
  Never edit a migration that has already been applied to a live database — add a new one.
- Each migration ends with a commented verification query block. Run it after applying.

## Applying

Supabase Dashboard → SQL Editor → paste the file → Run. Apply in numeric order.

## Files

| File | Step | What |
|---|---|---|
| `0001_baseline_fixes.sql` | 2 | Phantom seed astrologer removed, `updated_at` on payments/notifications/availability, indexes for the booking and payment-verification queries |
| `0002_roles.sql` | 3 | Canonical role set, `has_role()` / `is_staff()`, trigger closing the role self-promotion hole, inlined admin checks replaced |
| `0003_platform_settings.sql` | 4 | `platform_settings` + `setting()` / `setting_num()`, seeded with commission, reservation window, join window, payout floor, eSewa display values |
| `0004_audit_log.sql` | 5 | Append-only `audit_log`, `record_audit()`, immutability trigger, role changes logged |
| `0005_jyotish_verification.sql` | 6 | Practitioner lifecycle, status guard trigger, staff visibility, private `jyotish-documents` bucket |
| `0006_users_hardening.sql` | Phase 1 A | No self-update on `users`; only `super_admin` grants admin roles; approval promotion moved to an AFTER trigger so moderators can approve. **Supersedes** the function bodies from 0002/0004/0005 — re-run 0006 after any of them |
| `0007_astrologer_protected_fields.sql` | Phase 1 B | Fee and review fields not self-editable; no reviewer acts on their own practitioner row; documents frozen after review. **Supersedes** `guard_astrologer_status()` from 0005/0006 |
| `0008_customer_status_guard.sql` | Phase 1 C | Customers cannot set or change their own `status`; status changes are service-role only and audited |
| `0009_audit_log_actor_delete.sql` | Phase 1 D | `audit_log.actor_user_id` is no longer a foreign key, so users who acted can be deleted and the log keeps their id |
| `0010_chat_rls.sql` | Phase 1 E | Chat policies scoped to the specific conversation via `is_chat_participant()`; text-only browser posts, no message edits; attachment rows server-only; one open conversation per pair |
| `0011_storage_buckets.sql` | Phase 1 F | `chat-attachments` / `vastu-files` created; all buckets private, 10 MB, JPEG/PNG/PDF; no browser chat uploads; Vastu uploads tied to own project; only reviewers read credential documents |

## Function privileges — read this before adding a `security definer` function

Supabase's default privileges grant `EXECUTE` on every new function in `public` to
`anon` and `authenticated` **by name**. `revoke all ... from public` does **not** remove
those grants. A privileged function left at the default is callable by any visitor over
`/rest/v1/rpc/<name>`, bypassing RLS, since a definer function runs as its owner.

Every new privileged function must therefore do:

```sql
revoke all on function public.thing(args) from public, anon, authenticated;
grant execute on function public.thing(args) to service_role;  -- plus authenticated only if truly needed
```

A helper that policies call must be executable by every role those policies apply to,
including `anon`, or an anonymous request fails with "permission denied" instead of
returning nothing. That is only safe for a function that answers about `auth.uid()`
alone, like `is_chat_participant()` (0011).

Trigger functions (returning `trigger`) are exempt: Postgres refuses to call them
directly. Audit the current state with:

```sql
select proname, prosecdef, proacl from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';
```

## Applying from this machine

`node scripts/db.mjs <file.sql> [...]` applies files in order against `SUPABASE_DB_URL`
from `.env` (session pooler URI, port 5432). It refuses to run unless `.env` sets
`SUPABASE_DB_TARGET=development` and `SUPABASE_DB_URL` is the same project as
`SUPABASE_URL`. A production run needs `SUPABASE_DB_TARGET=production` **and** the
`--production` flag. Tests write (then roll back), so they are guarded too. Test fixtures write to `auth.users`, so the
JWT claims they set must include both `sub` and `role` to match a real access token.

## Tests

`../tests/NNNN_*_test.sql` — run with `node scripts/db.mjs`, or paste into the SQL editor. Each wraps itself in a
transaction and rolls back, so it is safe against a database with real data. A passing
run ends with a `NOTICE`; a failure raises.
