import { requireUser } from '@/lib/server/auth';
import { route } from '@/lib/server/http';

// The signed-in account as the server sees it: role and account state come from the
// database, so the browser can ask instead of guessing.
export const GET = route(async (request) => {
  const { id, email, role, customerId } = await requireUser(request);
  return { id, email, role, customerId };
});
