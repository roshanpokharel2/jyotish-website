// Apply SQL files to the Supabase database.
//
//   node scripts/db.mjs database/schema.sql database/migrations/0001_baseline_fixes.sql
//   node scripts/db.mjs database/tests/0002_roles_test.sql
//
// Reads SUPABASE_DB_URL from .env (Dashboard > Project Settings > Database >
// Connection string > URI). Each file runs as one simple query, so a file that
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

const files = process.argv.slice(2);
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
    await client.query(readFileSync(file, 'utf8'));
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
