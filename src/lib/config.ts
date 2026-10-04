/**
 * Typed access to environment configuration (see `.env`). Every value is
 * optional: with nothing set the app runs entirely on free services.
 */
const raw = import.meta.env as Record<string, string | undefined>;
const str = (k: string) => (raw[k] ?? '').trim();

export type GeocoderProvider = 'nominatim' | 'locationiq' | 'custom';

const GEOCODER_DEFAULT_URL: Record<GeocoderProvider, string> = {
  nominatim: 'https://nominatim.openstreetmap.org',
  locationiq: 'https://us1.locationiq.com/v1',
  custom: 'https://nominatim.openstreetmap.org',
};

function geocoderProvider(): GeocoderProvider {
  const p = str('VITE_GEOCODER_PROVIDER').toLowerCase();
  return p === 'locationiq' || p === 'custom' ? p : 'nominatim';
}

const provider = geocoderProvider();

export const env = {
  geocoder: {
    provider,
    url: (str('VITE_GEOCODER_URL') || GEOCODER_DEFAULT_URL[provider]).replace(/\/+$/, ''),
    key: str('VITE_GEOCODER_KEY'),
    /** The free public Nominatim server asks for ≤ 1 request per second. */
    throttleMs: provider === 'nominatim' && !str('VITE_GEOCODER_URL') ? 1000 : 0,
  },
  tripAffiliateParams: str('VITE_TRIP_AFFILIATE_PARAMS'),
  // Reserved for future integrations (not used yet).
  mapboxToken: str('VITE_MAPBOX_TOKEN'),
  googleMapsKey: str('VITE_GOOGLE_MAPS_API_KEY'),
  opencageKey: str('VITE_OPENCAGE_API_KEY'),
} as const;
