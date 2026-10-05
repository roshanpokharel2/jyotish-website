import { requireUser } from '@/lib/server/auth';
import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const SUPPORT = ['support', 'admin', 'super_admin'];

// GET /api/admin/customers?q=&limit=&offset=
// Account holders by name or email, newest first. Staff have no RLS read on
// customers (birth details are private), so this returns only the columns support needs.
// `limit` (1-100, default 50) + `offset` page the search; `hasMore` offers more.
export const GET = route(async (request) => {
  await requireUser(request, { roles: SUPPORT });
  const params = new URL(request.url).searchParams;
  // Only characters a name or email uses: the term goes into a PostgREST filter.
  const q = (params.get('q') ?? '')
    .replace(/[^\p{L}\p{N}@._+\- ]/gu, '').trim().slice(0, 100);
  const limit = params.has('limit') ? Number(params.get('limit')) : 50;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'invalid_query', 'Limit must be 1-100.');
  if (!Number.isInteger(offset) || offset < 0) throw new HttpError(400, 'invalid_query', 'Offset must be >= 0.');

  const admin = adminClient();
  let query = admin.from('customers')
    .select('id, user_id, full_name, email, phone, status, created_at, user:users(role, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit); // one extra probes hasMore
  if (q) {
    // customers.email is a copy made at first sign-in and may be empty; users.email
    // mirrors auth, so match it too.
    const byEmail = await admin.from('users').select('id').ilike('email', `%${q}%`).limit(50);
    if (byEmail.error) throw byEmail.error;
    const ids = byEmail.data.map((u) => u.id);
    query = query.or([`full_name.ilike.*${q}*`, `email.ilike.*${q}*`, ...(ids.length ? [`user_id.in.(${ids})`] : [])].join(','));
  }
  const { data, error } = await query;
  if (error) throw error;

  const hasMore = (data ?? []).length > limit;
  const page = (data ?? []).slice(0, limit);
  return {
    limit, offset, hasMore,
    customers: page.map((c) => ({
      id: c.id, userId: c.user_id, fullName: c.full_name, email: c.email ?? c.user?.email ?? null, phone: c.phone,
      status: c.status, role: c.user?.role ?? null, createdAt: c.created_at,
    })),
  };
});
