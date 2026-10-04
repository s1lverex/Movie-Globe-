/// <reference types="@cloudflare/workers-types" />
/**
 * Shared helpers for the account API (Cloudflare Pages Functions + D1).
 * Passwords: PBKDF2-SHA256 (100k iterations, 16-byte salt) via Web Crypto.
 * Sessions: random 256-bit token in an HttpOnly cookie; only its SHA-256 hash
 * is stored in the database.
 */
import type { EmailEnv } from './_email';

export interface Env extends EmailEnv {
  DB: D1Database;
}

export type Ctx = EventContext<Env, string, Record<string, unknown>>;

export const SESSION_COOKIE = 'tg_session';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // max supported by Workers
export const MAX_DATA_BYTES = 256 * 1024;

const enc = new TextEncoder();

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export const error = (status: number, message: string) => json({ error: message }, status);

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

export function randomToken(bytes = 32): string {
  return b64(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(s: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(password, unb64(salt), Number(iter));
  const expected = unb64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function cookieAttrs(req: Request): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export async function createSession(env: Env, req: Request, userId: string): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  // Housekeeping: drop expired sessions and spent reset tokens.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM password_resets WHERE expires_at < ?').bind(now),
  ]);
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(await sha256(token), userId, now, now + SESSION_DAYS * 86400_000)
    .run();
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_DAYS * 86400}; ${cookieAttrs(req)}`;
}

export function clearSessionCookie(req: Request): string {
  return `${SESSION_COOKIE}=; Max-Age=0; ${cookieAttrs(req)}`;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export async function currentUser(env: Env, req: Request): Promise<User | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), Date.now())
    .first<User>();
  return row ?? null;
}

export const publicUser = (u: User) => ({ id: u.id, email: u.email, displayName: u.display_name });

/** Rejects cross-site state-changing requests (cookie auth + CSRF defence). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from older browsers / non-browser clients
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export async function readJson<T>(req: Request): Promise<T | null> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return null;
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** At most `limit` attempts per `key` per 15 minutes. */
export async function rateLimited(env: Env, key: string, limit = 10): Promise<boolean> {
  const since = Date.now() - 15 * 60_000;
  await env.DB.prepare('DELETE FROM auth_attempts WHERE created_at < ?').bind(since).run();
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND created_at >= ?',
  )
    .bind(key, since)
    .first<{ n: number }>();
  if ((row?.n ?? 0) >= limit) return true;
  await env.DB.prepare('INSERT INTO auth_attempts (key, created_at) VALUES (?, ?)')
    .bind(key, Date.now())
    .run();
  return false;
}

export const clientIp = (req: Request) => req.headers.get('cf-connecting-ip') ?? 'local';

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
