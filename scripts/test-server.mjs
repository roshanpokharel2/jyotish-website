// End-to-end check of the server layer (lib/server/*) against a running app:
//
//   npm run dev                      (one terminal)
//   npm run test:server              (another; API_BASE=http://localhost:3100 to change)
//
// Development only (same guard as db.mjs). Creates throwaway Auth users with the admin
// API, signs them in over HTTP like the browser, and deletes them at the end.
import { createClient } from '@supabase/supabase-js';
import { assertTarget, env } from './env.mjs';

assertTarget();
const base = process.env.API_BASE ?? 'http://localhost:3000';
// No realtime here; the stub also keeps supabase-js working on Node < 22.
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: class { constructor() { throw new Error('no realtime in tests'); } } },
};
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const browser = () => createClient(env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  ' + JSON.stringify(detail)}`);
  if (!ok) failures++;
};
const me = async (headers = {}, method = 'GET') => {
  const r = await fetch(`${base}/api/me`, { method, headers });
  let body = null;
  try { body = await r.json(); } catch {}
  return { status: r.status, body, cache: r.headers.get('cache-control') };
};
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const stamp = Date.now();
const created = [];
const newUser = async (label) => {
  const email = `servertest-${label}-${stamp}@example.test`;
  const password = `Pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  const { data: s, error: e } = await browser().auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, email, token: s.session.access_token };
};

try {
  const reach = await fetch(`${base}/api/me`).catch(() => null);
  if (!reach) throw new Error(`no app at ${base} -- start it with npm run dev`);

  const c = await newUser('customer');
  const b = await newUser('blocked');
  const x = await newUser('signedout');
  // Customer rows, as the browser's login sync creates them; B is then blocked by staff.
  for (const u of [c, b, x]) {
    const { error } = await admin.from('customers').insert({ user_id: u.id, full_name: 'Server Test' });
    if (error) throw error;
  }
  const { error: blockError } = await admin.from('customers').update({ status: 'blocked' }).eq('user_id', b.id);
  if (blockError) throw blockError;

  let r = await me();
  check('no token -> 401', r.status === 401 && r.body?.error?.code === 'unauthenticated', r);
  check('responses are not cacheable', r.cache === 'no-store', r.cache);
  r = await me({ Authorization: 'Bearer not-a-token' });
  check('garbage token -> 401', r.status === 401, r);
  r = await me({ Authorization: c.token });
  check('token without "Bearer" -> 401', r.status === 401, r);

  // Same signature, payload swapped to claim another user: must fail verification.
  const [h, , sig] = c.token.split('.');
  const payload = JSON.parse(Buffer.from(c.token.split('.')[1], 'base64url'));
  const forged = `${h}.${Buffer.from(JSON.stringify({ ...payload, sub: b.id })).toString('base64url')}.${sig}`;
  r = await me(bearer(forged));
  check('forged token (payload edited) -> 401', r.status === 401, r);
  r = await me(bearer(env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  check('publishable key as a token -> 401', r.status === 401, r);

  r = await me(bearer(c.token));
  check('signed-in customer -> 200 with db role', r.status === 200 && r.body?.id === c.id && r.body?.role === 'customer' && r.body?.customerId, r);
  check('response carries only id/email/role/customerId',
    r.status === 200 && Object.keys(r.body).sort().join() === 'customerId,email,id,role', r.body);

  r = await me(bearer(b.token));
  check('blocked customer -> 403 account_inactive', r.status === 403 && r.body?.error?.code === 'account_inactive', r);

  // A role change is seen on the next request (read from the db, not the token).
  await admin.from('users').update({ role: 'support' }).eq('id', c.id);
  r = await me(bearer(c.token));
  check('role change applies immediately', r.status === 200 && r.body?.role === 'support', r);

  await admin.auth.admin.signOut(x.token, 'global');
  r = await me(bearer(x.token));
  check('token of a signed-out session -> 401', r.status === 401, r);

  await admin.auth.admin.deleteUser(c.id);
  created.splice(created.indexOf(c.id), 1);
  r = await me(bearer(c.token));
  check('token of a deleted user -> 401', r.status === 401, r);

  r = await me(bearer(b.token), 'POST');
  check('wrong method -> 405', r.status === 405, r.status);
} catch (error) {
  failures++;
  console.error('ERROR ', error.message ?? error);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const left = data.users.filter((u) => u.email?.startsWith('servertest-')).length;
  check('throwaway users removed', left === 0, left);
}

console.log(failures ? `\n${failures} failure(s)` : '\ntest-server: all checks passed');
process.exit(failures ? 1 : 0);
