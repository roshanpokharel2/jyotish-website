import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Refund not found.'],
  REFUND_ALREADY_PROCESSED: [409, 'already_processed', 'This refund is already finished.'],
  LEDGER_MISMATCH: [409, 'ledger_mismatch', 'This payment has no complete ledger record to reverse.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot complete a refund for a payment you are party to.'],
};

// POST /api/refunds/:id/complete   { externalReference, proofPath?, notes? }
// The transfer already happened on eSewa; this records it and writes the
// reversal ledger entries in one transaction.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Refund not found.');

  const { externalReference, proofPath, notes } = await readJson(request);
  if (typeof externalReference !== 'string' || !externalReference.trim() || externalReference.length > 200) {
    throw new HttpError(400, 'invalid_body', 'externalReference must be text of 1 to 200 characters.');
  }
  if (proofPath != null && (typeof proofPath !== 'string' || !proofPath.trim() || proofPath.length > 500)) {
    throw new HttpError(400, 'invalid_body', 'proofPath must be text of 1 to 500 characters.');
  }
  if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) {
    throw new HttpError(400, 'invalid_body', 'notes must be text of at most 2000 characters.');
  }

  const { data, error } = await adminClient().rpc('complete_refund', {
    p_refund: id, p_actor: user.id, p_external_reference: externalReference.trim(),
    p_proof_path: proofPath?.trim() ?? null, p_notes: notes ?? null,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { refund: { id: data.id, status: data.status } };
});
