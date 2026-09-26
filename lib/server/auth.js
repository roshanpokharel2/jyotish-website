import 'server-only';
import { HttpError } from './http';
import { adminClient } from './supabase';

// Who is calling. The browser sends its Supabase access token as
// `Authorization: Bearer <token>` (no cookies, so no CSRF surface). The token is checked
// by Supabase Auth itself, so a forged, expired or signed-out token is refused, and the
// role and account status are read fresh from the database -- never from the token or
// the request.
//
// Refuses with 401 (no valid session) or 403 (account not active, or role not in
// `roles`). Returns { id, email, role, customerId }.
export async function requireUser(request, { roles } = {}) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) throw new HttpError(401, 'unauthenticated', 'Please sign in.');

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error) {
    // 4xx: the token itself is bad. Anything else (Auth unreachable) is our problem.
    if (error.status >= 400 && error.status < 500) {
      throw new HttpError(401, 'unauthenticated', 'Your session has expired. Please sign in again.');
    }
    throw error;
  }

  const userId = data.user.id;
  const [profile, customer] = await Promise.all([
    admin.from('users').select('role').eq('id', userId).maybeSingle(),
    admin.from('customers').select('id, status').eq('user_id', userId).maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  if (customer.error) throw customer.error;
  if (!profile.data) throw new HttpError(403, 'no_account', 'This sign-in has no account on the platform.');

  // A blocked or deactivated account gets nothing from the server (0008 made the status
  // platform-owned; this is where it takes effect).
  if (customer.data && customer.data.status !== 'active') {
    throw new HttpError(403, 'account_inactive', 'This account is not active. Please contact support.');
  }
  if (roles && !roles.includes(profile.data.role)) {
    throw new HttpError(403, 'forbidden', 'You do not have access to this.');
  }

  return { id: userId, email: data.user.email, role: profile.data.role, customerId: customer.data?.id ?? null };
}
