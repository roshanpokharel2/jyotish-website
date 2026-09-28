import { requireUser } from '@/lib/server/auth';
import { participantConversation } from '@/lib/server/chat';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// POST /api/chat/conversations/:id/read
// Marks everything up to now as read for the caller (chat_participants.last_read_at).
// The time is the server's; the browser cannot move it.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const conversation = await participantConversation((await params).id, user.id);

  const { data, error } = await adminClient().from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversation.id).eq('user_id', user.id)
    .select('last_read_at').single();
  if (error) throw error;
  return { lastReadAt: data.last_read_at };
});
