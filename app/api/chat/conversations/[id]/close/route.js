import { requireUser } from '@/lib/server/auth';
import { CONVERSATION_COLUMNS, isOpen, participantConversation } from '@/lib/server/chat';
import { route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// POST /api/chat/conversations/:id/close
// Either participant may close. History stays readable; nobody can post afterwards
// (the 0010 insert policy requires an active conversation). Closing twice is a no-op.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const conversation = await participantConversation((await params).id, user.id);
  if (!isOpen(conversation)) return { conversation };

  const { data, error } = await adminClient().from('chat_conversations')
    .update({ status: 'closed', is_active: false, closed_at: new Date().toISOString() })
    .eq('id', conversation.id).select(CONVERSATION_COLUMNS).single();
  if (error) throw error;
  return { conversation: data };
});
