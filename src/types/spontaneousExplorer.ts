export interface AdventurePOI {
  id: string;
  name: string;
  type: string; // Ad esempio: 'cafe', 'park', 'viewpoint', 'shop', 'art'
  lat: number;
  lon: number;
  tags?: Record<string, string>; // Tags OSM originali, se utili
  description?: string; // Breve descrizione o motivo per cui è stato scelto
}

export interface SpontaneousAdventure {
  id: string; // ID univoco per l'avventura generata
  title: string; // Titolo accattivante, es. "Fuga Urbana: Caffè & Cultura"
  description?: string; // Descrizione generale dell'avventura
  pois: AdventurePOI[];
  estimatedDuration?: string; // Es. "Circa 1-2 ore"
  totalDistance?: number; // Distanza approssimativa in metri o km
  difficulty?: 'easy' | 'moderate'; // Livello di impegno
  themeTags?: string[]; // Tag tematici come 'relax', 'cultura', 'scoperta'
  icon?: string; // Nome di un'icona FontAwesome per rappresentare l'avventura
}

export interface SpontaneousExplorerServiceError {
  message: string;
  type: 'NO_POIS_FOUND' | 'API_ERROR' | 'LOCATION_ERROR' | 'UNKNOWN';
}
