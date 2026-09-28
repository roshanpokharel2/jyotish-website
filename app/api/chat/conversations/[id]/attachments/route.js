import { randomUUID } from 'node:crypto';
import { requireUser } from '@/lib/server/auth';
import { cleanFileName, isOpen, participantConversation, sniffType } from '@/lib/server/chat';
import { HttpError, readBody, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const MAX_FILE = 10 * 1024 * 1024; // matches the chat-attachments bucket (0011)
const MAX_BODY = MAX_FILE + 64 * 1024; // room for the multipart envelope

// POST /api/chat/conversations/:id/attachments   multipart/form-data, one `file` field
// Stores the file at chat-attachments/{conversation}/{random}.{ext} and posts it as the
// caller's message. JPEG, PNG or PDF by content, 10 MB at most.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const conversation = await participantConversation((await params).id, user.id);
  if (!isOpen(conversation)) throw new HttpError(409, 'closed', 'This conversation is closed.');

  const contentType = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data\b/i.test(contentType)) {
    throw new HttpError(415, 'unsupported_type', 'Send the file as multipart/form-data.');
  }
  let files;
  try {
    const form = await new Response(await readBody(request, MAX_BODY), { headers: { 'content-type': contentType } }).formData();
    files = form.getAll('file');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_body', 'The upload could not be read.');
  }
  if (files.length !== 1 || typeof files[0] === 'string') {
    throw new HttpError(400, 'invalid_body', 'Send exactly one file in the "file" field.');
  }
  const file = files[0];
  if (file.size === 0) throw new HttpError(400, 'empty_file', 'The file is empty.');
  if (file.size > MAX_FILE) throw new HttpError(413, 'too_large', 'Files can be at most 10 MB.');

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type) throw new HttpError(415, 'unsupported_type', 'Only JPG, PNG or PDF files are accepted.');

  const admin = adminClient();
  const fileName = cleanFileName(file.name);
  const path = `${conversation.id}/${randomUUID()}.${type.ext}`;
  const bucket = admin.storage.from('chat-attachments');

  const upload = await bucket.upload(path, bytes, { contentType: type.mime, upsert: false });
  if (upload.error) throw upload.error;

  // Two inserts through PostgREST are not one transaction: undo what was written if a
  // later step fails, so there is no orphaned file or a message without its file.
  let message;
  try {
    const inserted = await admin.from('chat_messages')
      .insert({ conversation_id: conversation.id, sender_id: user.id, body: fileName, message_type: type.messageType })
      .select('id, conversation_id, sender_id, body, message_type, status, created_at').single();
    if (inserted.error) throw inserted.error;
    message = inserted.data;

    const attached = await admin.from('message_attachments')
      .insert({ message_id: message.id, file_name: fileName, storage_path: path, mime_type: type.mime, file_size: bytes.length })
      .select('id, message_id, file_name, storage_path, mime_type, file_size, created_at').single();
    if (attached.error) throw attached.error;
    return { message, attachment: attached.data };
  } catch (error) {
    if (message) await admin.from('chat_messages').delete().eq('id', message.id);
    await bucket.remove([path]);
    throw error;
  }
});
