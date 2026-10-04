import { appUrl, sendEmail, welcomeEmail } from '../_email';
import {
  EMAIL_RE,
  clientIp,
  createSession,
  error,
  hashPassword,
  json,
  publicUser,
  rateLimited,
  readJson,
  sameOrigin,
  type Ctx,
} from '../_lib';

interface Body {
  email?: string;
  password?: string;
  displayName?: string;
}

export const onRequestPost = async ({ request, env, waitUntil }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const body = await readJson<Body>(request);
  const email = body?.email?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  const displayName = (body?.displayName?.trim() || email.split('@')[0]).slice(0, 40);
  if (!EMAIL_RE.test(email)) return error(400, 'Please enter a valid email address.');
  if (password.length < 8 || password.length > 200)
    return error(400, 'Password must be at least 8 characters.');
  if (await rateLimited(env, `register:${clientIp(request)}`, 10))
    return error(429, 'Too many attempts. Try again later.');

  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first();
  if (exists) return error(409, 'An account with this email already exists.');

  const user = { id: crypto.randomUUID(), email, display_name: displayName };
  await env.DB.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(user.id, email, displayName, await hashPassword(password), Date.now())
    .run();
  const cookie = await createSession(env, request, user.id);
  // Welcome email (Resend) is sent in the background; sign-up never waits on it.
  waitUntil(sendEmail(env, { to: email, ...welcomeEmail(displayName, appUrl(env, request)) }));
  return json({ user: publicUser(user) }, 201, { 'set-cookie': cookie });
};
