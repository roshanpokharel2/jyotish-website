// .env loading and the development guard shared by scripts that write to a database.
import { readFileSync } from 'node:fs';

export const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

// Every file these scripts run writes (tests too, before rolling back), so the target
// must be declared. Development is the default; production needs
// SUPABASE_DB_TARGET=production AND --production on the command line. The declaration
// covers SUPABASE_URL's project, so the DB URL must be that same project. Returns the ref.
export function assertTarget(wantsProduction = false) {
  const target = env.SUPABASE_DB_TARGET;
  if (target !== (wantsProduction ? 'production' : 'development')) {
    console.error(wantsProduction
      ? 'REFUSED: --production given but SUPABASE_DB_TARGET is not "production".'
      : `REFUSED: SUPABASE_DB_TARGET is "${target ?? ''}", expected "development". ` +
        'Set it in .env only for a development project; production needs --production.');
    process.exit(3);
  }
  const urlRef = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(env.SUPABASE_URL ?? '')?.[1];
  const dbRef = /postgres\.([a-z0-9]+)[:@]|db\.([a-z0-9]+)\.supabase\.co/.exec(env.SUPABASE_DB_URL ?? '');
  if (!urlRef || !dbRef || (dbRef[1] ?? dbRef[2]) !== urlRef) {
    console.error('REFUSED: SUPABASE_DB_URL does not point at the project in SUPABASE_URL.');
    process.exit(3);
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== env.SUPABASE_URL) {
    console.error('REFUSED: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL point at different projects.');
    process.exit(3);
  }
  console.log(`target: ${target} (project ${urlRef})`);
  return urlRef;
}
