import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const STAFF = ['finance', 'admin', 'super_admin'];

// Refusals raised by request_refund() (0023), as the caller sees them.
const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payment not found.'],
  REFUND_NOT_ALLOWED: [409, 'not_refundable', 'Only paid payments can be refunded.'],
  REFUND_TOO_LARGE: [409, 'too_large', 'Open refunds already cover this payment.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot record a refund for your own booking.'],
};

// POST /api/refunds   { paymentId, amount, reason }
// Records that a customer is owed money back. Finance, admin, super_admin.
export const POST = route(async (request) => {
  const user = await requireUser(request, { roles: STAFF });
  const { paymentId, amount, reason } = await readJson(request);
  if (!isUuid(paymentId)) throw new HttpError(400, 'invalid_body', 'paymentId must be a uuid.');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'invalid_body', 'amount must be a positive number.');
  }
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
    throw new HttpError(400, 'invalid_body', 'reason must be text of 1 to 1000 characters.');
  }

  const { data, error } = await adminClient().rpc('request_refund', {
    p_payment: paymentId, p_actor: user.id, p_amount: amount, p_reason: reason.trim(),
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { refund: { id: data.id, status: data.status, amount: data.amount } };
});
