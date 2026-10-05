import { requireUser } from '@/lib/server/auth';
import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// GET /api/payouts/queue?limit=&offset=
// Actionable payouts (pending, approved, processing, failed), oldest first,
// with the practitioner and their current payable for context. Finance, admin,
// super_admin. `limit` (1-100, default 50) + `offset` page the queue.
export const GET = route(async (request) => {
  await requireUser(request, { roles: ['finance', 'admin', 'super_admin'] });
  const params = new URL(request.url).searchParams;
  const limit = params.has('limit') ? Number(params.get('limit')) : 50;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new HttpError(400, 'invalid_query', 'Limit must be 1-100.');
  if (!Number.isInteger(offset) || offset < 0) throw new HttpError(400, 'invalid_query', 'Offset must be >= 0.');

  const admin = adminClient();
  const { data, error } = await admin.from('payouts')
    .select('id, amount, currency, status, created_at, astrologer_id')
    .in('status', ['pending', 'approved', 'processing', 'failed'])
    .order('created_at')
    .range(offset, offset + limit); // one extra probes hasMore
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

  const hasMore = (data ?? []).length > limit;
  const page = (data ?? []).slice(0, limit);
  return {
    limit, offset, hasMore,
    payouts: page.map((p) => ({
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
