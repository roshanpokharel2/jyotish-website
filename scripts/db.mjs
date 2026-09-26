// Apply SQL files to the Supabase database.
//
//   node scripts/db.mjs database/schema.sql database/migrations/0001_baseline_fixes.sql
//   node scripts/db.mjs database/tests/0002_roles_test.sql
//   node scripts/db.mjs --status        (which migrations this database has)
//
// Reads SUPABASE_DB_URL and SUPABASE_DB_TARGET from .env (Dashboard > Project
// Settings > Database > Connection string > URI). Refuses to run unless the target
// is declared "development" (scripts/env.mjs). Each file runs as one simple query, so a file that
// wraps itself in begin/commit or begin/rollback behaves exactly as written.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import pg from 'pg';
import { assertTarget, env } from './env.mjs';

const connectionString = env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set in .env');
  process.exit(2);
}

const args = process.argv.slice(2);
assertTarget(args.includes('--production')); // production guard, see scripts/env.mjs

const wantsStatus = args.includes('--status');
// A directory stands for its .sql files in name order (works in any shell). Migrations
// reached through a directory that are already applied are skipped, not refused, so
// `database/migrations` means "whatever is pending".
const files = args.filter((a) => a !== '--production' && a !== '--status').flatMap((a) =>
  statSync(a).isDirectory()
    ? readdirSync(a).filter((f) => f.endsWith('.sql')).sort().map((f) => ({ path: join(a, f), fromDir: true }))
    : [{ path: a, fromDir: false }]);
if (!files.length && !wantsStatus) {
  console.error('usage: node scripts/db.mjs <file.sql|dir> [...]   |   node scripts/db.mjs --status');
  process.exit(2);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
client.on('notice', (n) => console.log(`  NOTICE: ${n.message}`));

await client.connect();

// Migration tracking (0012). From 0012 on, each migration records itself in
// public.schema_migrations inside its own transaction. 0001-0011 predate tracking and
// are not recorded, so once the table exists they are refused: re-running an old file
// can undo a later fix (0006/0007 replace earlier function bodies).
const TRACKING_FROM = '0012';
const migrationsDir = new URL('../database/migrations/', import.meta.url);
const versionOf = (file) => /(?:^|[\\/])migrations[\\/](\d{4})_[^\\/]+\.sql$/.exec(file)?.[1];
const allMigrations = readdirSync(migrationsDir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

let tracked = false;
let recorded = new Map();
const loadRecorded = async () => {
  tracked = (await client.query(`select to_regclass('public.schema_migrations') is not null as t`)).rows[0].t;
  recorded = new Map(tracked
    ? (await client.query('select version, applied_at from public.schema_migrations')).rows.map((r) => [r.version, r.applied_at])
    : []);
};
await loadRecorded();

if (wantsStatus) {
  console.log(tracked ? '' : '\nschema_migrations does not exist yet (0012 not applied)');
  for (const f of allMigrations) {
    const v = f.slice(0, 4);
    const state = v < TRACKING_FROM ? 'pre-tracking (not recorded)'
      : recorded.has(v) ? `applied ${recorded.get(v).toISOString()}` : 'PENDING';
    console.log(`  ${f.padEnd(44)} ${state}`);
  }
  await client.end();
  process.exit(0);
}

// Why a file must not run now, or null. Checked just before each file against freshly
// read state, so a batch like "0013 0014" (or reset + rebuild) works in order.
// `applied: true` marks "this database already has it" (skippable from a directory).
const refusal = (file, sql) => {
  if (basename(file) === 'schema.sql') {
    // Not transactional: on a built database it would half-run, then fail.
    return tracked ? { why: 'this database is already set up; use `npm run db:migrate` for new migrations' } : null;
  }
  const v = versionOf(file);
  if (!v) return null; // tests, dev scripts, probes: not tracked
  if (v < TRACKING_FROM) {
    return tracked
      ? { applied: true, why: `${v} predates tracking and this database is already past it; re-running it can undo later fixes` }
      : null; // fresh install, before 0012
  }
  if (recorded.has(v)) return { applied: true, why: `${v} is already applied (${recorded.get(v).toISOString()})` };
  return pending(v, sql);
};
const pending = (v, sql) => {
  if (!tracked && v !== TRACKING_FROM) return { why: `apply ${TRACKING_FROM}_schema_migrations.sql first` };
  const missing = allMigrations.map((f) => f.slice(0, 4)).filter((m) => m >= TRACKING_FROM && m < v && !recorded.has(m));
  if (missing.length) return { why: `apply ${missing.join(', ')} first` };
  if (!new RegExp(`insert\\s+into\\s+public\\.schema_migrations[^;]*'${v}'`, 'i').test(sql)) {
    return { why: `${v} does not record itself (insert into public.schema_migrations ... '${v}' ...)` };
  }
  return null;
};

// One runner at a time, so two terminals cannot both pass the checks above.
if (!(await client.query(`select pg_try_advisory_lock(hashtext('scripts/db.mjs')) as ok`)).rows[0].ok) {
  console.error('REFUSED: another scripts/db.mjs run holds the lock');
  await client.end();
  process.exit(4);
}

let failed = false;
let skipped = 0;
for (const { path: file, fromDir } of files) {
  const sql = readFileSync(file, 'utf8').replace(/^﻿/, '');
  await loadRecorded(); // an earlier file in this batch may have changed it
  const refused = refusal(file, sql);
  if (refused?.applied && fromDir) { skipped++; continue; }
  process.stdout.write(`\n== ${file}\n`);
  if (refused) {
    failed = true;
    console.error(`  REFUSED: ${refused.why}`);
    break;
  }
  try {
    await client.query(sql);
    const v = versionOf(file);
    if (v >= TRACKING_FROM) {
      await loadRecorded();
      if (!recorded.has(v)) throw new Error(`${v} ran but is not recorded in schema_migrations`);
    }
    console.log('  ok');
  } catch (error) {
    failed = true;
    console.error(`  FAILED: ${error.message}`);
    if (error.position) console.error(`  at character ${error.position}`);
    if (error.detail) console.error(`  detail: ${error.detail}`);
    break; // later files usually depend on this one
  }
}

if (skipped) console.log(`\n(${skipped} migration(s) already applied, skipped)`);
await client.end();
process.exit(failed ? 1 : 0);
