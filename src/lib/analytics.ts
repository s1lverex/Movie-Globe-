/**
 * Privacy-friendly, dependency-free analytics: counts events locally only.
 * Nothing leaves the device. Swap `track` for a free self-hosted tool later.
 */
const KEY = 'mg-analytics';

export function track(event: string, props?: Record<string, string | number>): void {
  try {
    const counts = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
    counts[event] = (counts[event] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(counts));
  } catch {
    /* storage unavailable */
  }
  if (import.meta.env.DEV) console.debug('[analytics]', event, props ?? '');
}
