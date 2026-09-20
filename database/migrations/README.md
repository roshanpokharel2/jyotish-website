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
