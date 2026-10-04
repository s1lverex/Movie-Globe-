import { currentUser, json, publicUser, type Ctx } from '../_lib';

export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const user = await currentUser(env, request);
  return json({ user: user ? publicUser(user) : null });
};
