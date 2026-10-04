import { appUrl, resetEmail, sendEmail } from '../_email';
import {
  EMAIL_RE,
  clientIp,
  error,
  json,
  randomToken,
  rateLimited,
  readJson,
  sameOrigin,
  sha256,
  type Ctx,
} from '../_lib';

const RESET_MINUTES = 30;

/**
 * Starts a password reset. Always answers the same way so it can't be used to
 * discover which emails have accounts.
 */
export const onRequestPost = async ({ request, env, waitUntil }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const body = await readJson<{ email?: string }>(request);
  const email = body?.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_RE.test(email)) return error(400, 'Please enter a valid email address.');
  if (
    (await rateLimited(env, `forgot:${clientIp(request)}`, 10)) ||
    (await rateLimited(env, `forgot-email:${email}`, 3))
  )
    return error(429, 'Too many reset requests. Try again later.');

  const user = await env.DB.prepare('SELECT id, display_name FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; display_name: string }>();
  if (user) {
    const token = randomToken();
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    )
      .bind(await sha256(token), user.id, now, now + RESET_MINUTES * 60_000)
      .run();
    const link = `${appUrl(env, request)}/reset-password?token=${encodeURIComponent(token)}`;
    waitUntil(sendEmail(env, { to: email, ...resetEmail(user.display_name, link) }));
  }
  return json({ ok: true });
};
