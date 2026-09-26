import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/payouts/queue
// Actionable payouts (pending, approved, processing, failed), oldest first,
// with the practitioner and their current payable for context. Finance, admin,
// super_admin.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });

  const admin = adminClient();
  const { data, error } = await admin.from('payouts')
    .select('id, amount, currency, status, created_at, astrologer_id')
    .in('status', ['pending', 'approved', 'processing', 'failed'])
    .order('created_at');
  if (error) throw error;

  const ids = [...new Set((data ?? []).map((p) => p.astrologer_id))];
  const names = new Map();
  const payables = new Map();
  if (ids.length) {
    const [astros, bals] = await Promise.all([
      admin.from('astrologers').select('id, name').in('id', ids),
      admin.from('jyotish_balances').select('astrologer_id, payable').in('astrologer_id', ids),
    ]);
    if (astros.error) throw astros.error;
    if (bals.error) throw bals.error;
    for (const a of astros.data ?? []) names.set(a.id, a.name);
    for (const b of bals.data ?? []) payables.set(b.astrologer_id, b.payable);
  }

  return {
    payouts: (data ?? []).map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
      astrologer: { id: p.astrologer_id, name: names.get(p.astrologer_id) ?? null },
      payable: payables.get(p.astrologer_id) ?? null,
    })),
  };
});
