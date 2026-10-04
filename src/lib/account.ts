import { create } from 'zustand';
import { useAppStore } from '../store/useAppStore';
import { track } from './analytics';
import { mergeSync, type SyncData } from './sync';

/**
 * Accounts are served by Cloudflare Pages Functions + D1 (free tier) under
 * /api. On static-only hosting (or `vite dev` without the API) the account
 * features report "unavailable" and the app keeps working locally.
 */
export interface AccountUser {
  id: string;
  email: string;
  displayName: string;
}

type Status = 'unknown' | 'unavailable' | 'signedOut' | 'signedIn';

interface AccountState {
  status: Status;
  user: AccountUser | null;
  syncState: 'idle' | 'syncing' | 'saved' | 'error';
  lastSynced: number | null;
}

export const useAccount = create<AccountState>(() => ({
  status: 'unknown',
  user: null,
  syncState: 'idle',
  lastSynced: null,
}));

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Network error — check your connection.', 0);
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  if (!isJson) throw new ApiError('Accounts are not available on this server.', 404);
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  return body;
}

function snapshot(): SyncData {
  const s = useAppStore.getState();
  return {
    version: 1,
    character: s.character,
    visited: s.visited,
    saved: s.saved,
    places: s.places,
    appMode: s.appMode,
  };
}

/**
 * Auto-save only runs after this device has pulled and merged the account's
 * data; otherwise a slow first pull could let a fresh device upload its empty
 * state over the account. `applying` skips the redundant save that applying
 * the merged data would otherwise schedule.
 */
let synced = false;
let applying = false;

function apply(d: SyncData) {
  applying = true;
  try {
    useAppStore.setState({
      character: d.character,
      visited: d.visited,
      saved: d.saved,
      places: d.places,
      appMode: d.appMode,
    });
  } finally {
    applying = false;
  }
}

async function push(): Promise<void> {
  useAccount.setState({ syncState: 'syncing' });
  try {
    const r = await api<{ updatedAt: number }>('/sync', {
      method: 'PUT',
      body: JSON.stringify({ data: snapshot() }),
    });
    useAccount.setState({ syncState: 'saved', lastSynced: r.updatedAt });
  } catch (e) {
    useAccount.setState({ syncState: 'error' });
    if (e instanceof ApiError && e.status === 401) useAccount.setState({ status: 'signedOut', user: null });
  }
}

/** Pull the account's data, merge with this device, then save the result back. */
async function pullAndMerge(): Promise<void> {
  synced = false;
  useAccount.setState({ syncState: 'syncing' });
  const r = await api<{ data: Partial<SyncData> | null }>('/sync');
  apply(mergeSync(snapshot(), r.data));
  synced = true;
  await push();
}

async function signedIn(user: AccountUser) {
  useAccount.setState({ status: 'signedIn', user });
  try {
    await pullAndMerge();
  } catch {
    useAccount.setState({ syncState: 'error' });
  }
}

export async function initAccount(): Promise<void> {
  try {
    const r = await api<{ user: AccountUser | null }>('/auth/me');
    if (r.user) await signedIn(r.user);
    else useAccount.setState({ status: 'signedOut' });
  } catch {
    useAccount.setState({ status: 'unavailable' });
  }
}

export async function register(email: string, password: string, displayName: string): Promise<void> {
  const r = await api<{ user: AccountUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  track('account_register');
  await signedIn(r.user);
}

export async function login(email: string, password: string): Promise<void> {
  const r = await api<{ user: AccountUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  track('account_login');
  await signedIn(r.user);
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    synced = false;
    clearTimeout(timer);
    useAccount.setState({ status: 'signedOut', user: null, syncState: 'idle', lastSynced: null });
  }
}

export async function deleteAccount(password: string): Promise<void> {
  await api('/account', { method: 'DELETE', body: JSON.stringify({ password }) });
  synced = false;
  clearTimeout(timer);
  useAccount.setState({ status: 'signedOut', user: null, syncState: 'idle', lastSynced: null });
}

/** Auto-save: push synced fields to the account shortly after they change. */
let timer: ReturnType<typeof setTimeout> | undefined;
useAppStore.subscribe((s, prev) => {
  if (useAccount.getState().status !== 'signedIn' || !synced || applying) return;
  if (
    s.character === prev.character &&
    s.visited === prev.visited &&
    s.saved === prev.saved &&
    s.places === prev.places &&
    s.appMode === prev.appMode
  )
    return;
  clearTimeout(timer);
  timer = setTimeout(() => void push(), 1500);
});

/** Emails a reset link if the account exists (the response never says either way). */
export async function requestPasswordReset(email: string): Promise<void> {
  await api('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) });
}

/** Sets a new password from an emailed reset link and signs in. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const r = await api<{ user: AccountUser }>('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  track('account_reset');
  await signedIn(r.user);
}
