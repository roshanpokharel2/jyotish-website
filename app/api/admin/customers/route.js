import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const SUPPORT = ['support', 'admin', 'super_admin'];

// GET /api/admin/customers?q=
// Account holders by name or email, newest first, at most 50. Staff have no RLS read on
// customers (birth details are private), so this returns only the columns support needs.
export const GET = route(async (request) => {
  await requireUser(request, { roles: SUPPORT });
  // Only characters a name or email uses: the term goes into a PostgREST filter.
  const q = (new URL(request.url).searchParams.get('q') ?? '')
    .replace(/[^\p{L}\p{N}@._+\- ]/gu, '').trim().slice(0, 100);

  const admin = adminClient();
  let query = admin.from('customers')
    .select('id, user_id, full_name, email, phone, status, created_at, user:users(role, email)')
    .order('created_at', { ascending: false })
    .limit(50);
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

  return {
    customers: data.map((c) => ({
      id: c.id, userId: c.user_id, fullName: c.full_name, email: c.email ?? c.user?.email ?? null, phone: c.phone,
      status: c.status, role: c.user?.role ?? null, createdAt: c.created_at,
    })),
  };
});
