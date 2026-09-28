import { requireUser } from '@/lib/server/auth';
import { CONVERSATION_COLUMNS } from '@/lib/server/chat';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// POST /api/chat/conversations  { astrologerId }
// Opens the caller's general conversation with an active practitioner, or returns the
// one already open. Temporary Phase 1 rule (AD-14): any active customer may chat with
// any active practitioner; tied to a booking from Step 10.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const { astrologerId } = await readJson(request);
  if (!isUuid(astrologerId)) throw new HttpError(400, 'invalid_body', 'astrologerId must be a uuid.');
  if (!user.customerId) throw new HttpError(403, 'no_customer', 'Only customers can start a conversation.');

  const admin = adminClient();
  const { data: astrologer, error } = await admin
    .from('astrologers').select('id, user_id, name, status, is_active').eq('id', astrologerId).maybeSingle();
  if (error) throw error;
  if (!astrologer || astrologer.status !== 'active' || !astrologer.is_active) {
    throw new HttpError(404, 'not_found', 'This practitioner is not available.');
  }
  if (astrologer.user_id === user.id) throw new HttpError(400, 'self', 'You cannot start a conversation with yourself.');

  const pair = { customer_id: user.customerId, astrologer_id: astrologer.id };
  const findOpen = () => admin.from('chat_conversations').select(CONVERSATION_COLUMNS)
    .match(pair).eq('status', 'active').is('consultation_id', null).is('booking_id', null).maybeSingle();

  let { data: conversation, error: findError } = await findOpen();
  if (findError) throw findError;
  if (!conversation) {
    const inserted = await admin.from('chat_conversations')
      .insert({ ...pair, title: astrologer.name }).select(CONVERSATION_COLUMNS).single();
    if (inserted.error?.code === '23505') {
      // A concurrent request opened it first (uq_chat_conversations_open_pair).
      ({ data: conversation, error: findError } = await findOpen());
      if (findError || !conversation) throw findError ?? new Error('open conversation vanished');
    } else if (inserted.error) {
      throw inserted.error;
    } else {
      conversation = inserted.data;
    }
  }

  // Always (re)ensured, so a conversation whose participant insert failed heals on the
  // next open instead of being invisible to both sides.
  const { error: participantsError } = await admin.from('chat_participants').upsert([
    { conversation_id: conversation.id, user_id: user.id, role: 'customer' },
    { conversation_id: conversation.id, user_id: astrologer.user_id, role: 'astrologer' },
  ], { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
  if (participantsError) throw participantsError;

  return { conversation };
});
