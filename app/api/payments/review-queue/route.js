import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REVIEWERS = ['finance', 'admin', 'super_admin'];

// GET /api/payments/review-queue
// Payments waiting for review, oldest consultation first. Each carries a
// short-lived signed URL for its proof -- the browser never reads the bucket
// directly. Finance, admin and super_admin only.
export const GET = route(async (request) => {
  await requireUser(request, { roles: REVIEWERS });

  const admin = adminClient();
  const { data, error } = await admin.from('payments')
    .select('id, amount, currency, customer_reference, proof_storage_path, updated_at, bookings!inner(id, scheduled_at, ends_at, status, customers(full_name), astrologers(name), services(name))')
    .eq('status', 'proof_submitted');
  if (error) throw error;

  // Oldest consultation first. Sorted here, not in the query: the queue is tiny
  // and an embedded order is silently ignored by PostgREST.
  data.sort((a, b) => (a.bookings.scheduled_at < b.bookings.scheduled_at ? -1 : 1));

  const payments = [];
  for (const pay of data) {
    const { data: url, error: urlError } = await admin.storage
      .from('payment-proofs').createSignedUrl(pay.proof_storage_path, 3600);
    if (urlError) throw urlError;
    const booking = pay.bookings;
    payments.push({
      id: pay.id,
      amount: pay.amount,
      currency: pay.currency,
      customerReference: pay.customer_reference,
      // updated_at moves exactly when the proof is recorded (0001 trigger).
      submittedAt: pay.updated_at,
      proofUrl: url.signedUrl,
      booking: { id: booking.id, startsAt: booking.scheduled_at, endsAt: booking.ends_at, status: booking.status },
      customer: { name: booking.customers?.full_name ?? null },
      astrologer: { name: booking.astrologers?.name ?? null },
      service: { name: booking.services?.name ?? null },
    });
  }
  return { payments };
});
