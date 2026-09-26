import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// Refusals raised by request_payout() (0025), as the caller sees them.
const REFUSALS = {
  PAYOUT_NOT_ALLOWED: [404, 'not_found', 'No payout balance found for this practitioner.'],
  PAYOUT_TOO_SMALL: [409, 'too_small', 'Payouts must reach the platform minimum.'],
  PAYOUT_TOO_LARGE: [409, 'too_large', 'Open payouts already cover the payable balance.'],
  FORBIDDEN: [403, 'forbidden', 'You can only request a payout for yourself.'],
};

// POST /api/payouts   { astrologerId, amount }
// The practitioner asks for their own earnings. Ownership, floor and balance
// are all checked against the database, never the request.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const { astrologerId, amount } = await readJson(request);
  if (!isUuid(astrologerId)) throw new HttpError(400, 'invalid_body', 'astrologerId must be a uuid.');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'invalid_body', 'amount must be a positive number.');
  }

  const { data, error } = await adminClient().rpc('request_payout', {
    p_astrologer: astrologerId, p_amount: amount, p_actor: user.id,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { payout: { id: data.id, status: data.status, amount: data.amount } };
});
