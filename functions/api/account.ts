import {
  clearSessionCookie,
  currentUser,
  error,
  json,
  readJson,
  sameOrigin,
  verifyPassword,
  type Ctx,
} from './_lib';

/** Permanently deletes the signed-in account (requires the password). */
export const onRequestDelete = async ({ request, env }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const user = await currentUser(env, request);
  if (!user) return error(401, 'Not signed in.');
  const body = await readJson<{ password?: string }>(request);
  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(body?.password ?? '', row.password_hash)))
    return error(401, 'Wrong password.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM user_data WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
};
