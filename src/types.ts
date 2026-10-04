export interface Photo {
  src: string;
  credit: string;
  license: string;
  sourceUrl?: string;
}

export interface FilmLocation {
  slug: string;
  movie: string;
  years: string;
  place: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  funFact: string;
  genres: string[];
  decade: string;
  pinColor: string;
  photos: Photo[];
  tripCityQuery: string;
  nearestAirport: string;
}

export interface Tour {
  id: string;
  name: string;
  tagline: string;
  stops: string[];
}

export interface LatLng {
  lat: number;
  lng: number;
}
