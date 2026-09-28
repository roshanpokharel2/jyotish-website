import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Knowledge item not found.'],
  KNOWLEDGE_ALREADY_PROCESSED: [409, 'already_processed', 'This item is not awaiting that decision.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot moderate knowledge.'],
};

// POST /api/knowledge/:id/moderate   { decision: 'published'|'rejected'|'archived' }
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['moderator', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Knowledge item not found.');

  const { decision } = await readJson(request);
  if (!['published', 'rejected', 'archived'].includes(decision)) {
    throw new HttpError(400, 'invalid_body', 'decision must be published, rejected or archived.');
  }

  const { data, error } = await adminClient().rpc('moderate_knowledge', { p_item: id, p_actor: user.id, p_decision: decision });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { item: { id: data.id, status: data.status } };
});
