import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const STAFF = ['moderator', 'support', 'finance', 'admin', 'super_admin'];
const MONEY = ['finance', 'admin', 'super_admin'];
const MODERATION = ['moderator', 'admin', 'super_admin'];

// Today in Kathmandu as [start, end) instants.
function kathmanduToday() {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });
  const start = new Date(`${day}T00:00:00+05:45`);
  return [start.toISOString(), new Date(start.getTime() + 86400e3).toISOString()];
}

// GET /api/admin/overview
// What is waiting, as counts only. Each count is returned only to the roles that
// may open that queue (the same lists as the queue endpoints); the rest are absent.
export const GET = route(async (request) => {
  const { role } = await requireUser(request, { roles: STAFF });
  const admin = adminClient();
  const [from, to] = kathmanduToday();

  const count = async (query) => {
    const { count: n, error } = await query;
    if (error) throw error;
    return n ?? 0;
  };
  const head = (table) => admin.from(table).select('id', { count: 'exact', head: true });

  const counts = {
    applications: count(head('astrologers').eq('status', 'pending_review')),
    bookingsToday: count(head('bookings').in('status', ['confirmed', 'in_progress', 'completed']).gte('scheduled_at', from).lt('scheduled_at', to)),
    questionsWaiting: count(head('question_consultations').in('status', ['PAID', 'IN REVIEW'])),
  };
  if (MONEY.includes(role)) {
    counts.proofs = count(head('payments').eq('status', 'proof_submitted'));
    counts.refunds = count(head('refunds').in('status', ['requested', 'approved', 'processing']));
    counts.payouts = count(head('payouts').in('status', ['pending', 'approved', 'processing', 'failed']));
  }
  if (MODERATION.includes(role)) {
    counts.knowledge = count(head('knowledge_items').eq('status', 'pending_review'));
  }

  const keys = Object.keys(counts);
  const values = await Promise.all(Object.values(counts));
  return { role, counts: Object.fromEntries(keys.map((k, i) => [k, values[i]])) };
});
