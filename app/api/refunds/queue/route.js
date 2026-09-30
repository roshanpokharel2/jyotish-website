import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/refunds/queue
// Open refunds (requested, approved, processing), oldest first, with the
// payment, booking or question, and customer they belong to. Finance, admin, super_admin.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });

  const admin = adminClient();
  const { data: refunds, error: refundsError } = await admin.from('refunds')
    .select('id, amount, currency, status, reason, created_at, payment_id')
    .in('status', ['requested', 'approved', 'processing'])
    .order('created_at');
  if (refundsError) throw refundsError;

  // Two steps, not one embed: refunds.payment_id is deliberately not a foreign
  // key (0032), so PostgREST cannot infer the join. payments -> bookings and
  // payments -> question_consultations still are (the latter named: 0034 links
  // the two tables both ways).
  const byId = new Map();
  const paymentIds = [...new Set((refunds ?? []).map((r) => r.payment_id))];
  if (paymentIds.length) {
    const { data: pays, error: paysError } = await admin.from('payments')
      .select('id, amount, status, bookings(id, scheduled_at, status, customers(full_name)), question_consultations!payments_question_consultation_id_fkey(id, question_id, question_text, status, customers(full_name))')
      .in('id', paymentIds);
    if (paysError) throw paysError;
    for (const pay of pays ?? []) byId.set(pay.id, pay);
  }

  return {
    refunds: (refunds ?? []).map((r) => {
      const pay = byId.get(r.payment_id);
      const booking = pay?.bookings;
      const question = pay?.question_consultations;
      return {
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        createdAt: r.created_at,
        kind: booking ? 'booking' : question ? 'question' : null,
        payment: pay ? { id: pay.id, amount: pay.amount, status: pay.status } : null,
        booking: booking ? { id: booking.id, startsAt: booking.scheduled_at, status: booking.status } : null,
        question: question ? { id: question.id, number: question.question_id, text: question.question_text, status: question.status } : null,
        customer: { name: (booking ?? question)?.customers?.full_name ?? null },
      };
    }),
  };
});
