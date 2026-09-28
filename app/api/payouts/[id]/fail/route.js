import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payout not found.'],
  PAYOUT_ALREADY_PROCESSED: [409, 'already_processed', 'This payout is not awaiting transfer.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot decide payouts.'],
};

// POST /api/payouts/:id/fail   { note }
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Payout not found.');

  const { note } = await readJson(request);
  if (typeof note !== 'string' || !note.trim() || note.length > 2000) {
    throw new HttpError(400, 'invalid_body', 'note must be text of 1 to 2000 characters.');
  }

  const { data, error } = await adminClient().rpc('mark_payout_failed', { p_payout: id, p_actor: user.id, p_note: note.trim() });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payout: { id: data.id, status: data.status } };
});
