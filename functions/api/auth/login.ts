import {
  clientIp,
  createSession,
  error,
  json,
  publicUser,
  rateLimited,
  readJson,
  sameOrigin,
  verifyPassword,
  type Ctx,
  type User,
} from '../_lib';

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = body?.email?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  if (!email || !password) return error(400, 'Email and password are required.');
  if (
    (await rateLimited(env, `login:${clientIp(request)}`, 20)) ||
    (await rateLimited(env, `login-email:${email}`, 10))
  )
    return error(429, 'Too many sign-in attempts. Try again in 15 minutes.');

  const row = await env.DB.prepare('SELECT id, email, display_name, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<User & { password_hash: string }>();
  if (!row || !(await verifyPassword(password, row.password_hash)))
    return error(401, 'Wrong email or password.');
  const cookie = await createSession(env, request, row.id);
  return json({ user: publicUser(row) }, 200, { 'set-cookie': cookie });
};
