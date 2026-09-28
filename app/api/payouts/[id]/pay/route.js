import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payout not found.'],
  PAYOUT_ALREADY_PROCESSED: [409, 'already_processed', 'This payout is already finished.'],
  PAYOUT_TOO_LARGE: [409, 'too_large', 'The payable balance no longer covers this payout.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot decide payouts.'],
};

// POST /api/payouts/:id/pay   { externalReference, notes? }
// The transfer already happened; this records it and writes the payout ledger
// entry in one transaction.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Payout not found.');

  const { externalReference, notes } = await readJson(request);
  if (typeof externalReference !== 'string' || !externalReference.trim() || externalReference.length > 200) {
    throw new HttpError(400, 'invalid_body', 'externalReference must be text of 1 to 200 characters.');
  }
  if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) {
    throw new HttpError(400, 'invalid_body', 'notes must be text of at most 2000 characters.');
  }

  const { data, error } = await adminClient().rpc('mark_payout_paid', {
    p_payout: id, p_actor: user.id, p_external_reference: externalReference.trim(), p_notes: notes ?? null,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payout: { id: data.id, status: data.status } };
});
