import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

const SUPPORT = ['support', 'admin', 'super_admin'];

const REFUSALS = {
  NOT_FOUND: [404, 'not_found', 'Customer not found.'],
  FORBIDDEN: [403, 'forbidden', 'You cannot change account status.'],
  INVALID_STATUS: [400, 'invalid_body', 'status must be active or blocked.'],
  REASON_REQUIRED: [400, 'reason_required', 'Give a reason (up to 500 characters).'],
  CANNOT_CHANGE_SELF: [409, 'own_account', 'You cannot change your own account status.'],
  STAFF_ACCOUNT: [409, 'staff_account', 'Staff accounts are managed by their role, not blocked.'],
  STATUS_UNCHANGED: [409, 'unchanged', 'The account already has that status.'],
};

// POST /api/admin/customers/:id/status   { status: 'active'|'blocked', reason }
// set_customer_status() (0037) checks the rules and the 0008 trigger audits the change
// with this caller and reason.
export const POST = route(async (request, { params }) => {
  const user = await requireUser(request, { roles: SUPPORT });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Customer not found.');

  const { status, reason } = await readJson(request);
  if (typeof reason !== 'string') throw new HttpError(...REFUSALS.REASON_REQUIRED);

  const { data, error } = await adminClient().rpc('set_customer_status', {
    p_customer: id, p_actor: user.id, p_status: status ?? null, p_reason: reason,
  });
  const refusal = error?.code === 'P0001' && REFUSALS[error.message];
  if (refusal) throw new HttpError(...refusal);
  if (error) throw error;
  return { customer: { id: data.id, status: data.status } };
});
