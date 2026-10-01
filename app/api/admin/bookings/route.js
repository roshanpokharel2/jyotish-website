import { requireUser } from '@/lib/server/auth';
import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const ROLES = ['support', 'finance', 'admin', 'super_admin'];
const STATUSES = ['payment_pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired', 'pending', 'rescheduled'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/admin/bookings?status=&from=YYYY-MM-DD&to=YYYY-MM-DD
// Read only. Newest consultation first, at most 100; dates are Kathmandu days, `to`
// inclusive. Support cannot read customers or payments through RLS, so the server
// joins them and returns only what the list shows.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ROLES });
  const params = new URL(request.url).searchParams;
  const status = params.get('status') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  if (status && !STATUSES.includes(status)) throw new HttpError(400, 'invalid_query', 'Unknown booking status.');
  if ((from && !DAY.test(from)) || (to && !DAY.test(to))) throw new HttpError(400, 'invalid_query', 'Dates must be YYYY-MM-DD.');

  let query = adminClient().from('bookings')
    .select('id, scheduled_at, ends_at, status, consultation_mode, price_snapshot, currency, created_at, customer:customers(full_name, email), practitioner:astrologers(name), payments(status, created_at)')
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('scheduled_at', new Date(`${from}T00:00:00+05:45`).toISOString());
  if (to) query = query.lt('scheduled_at', new Date(new Date(`${to}T00:00:00+05:45`).getTime() + 86400e3).toISOString());
  const { data, error } = await query;
  if (error) throw error;

  return {
    bookings: data.map((b) => {
      const latest = [...(b.payments ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
      return {
        id: b.id, startsAt: b.scheduled_at, endsAt: b.ends_at, status: b.status, mode: b.consultation_mode,
        price: b.price_snapshot, currency: b.currency,
        customer: b.customer ? { name: b.customer.full_name, email: b.customer.email } : null,
        practitioner: b.practitioner?.name ?? null,
        paymentStatus: latest?.status ?? null,
      };
    }),
  };
});
