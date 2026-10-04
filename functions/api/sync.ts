import { MAX_DATA_BYTES, currentUser, error, json, readJson, sameOrigin, type Ctx } from './_lib';

/** The signed-in user's saved app data (character, trips, diary, stamps…). */
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const user = await currentUser(env, request);
  if (!user) return error(401, 'Not signed in.');
  const row = await env.DB.prepare('SELECT data, updated_at FROM user_data WHERE user_id = ?')
    .bind(user.id)
    .first<{ data: string; updated_at: number }>();
  return json({ data: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at ?? null });
};

export const onRequestPut = async ({ request, env }: Ctx): Promise<Response> => {
  if (!sameOrigin(request)) return error(403, 'Cross-origin request blocked');
  const user = await currentUser(env, request);
  if (!user) return error(401, 'Not signed in.');
  const body = await readJson<{ data?: unknown }>(request);
  const data = body?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return error(400, 'Invalid data.');
  const text = JSON.stringify(data);
  if (text.length > MAX_DATA_BYTES) return error(413, 'Data too large.');
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO user_data (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  )
    .bind(user.id, text, now)
    .run();
  return json({ ok: true, updatedAt: now });
};
