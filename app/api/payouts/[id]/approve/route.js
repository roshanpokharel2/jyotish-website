import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payout not found.'],
  PAYOUT_ALREADY_PROCESSED: [409, 'already_processed', 'This payout has already moved on.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot decide payouts.'],
};

// POST /api/payouts/:id/approve
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Payout not found.');

  const { data, error } = await adminClient().rpc('approve_payout', { p_payout: id, p_actor: user.id });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payout: { id: data.id, status: data.status } };
});
