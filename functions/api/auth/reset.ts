import {
  createSession,
  error,
  hashPassword,
  json,
  publicUser,
  readJson,
  sameOrigin,
  sha256,
  type Ctx,
  type User,
} from '../_lib';

/** Completes a password reset: one-time token → new password → signed in, other sessions revoked. */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const body = await readJson<{ token?: string; password?: string }>(request);
  const token = body?.token ?? '';
  const password = body?.password ?? '';
  if (!token) return error(400, 'Missing reset token.');
  if (password.length < 8 || password.length > 200)
    return error(400, 'Password must be at least 8 characters.');

  const hash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name FROM password_resets r JOIN users u ON u.id = r.user_id
     WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?`,
  )
    .bind(hash, Date.now())
    .first<User>();
  if (!row) return error(400, 'This reset link is invalid or has expired. Request a new one.');

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(
      await hashPassword(password),
      row.id,
    ),
    env.DB.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').bind(
      Date.now(),
      row.id,
    ),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.id),
  ]);
  const cookie = await createSession(env, request, row.id);
  return json({ user: publicUser(row) }, 200, { 'set-cookie': cookie });
};
