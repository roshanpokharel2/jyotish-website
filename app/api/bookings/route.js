import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// Refusals raised by create_booking() (0014/0015), as the caller sees them.
const REFUSALS = {
  CUSTOMER_NOT_ACTIVE: [403, 'account_inactive', 'This account is not active. Please contact support.'],
  SELF_BOOKING: [400, 'self', 'You cannot book a consultation with yourself.'],
  SERVICE_NOT_BOOKABLE: [404, 'not_found', 'This service is not available with this practitioner.'],
  SLOT_UNAVAILABLE: [409, 'slot_unavailable', 'This time is no longer available. Please choose another.'],
  TOO_MANY_HOLDS: [409, 'too_many_holds', 'You already have two bookings awaiting payment.'],
};

// An instant with an explicit offset, e.g. 2026-10-01T10:00:00+05:45 or ...Z.
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/;

// POST /api/bookings  { astrologerId, serviceId, startsAt, notes? }
// Books one of the start times available_slots() offers, for the signed-in customer.
// Everything else -- end time, price, currency, mode, status, the hold -- is decided by
// the database. The booking starts `payment_pending` and holds the slot for
// `reservation_minutes`.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const { astrologerId, serviceId, startsAt, notes } = await readJson(request);
  if (!isUuid(astrologerId) || !isUuid(serviceId)) {
    throw new HttpError(400, 'invalid_body', 'astrologerId and serviceId must be uuids.');
  }
  if (typeof startsAt !== 'string' || !INSTANT.test(startsAt) || Number.isNaN(Date.parse(startsAt))) {
    throw new HttpError(400, 'invalid_body', 'startsAt must be a date and time with a time zone.');
  }
  if (notes != null && (typeof notes !== 'string' || notes.length > 2000)) {
    throw new HttpError(400, 'invalid_body', 'notes must be text of at most 2000 characters.');
  }
  if (!user.customerId) throw new HttpError(403, 'no_customer', 'Only customers can book a consultation.');

  const { data: booking, error } = await adminClient().rpc('create_booking', {
    p_customer: user.customerId,
    p_astrologer: astrologerId,
    p_service: serviceId,
    p_starts_at: new Date(startsAt).toISOString(),
    p_notes: notes ?? null,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;

  // The commission snapshot is the platform's business, not the customer's.
  const { id, status, service_id, astrologer_id, scheduled_at, ends_at, hold_expires_at,
    consultation_mode, price_snapshot, currency } = booking;
  return {
    booking: {
      id, status, serviceId: service_id, astrologerId: astrologer_id, startsAt: scheduled_at, endsAt: ends_at,
      holdExpiresAt: hold_expires_at, mode: consultation_mode, price: price_snapshot, currency,
      notes: booking.notes,
    },
  };
});
