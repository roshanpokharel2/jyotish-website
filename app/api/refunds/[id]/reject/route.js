import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Refund not found.'],
  REFUND_ALREADY_PROCESSED: [409, 'already_processed', 'This refund has already been decided.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot decide a refund for a payment you are party to.'],
};

// POST /api/refunds/:id/reject   { note }
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Refund not found.');

  const { note } = await readJson(request);
  if (typeof note !== 'string' || !note.trim() || note.length > 2000) {
    throw new HttpError(400, 'invalid_body', 'note must be text of 1 to 2000 characters.');
  }

  const { data, error } = await adminClient().rpc('reject_refund', { p_refund: id, p_actor: user.id, p_note: note.trim() });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { refund: { id: data.id, status: data.status } };
});
