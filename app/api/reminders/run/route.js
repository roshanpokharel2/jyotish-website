import { HttpError, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// POST /api/reminders/run   Authorization: Bearer <CRON_SECRET>
// Runs generate_reminders() (0029): confirmed bookings inside 24h/1h are
// notified at-most-once each. Same scheduler story as the email drain: point a
// scheduler at it every 15 minutes (or pg_cron at the SQL function directly).
// A scheduler secret, not a user session, so no account is involved.
export const POST = route(async (request) => {
  if (!process.env.CRON_SECRET) throw new HttpError(503, 'not_configured', 'Reminders are not configured.');
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token || token !== process.env.CRON_SECRET) throw new HttpError(401, 'unauthenticated', 'A valid scheduler secret is required.');

  const { data, error } = await adminClient().rpc('generate_reminders');
  if (error) throw error;
  return { generated: data };
});
