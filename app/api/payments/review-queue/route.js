import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const REVIEWERS = ['finance', 'admin', 'super_admin'];

// payments <-> question_consultations have a link each way; name the one to follow.
const QUESTION = 'question_consultations!payments_question_consultation_id_fkey(id, question_id, question_text, status, customers(full_name), astrologers(name))';

// GET /api/payments/review-queue
// Payments waiting for review: bookings by consultation time, questions by when
// the proof came in. Each carries a short-lived signed URL for its proof -- the
// browser never reads the bucket directly. Finance, admin and super_admin only.
export const GET = route(async (request) => {
  await requireUser(request, { roles: REVIEWERS });

  const admin = adminClient();
  const { data, error } = await admin.from('payments')
    .select(`id, amount, currency, customer_reference, proof_storage_path, updated_at, bookings(id, scheduled_at, ends_at, status, customers(full_name), astrologers(name), services(name)), ${QUESTION}`)
    .eq('status', 'proof_submitted');
  if (error) throw error;

  // Sorted here, not in the query: the queue is tiny and an embedded order is
  // silently ignored by PostgREST. updated_at moves exactly when the proof is
  // recorded (0001 trigger).
  const when = (pay) => pay.bookings?.scheduled_at ?? pay.updated_at;
  data.sort((a, b) => (when(a) < when(b) ? -1 : 1));

  const payments = [];
  for (const pay of data) {
    const { data: url, error: urlError } = await admin.storage
      .from('payment-proofs').createSignedUrl(pay.proof_storage_path, 3600);
    if (urlError) throw urlError;
    const booking = pay.bookings;
    const question = pay.question_consultations;
    const source = booking ?? question;
    payments.push({
      id: pay.id,
      kind: booking ? 'booking' : 'question',
      amount: pay.amount,
      currency: pay.currency,
      customerReference: pay.customer_reference,
      submittedAt: pay.updated_at,
      proofUrl: url.signedUrl,
      booking: booking ? { id: booking.id, startsAt: booking.scheduled_at, endsAt: booking.ends_at, status: booking.status } : null,
      question: question ? { id: question.id, number: question.question_id, text: question.question_text, status: question.status } : null,
      customer: { name: source?.customers?.full_name ?? null },
      astrologer: { name: source?.astrologers?.name ?? null },
      service: { name: booking?.services?.name ?? null },
    });
  }
  return { payments };
});
