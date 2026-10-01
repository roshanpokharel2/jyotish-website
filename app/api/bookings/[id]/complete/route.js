import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Booking not found.'],
  INVALID_OUTCOME: [400, 'invalid_body', 'outcome must be completed or no_show.'],
  BOOKING_NOT_ENDED: [409, 'not_ended', 'The consultation has not ended yet.'],
  BOOKING_NOT_COMPLETABLE: [409, 'not_completable', 'Only a paid, confirmed booking can be completed.'],
  BOOKING_ALREADY_FINISHED: [409, 'already_finished', 'This booking already has that outcome.'],
};

// POST /api/bookings/:id/complete   { outcome: 'completed'|'no_show' }
// complete_booking() (0040) decides: the booking's practitioner, or support / admin /
// super_admin, once a paid booking has ended; staff may correct the outcome.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(...REFUSALS.NOT_FOUND);

  const { outcome } = await readJson(request);
  const { data, error } = await adminClient().rpc('complete_booking', {
    p_booking: id, p_actor: user.id, p_outcome: typeof outcome === 'string' ? outcome : null,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { booking: { id: data.id, status: data.status } };
});
