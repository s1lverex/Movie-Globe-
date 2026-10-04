import type { CharacterConfig } from '../store/character';
import type { AppMode, DiaryPlace } from '../store/useAppStore';

/** The slice of app state that follows a signed-in user across devices. */
export interface SyncData {
  version: 1;
  character: CharacterConfig;
  visited: Record<string, number>;
  saved: string[];
  places: DiaryPlace[];
  appMode: AppMode;
}

/**
 * Merges this device's data with the account's data on sign-in.
 * Collections are unioned so nothing made offline is lost; where both sides
 * have the same item the account's copy wins, as does the account's character.
 */
export function mergeSync(local: SyncData, remote: Partial<SyncData> | null): SyncData {
  if (!remote) return local;
  const visited: Record<string, number> = { ...local.visited };
  for (const [k, t] of Object.entries(remote.visited ?? {})) visited[k] = Math.min(t, visited[k] ?? Infinity);
  const places = new Map(local.places.map((p) => [p.id, p]));
  for (const p of remote.places ?? []) places.set(p.id, p);
  return {
    version: 1,
    character: remote.character ?? local.character,
    visited,
    saved: [...new Set([...(remote.saved ?? []), ...local.saved])],
    places: [...places.values()].sort((a, b) => a.createdAt - b.createdAt),
    appMode: remote.appMode ?? local.appMode,
  };
}
