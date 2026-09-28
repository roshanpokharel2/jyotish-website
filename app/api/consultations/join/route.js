import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// Grants per stored consultation mode (plan Step 18): audio publishes
// microphone only; video and audio_video publish microphone and camera. The
// mode comes from consultation_join_info(), never from the request.
const SOURCES = {
  audio: [TrackSource.MICROPHONE],
  video: [TrackSource.MICROPHONE, TrackSource.CAMERA],
  audio_video: [TrackSource.MICROPHONE, TrackSource.CAMERA],
};

// Refusals raised by consultation_join_info() (0033), as the caller sees them.
const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Consultation not found.'],
  CONSULTATION_NOT_JOINABLE: [409, 'not_joinable', 'This consultation cannot be joined right now.'],
};

// POST /api/consultations/join   { bookingId }
// Mints a short-lived LiveKit token for the booking's own customer or
// practitioner, inside the join window, for a paid booking. No token is ever
// persisted; the secret never leaves the server.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const { bookingId } = await readJson(request);
  if (!isUuid(bookingId)) throw new HttpError(400, 'invalid_body', 'bookingId must be a uuid.');

  const { apiKey, apiSecret, wsUrl } = {
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    wsUrl: (process.env.LIVEKIT_URL ?? '').replace(/^http/, 'ws'),
  };
  if (!apiKey || !apiSecret || !/^wss:\/\//.test(wsUrl)) {
    throw new HttpError(503, 'not_configured', 'Consultations are not configured.');
  }

  const admin = adminClient();
  const { data: info, error } = await admin.rpc('consultation_join_info', { p_booking: bookingId, p_user: user.id });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;

  const sources = SOURCES[info.mode];
  // Unknown modes are platform data corruption: log it loudly, tell the caller nothing.
  if (!sources) throw new Error(`unknown consultation mode: ${info.mode}`);

  const token = new AccessToken(apiKey, apiSecret, { identity: info.identity, name: info.name, ttl: '2h' });
  token.addGrant({
    roomJoin: true,
    room: info.room,
    canPublish: true,
    canPublishSources: sources,
    canSubscribe: true,
  });

  return { token: await token.toJwt(), url: wsUrl, room: info.room, mode: info.mode };
});
