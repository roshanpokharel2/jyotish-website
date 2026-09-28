import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// Refusals raised by approve_payment() (0018), as the caller sees them.
// FORBIDDEN is the function's own verdict: the caller passed the role gate but
// the payment is for their own booking.
const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payment not found.'],
  PROOF_NOT_SUBMITTED: [409, 'proof_not_submitted', 'Proof has not been submitted for this payment yet.'],
  PAYMENT_ALREADY_PROCESSED: [409, 'already_processed', 'This payment has already been decided.'],
  RESERVATION_EXPIRED: [409, 'reservation_expired', 'The hold has lapsed, so this booking can no longer be confirmed.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot approve a payment for your own booking.'],
};

// POST /api/payments/:id/approve
// Confirms the booking and marks the payment paid, in one database transaction
// (the audit row included). Finance, admin and super_admin only.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Payment not found.');

  const { data, error } = await adminClient().rpc('approve_payment', { p_payment: id, p_reviewer: user.id });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payment: { id: data.id, status: data.status } };
});
