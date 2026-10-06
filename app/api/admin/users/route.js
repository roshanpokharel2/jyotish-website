import { requireUser } from '@/lib/server/auth';
import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/admin/users?q=&limit=&offset=
// Identifying fields only; credential data always stays inside Supabase Auth.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['super_admin'] });
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') ?? '')
    .replace(/[^\p{L}\p{N}@._+\- ]/gu, '').trim().slice(0, 100);
  const limit = params.has('limit') ? Number(params.get('limit')) : 50;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'invalid_query', 'Limit must be 1-100.');
  if (!Number.isInteger(offset) || offset < 0) throw new HttpError(400, 'invalid_query', 'Offset must be >= 0.');

  const admin = adminClient();
  let query = admin.from('users').select('id,email,role,created_at').order('created_at', { ascending: false });
  if (q) {
    const [emailMatches, profileMatches] = await Promise.all([
      admin.from('users').select('id').ilike('email', `%${q}%`).limit(100),
      admin.from('customers').select('user_id').or(`full_name.ilike.*${q}*,phone.ilike.*${q}*`).limit(100),
    ]);
    if (emailMatches.error) throw emailMatches.error;
    if (profileMatches.error) throw profileMatches.error;
    const ids = [...new Set([
      ...(emailMatches.data ?? []).map((user) => user.id),
      ...(profileMatches.data ?? []).map((profile) => profile.user_id),
    ])];
    if (!ids.length) return { limit, offset, hasMore: false, users: [] };
    query = query.in('id', ids);
  }

  const { data, error } = await query.range(offset, offset + limit);
  if (error) throw error;
  const hasMore = (data ?? []).length > limit;
  const page = (data ?? []).slice(0, limit);
  const ids = page.map((user) => user.id);
  const [customers, astrologers, consultants] = ids.length ? await Promise.all([
    admin.from('customers').select('user_id,full_name,phone').in('user_id', ids),
    admin.from('astrologers').select('user_id,name').in('user_id', ids),
    admin.from('consultants').select('user_id,name').in('user_id', ids),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  for (const result of [customers, astrologers, consultants]) if (result.error) throw result.error;
  const profiles = new Map();
  for (const row of consultants.data ?? []) profiles.set(row.user_id, { name: row.name });
  for (const row of astrologers.data ?? []) profiles.set(row.user_id, { ...profiles.get(row.user_id), name: row.name });
  for (const row of customers.data ?? []) profiles.set(row.user_id, { ...profiles.get(row.user_id), name: row.full_name, phone: row.phone });

  return {
    limit, offset, hasMore,
    users: page.map((user) => ({
      id: user.id, email: user.email, role: user.role,
      fullName: profiles.get(user.id)?.name ?? null,
      phone: profiles.get(user.id)?.phone ?? null,
    })),
  };
});