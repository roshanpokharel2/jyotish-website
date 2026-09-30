import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const BATCH = 10;
const MAX_ATTEMPTS = 10;

// Renders a queued job into subject/body at send time, so wording (and later,
// language) lives in one place. Returns null when there is nothing to send to.
async function render(admin, job) {
  const { data: user } = job.recipient_user_id
    ? await admin.auth.admin.getUserById(job.recipient_user_id)
    : { data: null };
  const email = user?.user?.email;
  if (!email) return null;

  const npt = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu' });
  switch (job.kind) {
    case 'payment_approved': {
      const { data: pay } = await admin.from('payments')
        .select('amount, currency, bookings(scheduled_at), question_consultations!payments_question_consultation_id_fkey(question_id)')
        .eq('id', job.entity_id).maybeSingle();
      if (!pay) return null;
      const question = pay.question_consultations;
      if (question) {
        return { email,
          subject: 'Question payment verified',
          body: `Your payment of ${pay.currency} ${pay.amount} was verified. Question Q-${String(question.question_id).padStart(6, '0')} has been sent to the astrologer.` };
      }
      if (!pay.bookings) return null;
      return { email,
        subject: 'Booking confirmed',
        body: `Your payment of ${pay.currency} ${pay.amount} was verified. See you on ${npt(pay.bookings.scheduled_at)} NPT.` };
    }
    case 'payment_rejected': {
      const { data: pay } = await admin.from('payments')
        .select('amount, currency, rejection_reason').eq('id', job.entity_id).maybeSingle();
      if (!pay) return null;
      return { email,
        subject: 'Payment not verified',
        body: `Your payment of ${pay.currency} ${pay.amount} could not be verified: ${pay.rejection_reason}. Please try again or contact support.` };
    }
    case 'refund_completed': {
      const { data: refund } = await admin.from('refunds')
        .select('amount, currency, external_reference').eq('id', job.entity_id).maybeSingle();
      if (!refund) return null;
      return { email,
        subject: 'Refund sent',
        body: `${refund.currency} ${refund.amount} was refunded to your account (ref ${refund.external_reference}).` };
    }
    case 'payout_paid': {
      const { data: payout } = await admin.from('payouts')
        .select('amount, currency, external_reference').eq('id', job.entity_id).maybeSingle();
      if (!payout) return null;
      return { email,
        subject: 'Payout sent',
        body: `${payout.currency} ${payout.amount} was paid out to your account (ref ${payout.external_reference}).` };
    }
    case 'booking_24h':
    case 'booking_1h': {
      const { data: booking } = await admin.from('bookings')
        .select('price_snapshot, currency, scheduled_at').eq('id', job.entity_id).maybeSingle();
      if (!booking) return null;
      const soon = job.kind === 'booking_24h' ? 'tomorrow' : 'in about an hour';
      return { email,
        subject: job.kind === 'booking_24h' ? 'Consultation tomorrow' : 'Consultation in one hour',
        body: `Reminder: your ${booking.currency} ${booking.price_snapshot} consultation is ${soon} at ${npt(booking.scheduled_at)} NPT.` };
    }
    default:
      return null;
  }
}

// POST /api/email/drain   Authorization: Bearer <CRON_SECRET>
// Sends up to 10 due emails via Resend: pending jobs, plus failed ones whose
// backoff has passed and which still have attempts left. Each send is claimed
// (pending/failed -> processing) only if it is still claimable, so two
// overlapping drains cannot send twice. Recipients who muted transactional
// mail or are gone are cancelled, never retried. Failures come back with a
// growing backoff; after MAX_ATTEMPTS the job is cancelled for staff to see.
//
// Scheduling is ops, not code: point a scheduler (pg_cron + pg_net, or any
// cron hitting this URL) at it every few minutes. Until then it runs on
// demand -- including from the test suite.
export const POST = route(async (request) => {
  // A scheduler secret, not a user session: no account is involved.
  if (!process.env.CRON_SECRET) throw new HttpError(503, 'not_configured', 'Email draining is not configured.');
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token || token !== process.env.CRON_SECRET) throw new HttpError(401, 'unauthenticated', 'A valid scheduler secret is required.');
  // This authenticates a scheduler secret, not a user session (requireUser is
  // for signed-in accounts), so no account is involved.

  if (!process.env.RESEND_API_KEY) throw new HttpError(503, 'not_configured', 'No email provider is configured.');
  const from = process.env.EMAIL_FROM;
  if (!from) throw new HttpError(503, 'not_configured', 'No sender address is configured.');

  const admin = adminClient();
  const { data: due, error: dueError } = await admin.from('email_jobs')
    .select('id, kind, entity_id, recipient_user_id, attempts')
    .or('status.eq.pending,and(status.eq.failed,scheduled_for.lte.now())')
    .order('scheduled_for')
    .limit(BATCH);
  if (dueError) throw dueError;

  const done = { sent: 0, failed: 0, cancelled: 0 };
  for (const job of due ?? []) {
    // Atomic claim: only one drain (or none, if it changed meanwhile) proceeds.
    const claimed = await admin.from('email_jobs')
      .update({ status: 'processing', attempts: job.attempts + 1 })
      .eq('id', job.id)
      .or('status.eq.pending,and(status.eq.failed,scheduled_for.lte.now())')
      .select('id');
    if (claimed.error) throw claimed.error;
    if (!claimed.data?.length) continue;

    const finish = async (patch) => {
      const { error } = await admin.from('email_jobs').update(patch).eq('id', job.id);
      if (error) throw error;
    };

    // Muted or gone recipients leave the queue quietly.
    if (job.recipient_user_id) {
      const { data: prefs } = await admin.from('notification_preferences')
        .select('email_transactional').eq('user_id', job.recipient_user_id).maybeSingle();
      if (prefs && !prefs.email_transactional) {
        await finish({ status: 'cancelled', last_error: 'recipient muted transactional email' });
        done.cancelled++;
        continue;
      }
    }
    const rendered = await render(admin, job);
    if (!rendered) {
      await finish({ status: 'cancelled', last_error: 'recipient or entity gone' });
      done.cancelled++;
      continue;
    }

    let response = null;
    let sendError = null;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: rendered.email, subject: rendered.subject, text: rendered.body }),
      });
    } catch (error) {
      sendError = error?.message ?? 'send failed';
    }
    if (response?.ok) {
      await finish({ status: 'sent', sent_at: new Date().toISOString(), last_error: null });
      done.sent++;
    } else {
      const detail = response
        ? `resend ${response.status}: ${(await response.text()).slice(0, 200)}`
        : sendError;
      if (job.attempts + 1 >= MAX_ATTEMPTS) {
        await finish({ status: 'cancelled', last_error: `gave up after ${MAX_ATTEMPTS} attempts: ${detail}` });
        done.cancelled++;
      } else {
        await finish({ status: 'failed', last_error: detail,
          scheduled_for: new Date(Date.now() + (job.attempts + 1) * 5 * 60e3).toISOString() });
        done.failed++;
      }
    }
  }
  return { drained: done };
});
