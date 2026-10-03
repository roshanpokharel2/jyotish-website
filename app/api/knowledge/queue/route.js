import { requireUser } from '@/lib/server/auth';
import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/knowledge/queue?limit=&offset=
// Items awaiting moderation, oldest first, with their authors. Moderators,
// admins and super_admins (finance is out: they never moderate).
// `limit` (1-100, default 50) + `offset` page the queue; `hasMore` offers more.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['moderator', 'admin', 'super_admin'] });
  const params = new URL(request.url).searchParams;
  const limit = params.has('limit') ? Number(params.get('limit')) : 50;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'invalid_query', 'Limit must be 1-100.');
  if (!Number.isInteger(offset) || offset < 0) throw new HttpError(400, 'invalid_query', 'Offset must be >= 0.');

  const admin = adminClient();
  const { data, error } = await admin.from('knowledge_items')
    .select('id, content_type, title, body, status, visibility, language, created_at, author_id')
    .eq('status', 'pending_review')
    .order('created_at')
    .range(offset, offset + limit); // one extra probes hasMore
  if (error) throw error;

  const ids = [...new Set((data ?? []).map((k) => k.author_id).filter(Boolean))];
  const authors = new Map();
  if (ids.length) {
    const { data: users, error: usersError } = await admin.from('users').select('id, email, role').in('id', ids);
    if (usersError) throw usersError;
    for (const u of users ?? []) authors.set(u.id, { email: u.email, role: u.role });
  }

  const hasMore = (data ?? []).length > limit;
  const page = (data ?? []).slice(0, limit);
  return {
    limit, offset, hasMore,
    items: page.map((k) => ({
      id: k.id,
      contentType: k.content_type,
      title: k.title,
      body: k.body,
      status: k.status,
      visibility: k.visibility,
      language: k.language,
      createdAt: k.created_at,
      author: authors.get(k.author_id) ?? null,
    })),
  };
});
