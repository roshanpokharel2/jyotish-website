import 'server-only';
import { HttpError, isUuid } from './http';
import { adminClient } from './supabase';

// What a conversation looks like in API responses (the same columns RLS lets a
// participant read directly).
export const CONVERSATION_COLUMNS = 'id, customer_id, astrologer_id, title, status, last_message_at, closed_at, created_at';

// The conversation, if `userId` is an active participant of it. Anything else is 404,
// so a caller cannot probe which conversation ids exist.
export async function participantConversation(conversationId, userId) {
  const notFound = new HttpError(404, 'not_found', 'Conversation not found.');
  if (!isUuid(conversationId)) throw notFound;
  const { data, error } = await adminClient()
    .from('chat_conversations')
    .select(`${CONVERSATION_COLUMNS}, is_active, chat_participants!inner(user_id)`)
    .eq('id', conversationId)
    .eq('chat_participants.user_id', userId)
    .eq('chat_participants.is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound;
  const { chat_participants, ...conversation } = data;
  return conversation;
}

export const isOpen = (conversation) => conversation.status === 'active' && conversation.is_active;

// The file's real type from its first bytes. The browser's declared type and the file
// name are not trusted. Only what the chat-attachments bucket accepts.
export function sniffType(bytes) {
  const starts = (...sig) => sig.every((b, i) => bytes[i] === b);
  if (starts(0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', ext: 'jpg', messageType: 'image' };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: 'image/png', ext: 'png', messageType: 'image' };
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return { mime: 'application/pdf', ext: 'pdf', messageType: 'file' };
  return null;
}

// A display name safe to store and show: no path, no control characters, bounded.
export function cleanFileName(name) {
  const base = String(name ?? '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim();
  return base.slice(-120) || 'attachment';
}
