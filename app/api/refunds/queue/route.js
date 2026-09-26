import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/refunds/queue
// Open refunds (requested, approved, processing), oldest first, with the
// payment, booking and customer they belong to. Finance, admin, super_admin.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });

  const admin = adminClient();
  const { data: refunds, error: refundsError } = await admin.from('refunds')
    .select('id, amount, currency, status, reason, created_at, payment_id')
    .in('status', ['requested', 'approved', 'processing'])
    .order('created_at');
  if (refundsError) throw refundsError;

  // Two steps, not one embed: refunds.payment_id is deliberately not a foreign
  // key (0032), so PostgREST cannot infer the join. payments -> bookings still is.
  const byId = new Map();
  const paymentIds = [...new Set((refunds ?? []).map((r) => r.payment_id))];
  if (paymentIds.length) {
    const { data: pays, error: paysError } = await admin.from('payments')
      .select('id, amount, status, bookings!inner(id, scheduled_at, status, customers(full_name))')
      .in('id', paymentIds);
    if (paysError) throw paysError;
    for (const pay of pays ?? []) byId.set(pay.id, pay);
  }

  return {
    refunds: (refunds ?? []).map((r) => {
      const pay = byId.get(r.payment_id);
      return {
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        createdAt: r.created_at,
        payment: pay ? { id: pay.id, amount: pay.amount, status: pay.status } : null,
        booking: pay ? { id: pay.bookings.id, startsAt: pay.bookings.scheduled_at, status: pay.bookings.status } : null,
        customer: { name: pay?.bookings.customers?.full_name ?? null },
      };
    }),
  };
});
