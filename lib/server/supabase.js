// The trusted Supabase client. Holds the secret key, so it is server-only: importing
// this from a client component fails the build.
import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Read on first use, not at import, so `next build` needs no secrets. Errors name the
// variables, never their values.
function config() {
  const url = process.env.SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const problems = [];
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url ?? '')) problems.push('SUPABASE_URL is not a Supabase project URL');
  if (url !== process.env.NEXT_PUBLIC_SUPABASE_URL) problems.push('SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL differ');
  if (!secret || secret === publishable || secret.startsWith('sb_publishable_')) {
    problems.push('SUPABASE_SERVICE_ROLE_KEY is missing or is the publishable key');
  }
  if (problems.length) throw new Error(`server misconfigured: ${problems.join('; ')}`);
  return { url, secret };
}

// The server never subscribes to realtime. supabase-js still builds a realtime client
// and, on Node < 22 (no built-in WebSocket), throws while doing so; this transport
// satisfies it and fails loudly if anything ever tries to open a socket here.
class NoRealtime {
  constructor() {
    throw new Error('realtime is not used on the server');
  }
}

let admin;

// Bypasses RLS. Every caller must authorize first (lib/server/auth.js) and write only
// what it has validated.
export function adminClient() {
  if (!admin) {
    const { url, secret } = config();
    admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: NoRealtime },
    });
  }
  return admin;
}
