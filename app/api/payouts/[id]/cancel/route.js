import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payout not found.'],
  PAYOUT_ALREADY_PROCESSED: [409, 'already_processed', 'This payout can no longer be cancelled.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot cancel this payout.'],
};

// POST /api/payouts/:id/cancel   { note }
// The practitioner cancels their own pending/approved row; staff cancel
// anything unpaid. Decided inside the function from the database.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Payout not found.');

  const { note } = await readJson(request);
  if (typeof note !== 'string' || !note.trim() || note.length > 2000) {
    throw new HttpError(400, 'invalid_body', 'note must be text of 1 to 2000 characters.');
  }

  const { data, error } = await adminClient().rpc('cancel_payout', { p_payout: id, p_actor: user.id, p_note: note.trim() });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payout: { id: data.id, status: data.status } };
});
