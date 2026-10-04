import type { FilmLocation } from '../types';
import { useAppStore } from '../store/useAppStore';
import { track } from '../lib/analytics';

export async function shareLocation(loc: FilmLocation): Promise<void> {
  const url = `${window.location.origin}/location/${loc.slug}`;
  const data = {
    title: `${loc.movie} — Movie Globe`,
    text: `Visit ${loc.place} from ${loc.movie} on Movie Globe`,
    url,
  };
  track('share', { slug: loc.slug });
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
  } catch {
    /* user cancelled or unsupported – fall back to copy */
  }
  try {
    await navigator.clipboard.writeText(url);
    useAppStore.getState().toast({ title: 'Link copied', body: url });
  } catch {
    useAppStore.getState().toast({ title: 'Share this link', body: url });
  }
}
