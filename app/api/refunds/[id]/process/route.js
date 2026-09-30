import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Refund not found.'],
  REFUND_ALREADY_PROCESSED: [409, 'already_processed', 'This refund is not awaiting transfer.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot process a refund for a payment you are party to.'],
};

// POST /api/refunds/:id/process   (approved -> processing: the transfer is in flight)
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Refund not found.');

  const { data, error } = await adminClient().rpc('mark_refund_processing', { p_refund: id, p_actor: user.id });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { refund: { id: data.id, status: data.status } };
});
