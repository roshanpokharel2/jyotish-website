import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/knowledge/queue
// Items awaiting moderation, oldest first, with their authors. Moderators,
// admins and super_admins (finance is out: they never moderate).
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['moderator', 'admin', 'super_admin'] });

  const admin = adminClient();
  const { data, error } = await admin.from('knowledge_items')
    .select('id, content_type, title, body, status, visibility, language, created_at, author_id')
    .eq('status', 'pending_review')
    .order('created_at');
  if (error) throw error;

  const ids = [...new Set((data ?? []).map((k) => k.author_id).filter(Boolean))];
  const authors = new Map();
  if (ids.length) {
    const { data: users, error: usersError } = await admin.from('users').select('id, email, role').in('id', ids);
    if (usersError) throw usersError;
    for (const u of users ?? []) authors.set(u.id, { email: u.email, role: u.role });
  }

  return {
    items: (data ?? []).map((k) => ({
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
