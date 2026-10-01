import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// Refusals raised by reject_payment() (0018), as the caller sees them.
const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payment not found.'],
  PROOF_NOT_SUBMITTED: [409, 'proof_not_submitted', 'Proof has not been submitted for this payment yet.'],
  PAYMENT_ALREADY_PROCESSED: [409, 'already_processed', 'This payment has already been decided.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot reject a payment you are party to.'],
};

// POST /api/payments/:id/reject   { reason }
// Cancels the booking (freeing the slot) or closes the question, and marks the payment rejected, in one
// database transaction (the audit row included). The reason is required.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Payment not found.');

  const { reason } = await readJson(request);
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
    throw new HttpError(400, 'invalid_body', 'reason must be text of 1 to 1000 characters.');
  }

  const { data, error } = await adminClient().rpc('reject_payment', { p_payment: id, p_reviewer: user.id, p_reason: reason.trim() });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payment: { id: data.id, status: data.status } };
});
