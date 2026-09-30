import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// Refusals raised by answer_question() (0034), as the caller sees them.
const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Question not found.'],
  // Not the assigned practitioner: the same answer as a missing question, so a
  // caller cannot probe which question ids exist.
  FORBIDDEN: [404, 'not_found', 'Question not found.'],
  QUESTION_CLOSED: [409, 'closed', 'This question is not open for an answer.'],
  INVALID_INPUT: [400, 'invalid_body', 'answer must be text of 1 to 5000 characters.'],
};

// POST /api/questions/:id/answer   { answer, final }
// The assigned practitioner saves a draft (final: false) or the final answer
// (final: true), which notifies the customer and cannot be changed afterwards.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Question not found.');

  // 32 KB: 5000 characters of Devanagari are ~15 KB of UTF-8.
  const { answer, final } = await readJson(request, 32768);
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 5000) {
    throw new HttpError(400, 'invalid_body', 'answer must be text of 1 to 5000 characters.');
  }
  if (typeof final !== 'boolean') throw new HttpError(400, 'invalid_body', 'final must be true or false.');

  const { data, error } = await adminClient().rpc('answer_question', {
    p_question: id, p_user: user.id, p_answer: answer, p_final: final,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { question: { id: data.id, status: data.status, answer: data.answer, answeredAt: data.answered_at } };
});
