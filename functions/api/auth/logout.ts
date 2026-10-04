import {
  SESSION_COOKIE,
  clearSessionCookie,
  getCookie,
  json,
  sameOrigin,
  sha256,
  error,
  type Ctx,
} from '../_lib';

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const token = getCookie(request, SESSION_COOKIE);
  if (token)
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(await sha256(token))
      .run();
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
};
