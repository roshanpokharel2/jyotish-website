// Apply SQL files to the Supabase database.
//
//   node scripts/db.mjs database/schema.sql database/migrations/0001_baseline_fixes.sql
//   node scripts/db.mjs database/tests/0002_roles_test.sql
//   node scripts/db.mjs --status        (which migrations this database has)
//
// Reads SUPABASE_DB_URL and SUPABASE_DB_TARGET from .env (Dashboard > Project
// Settings > Database > Connection string > URI). Refuses to run unless the target
// is declared "development" (see the guard below). Each file runs as one simple query, so a file that
// wraps itself in begin/commit or begin/rollback behaves exactly as written.

import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const connectionString = env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set in .env');
  process.exit(2);
}

// Production guard. Every file this script runs writes (tests too, before rolling
// back), so the target must be declared. Development is the default; production
// needs SUPABASE_DB_TARGET=production AND --production on the command line.
const args = process.argv.slice(2);
const wantsProduction = args.includes('--production');
const target = env.SUPABASE_DB_TARGET;
if (target !== (wantsProduction ? 'production' : 'development')) {
  console.error(wantsProduction
    ? 'REFUSED: --production given but SUPABASE_DB_TARGET is not "production".'
    : `REFUSED: SUPABASE_DB_TARGET is "${target ?? ''}", expected "development". ` +
      'Set it in .env only for a development project; production needs --production.');
  process.exit(3);
}
// The declaration covers SUPABASE_URL's project, so the DB URL must be that same project.
const urlRef = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(env.SUPABASE_URL ?? '')?.[1];
const dbRef = /postgres\.([a-z0-9]+)[:@]|db\.([a-z0-9]+)\.supabase\.co/.exec(connectionString);
if (!urlRef || !dbRef || (dbRef[1] ?? dbRef[2]) !== urlRef) {
  console.error('REFUSED: SUPABASE_DB_URL does not point at the project in SUPABASE_URL.');
  process.exit(3);
}
console.log(`target: ${target} (project ${urlRef})`);

const wantsStatus = args.includes('--status');
const files = args.filter((a) => a !== '--production' && a !== '--status');
if (!files.length && !wantsStatus) {
  console.error('usage: node scripts/db.mjs <file.sql> [...]   |   node scripts/db.mjs --status');
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

// Why a migration must not run now, or null. Checked just before each file, so a
// batch like "0013 0014" works in order.
const refusal = (file, sql) => {
  const v = versionOf(file);
  if (!v) return null; // tests, schema.sql, probes: not tracked
  if (v < TRACKING_FROM) {
    return tracked
      ? `${v} predates tracking and this database is already past it; re-running it can undo later fixes`
      : null; // fresh install, before 0012
  }
  if (recorded.has(v)) return `${v} is already applied (${recorded.get(v).toISOString()})`;
  if (!tracked && v !== TRACKING_FROM) return `apply ${TRACKING_FROM}_schema_migrations.sql first`;
  const missing = allMigrations.map((f) => f.slice(0, 4)).filter((m) => m >= TRACKING_FROM && m < v && !recorded.has(m));
  if (missing.length) return `apply ${missing.join(', ')} first`;
  if (!new RegExp(`insert\\s+into\\s+public\\.schema_migrations[^;]*'${v}'`, 'i').test(sql)) {
    return `${v} does not record itself (insert into public.schema_migrations ... '${v}' ...)`;
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
for (const file of files) {
  process.stdout.write(`\n== ${file}\n`);
  const sql = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const why = refusal(file, sql);
  if (why) {
    failed = true;
    console.error(`  REFUSED: ${why}`);
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

await client.end();
process.exit(failed ? 1 : 0);
