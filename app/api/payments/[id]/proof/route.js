import { randomUUID } from 'node:crypto';
import { requireUser } from '@/lib/server/auth';
import { sniffType } from '@/lib/server/chat';
import { HttpError, isUuid, readBody, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const MAX_FILE = 10 * 1024 * 1024; // matches the payment-proofs bucket (0019)
const MAX_BODY = MAX_FILE + 64 * 1024; // room for the multipart envelope

// Refusals raised by submit_payment_proof() (0018), as the caller sees them.
const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Payment not found.'],
  PAYMENT_ALREADY_PROCESSED: [409, 'already_processed', 'Proof has already been submitted for this payment.'],
  RESERVATION_EXPIRED: [409, 'reservation_expired', 'The time to pay has passed. Please make a new booking.'],
};

// POST /api/payments/:id/proof   multipart/form-data, one `file` field, optional `reference`
// Stores the screenshot at payment-proofs/{user}/{payment}/{random}.{ext} and moves
// the caller's own awaiting_payment payment to proof_submitted, which freezes the
// slot's hold until staff review it. JPEG, PNG or PDF by content, 10 MB at most.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request);
  if (!user.customerId) throw new HttpError(403, 'no_customer', 'Only customers can submit payment proof.');

  // Anything that is not the caller's own payment is 404, so a caller cannot
  // probe which payment ids exist.
  const notFound = new HttpError(404, 'not_found', 'Payment not found.');
  const { id } = await params;
  if (!isUuid(id)) throw notFound;

  const admin = adminClient();
  const { data: pay, error: lookupError } = await admin.from('payments')
    .select('id, customer_id, status').eq('id', id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!pay || pay.customer_id !== user.customerId) throw notFound;

  const contentType = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data\b/i.test(contentType)) {
    throw new HttpError(415, 'unsupported_type', 'Send the file as multipart/form-data.');
  }
  let files;
  let reference = null;
  try {
    const form = await new Response(await readBody(request, MAX_BODY), { headers: { 'content-type': contentType } }).formData();
    files = form.getAll('file');
    const raw = form.get('reference');
    if (raw != null) {
      if (typeof raw !== 'string' || raw.length > 120) {
        throw new HttpError(400, 'invalid_body', 'reference must be text of at most 120 characters.');
      }
      reference = raw;
    }
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

  const path = `${user.id}/${pay.id}/${randomUUID()}.${type.ext}`;
  const bucket = admin.storage.from('payment-proofs');

  const upload = await bucket.upload(path, bytes, { contentType: type.mime, upsert: false });
  if (upload.error) throw upload.error;

  // The state change and the hold freeze happen in one database transaction; if
  // it fails (a lapsed hold, a second proof) the orphaned file is removed.
  try {
    const { data, error } = await admin.rpc('submit_payment_proof', {
      p_payment: pay.id, p_proof_path: path, p_reference: reference,
    });
    const refusal = error?.code === 'P0001' && REFUSALS[error.message];
    if (refusal) throw new HttpError(...refusal);
    if (error) throw error;
    return { payment: { id: data.id, status: data.status } };
  } catch (error) {
    await bucket.remove([path]);
    throw error;
  }
});
