import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Knowledge item not found.'],
  KNOWLEDGE_ALREADY_PROCESSED: [409, 'already_processed', 'Only drafts and rejections can be submitted.'],
  FORBIDDEN: [403, 'forbidden', 'You can only submit your own work.'],
};

// POST /api/knowledge/:id/submit   (draft|rejected -> pending_review)
// The author sends their own work for review; staff may submit on their behalf.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Knowledge item not found.');

  const { data, error } = await adminClient().rpc('submit_knowledge', { p_item: id, p_actor: user.id });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { item: { id: data.id, status: data.status } };
});
