// Apply SQL files to the Supabase database.
//
//   node scripts/db.mjs database/schema.sql database/migrations/0001_baseline_fixes.sql
//   node scripts/db.mjs database/tests/0002_roles_test.sql
//
// Reads SUPABASE_DB_URL and SUPABASE_DB_TARGET from .env (Dashboard > Project
// Settings > Database > Connection string > URI). Refuses to run unless the target
// is declared "development" (see the guard below). Each file runs as one simple query, so a file that
// wraps itself in begin/commit or begin/rollback behaves exactly as written.

import { readFileSync } from 'node:fs';
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

const files = args.filter((a) => a !== '--production');
if (!files.length) {
  console.error('usage: node scripts/db.mjs <file.sql> [...]');
  process.exit(2);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
client.on('notice', (n) => console.log(`  NOTICE: ${n.message}`));

await client.connect();

let failed = false;
for (const file of files) {
  process.stdout.write(`\n== ${file}\n`);
  try {
    await client.query(readFileSync(file, 'utf8').replace(/^﻿/, ''));
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
