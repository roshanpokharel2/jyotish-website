import { requireUser } from '@/lib/server/auth';
import { HttpError, isUuid, readJson, route } from '@/lib/server/http';
import { adminClient } from '@/lib/server/supabase';

// POST /api/admin/users/:id/password   { password, confirmPassword }
export const POST = route(async (request, { params }) => {
  const actor = await requireUser(request, { roles: ['super_admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'User not found.');

  const { password, confirmPassword } = await readJson(request);
  if (typeof password !== 'string' || typeof confirmPassword !== 'string' || !password || !confirmPassword) {
    throw new HttpError(400, 'required', 'New password and confirmation are required.');
  }
  if (password !== confirmPassword) throw new HttpError(400, 'password_mismatch', 'Passwords do not match.');
  if (password.length < 8) throw new HttpError(400, 'weak_password', 'Password must contain at least 8 characters.');

  const admin = adminClient();
  const { data: target, error: targetError } = await admin.from('users').select('id,role').eq('id', id).maybeSingle();
  if (targetError) throw targetError;
  if (!target) throw new HttpError(404, 'not_found', 'User not found.');

  const { error: updateError } = await admin.auth.admin.updateUserById(id, { password });
  if (updateError) {
    if (updateError.status >= 400 && updateError.status < 500) {
      throw new HttpError(400, 'password_update_rejected', updateError.message);
    }
    throw updateError;
  }

  const { error: auditError } = await admin.from('audit_log').insert({
    actor_user_id: actor.id,
    actor_role: actor.role,
    action: 'user.password_changed',
    entity_type: 'user',
    entity_id: id,
    new_state: { password_changed: true },
    metadata: { target_role: target.role },
  });
  if (auditError) console.error('[api] password update audit insert failed', auditError);

  return { userId: id, passwordUpdated: true, auditLogged: !auditError };
});