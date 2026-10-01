import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { readSubject } from '@/lib/server/subject';
import { adminClient } from '@/lib/server/supabase';

// Refusals raised by create_question() (0034), as the caller sees them.
const REFUSALS = {
  CUSTOMER_NOT_ACTIVE: [403, 'account_inactive', 'This account is not active. Please contact support.'],
  SELF_BOOKING: [400, 'self', 'You cannot ask yourself a question.'],
  SERVICE_NOT_BOOKABLE: [404, 'not_found', 'This practitioner is not taking questions.'],
  TOO_MANY_UNPAID: [409, 'too_many_unpaid', 'You already have two questions awaiting payment.'],
};

// POST /api/questions  { astrologerId, question, subject }
// subject = { name, dobAd, tob, pob, country, phone?, email?, dobBs? } -- the birth
// details the practitioner answers from; required.
// Asks the chosen practitioner one question for the signed-in customer. Price,
// currency, commission and status are decided by the database. The question starts
// UNPAID with an awaiting_payment payment; the practitioner sees it once staff have
// verified the proof.
export const POST = route(async (request) => {
  const user = await requireUser(request);
  // 16 KB: 2000 characters of Devanagari alone are ~6 KB of UTF-8.
  const { astrologerId, question, subject } = await readJson(request, 16384);
  if (!isUuid(astrologerId)) throw new HttpError(400, 'invalid_body', 'astrologerId must be a uuid.');
  if (typeof question !== 'string' || !question.trim() || question.trim().length > 2000) {
    throw new HttpError(400, 'invalid_body', 'question must be text of 1 to 2000 characters.');
  }
  if (subject == null) throw new HttpError(400, 'invalid_body', 'subject is required.');
  const person = readSubject(subject);
  if (!user.customerId) throw new HttpError(403, 'no_customer', 'Only customers can ask a question.');

  const { data: row, error } = await adminClient().rpc('create_question', {
    p_customer: user.customerId,
    p_astrologer: astrologerId,
    p_question: question,
    p_subject: person,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;

  // The commission snapshot is the platform's business, not the customer's.
  return {
    question: {
      id: row.id, number: row.question_id, status: row.status, paymentStatus: row.payment_status,
      astrologerId: row.astrologer_id, question: row.question_text, subject: row.birth_snapshot,
      price: row.price_snapshot, currency: row.currency, paymentId: row.payment_id,
    },
  };
});
