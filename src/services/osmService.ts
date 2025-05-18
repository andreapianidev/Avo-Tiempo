import { logError, ErrorType, createError, ErrorSeverity } from './errorService';
import cacheService, { CacheNamespace } from './cacheService';

// Overpass API endpoints - lista di fallback
const OVERPASS_API_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',   // Alternativa 1
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter', // Alternativa 2
  'https://overpass-api.de/api/interpreter',          // Endpoint originale
  'https://overpass.openstreetmap.fr/api/interpreter'  // Alternativa 3
];

// Cache keys
const CACHE_POI_PREFIX = 'poi_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore

// Types for OpenStreetMap POIs
export interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags: {
    [key: string]: string | undefined;
    name?: string;
    'name:es'?: string;
    'name:en'?: string;
    amenity?: string;
    tourism?: string;
    leisure?: string;
    natural?: string;
  };
}

export interface OSMWay {
  id: number;
  center: {
    lat: number;
    lon: number;
  };
  tags: {
    [key: string]: string | undefined;
    name?: string;
    'name:es'?: string;
    'name:en'?: string;
    amenity?: string;
    tourism?: string;
    leisure?: string;
    natural?: string;
  };
}

export interface OSMResponse {
  elements: (OSMNode | OSMWay)[];
}

export interface POI {
  id: string;
  name: string;
  type: string;
  category: 'tourism' | 'natural' | 'leisure' | 'amenity' | 'shop' | 'historic' | 
           'route' | 'public_transport' | 'aeroway' | 'healthcare' | 'emergency' | 
           'sport' | 'other';
  lat: number;
  lon: number;
  distance: number; // Distance in meters from the user's location
  tags: Record<string, string | undefined>;
  icon: string; // FontAwesome icon class
  isInteresting: boolean; // Whether this POI is considered interesting
}

// POI categories and their corresponding icons
const POI_ICONS: Record<string, string> = {
  // Tourism
  viewpoint: 'fa-mountain',
  attraction: 'fa-monument',
  museum: 'fa-museum',
  artwork: 'fa-palette',
  gallery: 'fa-image',
  information: 'fa-info-circle',
  hotel: 'fa-hotel',
  apartment: 'fa-building',
  guest_house: 'fa-house',
  hostel: 'fa-bed',
  
  // Natural
  beach: 'fa-umbrella-beach',
  peak: 'fa-mountain',
  volcano: 'fa-fire',
  spring: 'fa-water',
  cave_entrance: 'fa-dungeon',
  
  // Leisure
  beach_resort: 'fa-umbrella-beach',
  park: 'fa-tree',
  garden: 'fa-leaf',
  swimming_pool: 'fa-swimming-pool',
  
  // Amenity
  cafe: 'fa-coffee',
  restaurant: 'fa-utensils',
  bar: 'fa-glass-martini-alt',
  pub: 'fa-beer',
  ice_cream: 'fa-ice-cream',
  marketplace: 'fa-store',
  fuel: 'fa-gas-pump',
  parking: 'fa-parking',
  hospital: 'fa-hospital',
  pharmacy: 'fa-prescription-bottle-alt',
  police: 'fa-shield-alt',
  fire_station: 'fa-fire-extinguisher',
  
  // Transport
  bus_station: 'fa-bus',
  taxi: 'fa-taxi',
  ferry_terminal: 'fa-ship',
  
  // Shop
  supermarket: 'fa-shopping-cart',
  bakery: 'fa-bread-slice',
  convenience: 'fa-store-alt',
  
  // Routes
  scenic: 'fa-route',
  hiking: 'fa-hiking',
  
  // Default
  default: 'fa-map-marker-alt'
};

/**
 * Calculates the distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Gets the appropriate icon for a POI based on its tags
 */
const getPoiIcon = (tags: Record<string, string | undefined>): string => {
  // Check for specific types in order of priority
  if (tags.tourism && typeof tags.tourism === 'string' && POI_ICONS[tags.tourism]) {
    return POI_ICONS[tags.tourism];
  }
  
  if (tags.natural && typeof tags.natural === 'string' && POI_ICONS[tags.natural]) {
    return POI_ICONS[tags.natural];
  }
  
  if (tags.leisure && typeof tags.leisure === 'string' && POI_ICONS[tags.leisure]) {
    return POI_ICONS[tags.leisure];
  }
  
  if (tags.amenity && typeof tags.amenity === 'string' && POI_ICONS[tags.amenity]) {
    return POI_ICONS[tags.amenity];
  }
  
  return POI_ICONS.default;
};

/**
 * Determines the category of a POI based on its tags
 */
const getPoiCategory = (tags: Record<string, string | undefined>): POI['category'] => {
  if (tags.tourism) return 'tourism';
  if (tags.natural) return 'natural';
  if (tags.leisure) return 'leisure';
  if (tags.amenity) return 'amenity';
  if (tags.shop) return 'shop';
  if (tags.historic) return 'historic';
  if (tags.route) return 'route';
  if (tags.highway && tags.highway === 'bus_stop') return 'public_transport';
  if (tags.public_transport) return 'public_transport';
  if (tags.aeroway) return 'aeroway';
  if (tags.healthcare) return 'healthcare';
  if (tags.emergency) return 'emergency';
  if (tags.sport) return 'sport';
  return 'other';
};

/**
 * Gets the name of a POI, with fallbacks for different language versions
 */
const getPoiName = (tags: Record<string, string | undefined>): string => {
  return tags.name || tags['name:es'] || tags['name:en'] || 'Unnamed location';
};

/**
 * Determines if a POI is interesting based on its tags and name
 */
const isPoiInteresting = (tags: Record<string, string | undefined>, name: string): boolean => {
  // Filter out unnamed locations
  if (name === 'Unnamed location') return false;
  
  // Consider named peaks interesting only if they have a proper name (not just "Unnamed location")
  if (tags.natural === 'peak' && name === 'Unnamed location') return false;
  
  // Consider certain categories as inherently interesting
  const interestingTypes = [
    'viewpoint', 'attraction', 'museum', 'beach', 'volcano', 'waterfall',
    'cave_entrance', 'hot_spring', 'national_park', 'nature_reserve'
  ];
  
  // Check if the POI has any of the interesting types
  for (const key of ['tourism', 'natural', 'leisure']) {
    const value = tags[key];
    if (value && interestingTypes.includes(value)) return true;
  }
  
  // Consider named peaks with elevation interesting
  if (tags.natural === 'peak' && tags.ele && name !== 'Unnamed location') return true;
  
  // Consider historic sites interesting
  if (tags.historic) return true;
  
  return false;
};

/**
 * Gets the type of a POI based on its tags
 */
const getPoiType = (tags: Record<string, string | undefined>): string => {
  return (
    tags.tourism ||
    tags.natural ||
    tags.leisure ||
    tags.amenity ||
    'point of interest'
  );
};

/**
 * Normalizes OSM elements to a standard POI format
 */
const normalizeOsmElements = (elements: (OSMNode | OSMWay)[], userLat: number, userLon: number): POI[] => {
  return elements
    .map(element => {
      const isNode = 'lat' in element;
      const lat = isNode ? element.lat : element.center.lat;
      const lon = isNode ? element.lon : element.center.lon;
      const distance = calculateDistance(userLat, userLon, lat, lon);
      const name = getPoiName(element.tags);
      
      return {
        id: `osm-${element.id}`,
        name,
        type: getPoiType(element.tags),
        category: getPoiCategory(element.tags),
        lat,
        lon,
        distance,
        tags: element.tags,
        icon: getPoiIcon(element.tags),
        isInteresting: isPoiInteresting(element.tags, name)
      };
    })
    // Filter out unnamed locations and non-interesting POIs
    .filter(poi => poi.name !== 'Unnamed location' && (poi.isInteresting || poi.tags.ele));
};

/**
 * Builds an Overpass QL query for POIs around a location
 */
const buildOverpassQuery = (lat: number, lon: number, radius: number = 4000, filters: string[] = []): string => {
  // Default filters if none provided
  const queryFilters = filters.length > 0 ? filters : [
    // Categorie principali
    'node["tourism"="viewpoint"]',
    'way["leisure"="beach_resort"]',
    'node["natural"="peak"]',
    'node["amenity"="cafe"]',
    'node["amenity"="restaurant"]',
    'node["tourism"="attraction"]',
    
    // Natura
    'node["natural"="beach"]',
    'node["natural"="volcano"]',
    
    // Ristoranti e bar
    'node["amenity"="bar"]',
    'node["amenity"="pub"]',
    'node["amenity"="ice_cream"]',
    
    // Cultura e attrazioni
    'node["historic"]',
    'node["tourism"="museum"]',
    'node["tourism"="gallery"]',
    
    // Sport e tempo libero
    'node["leisure"="swimming_pool"]',
    'node["sport"="swimming"]',
    'node["sport"="diving"]',
    'node["sport"="sailing"]',
    
    // Trasporti
    'node["amenity"="bus_station"]',
    'node["amenity"="taxi"]',
    'node["amenity"="ferry_terminal"]',
    'node["amenity"="fuel"]',
    'node["amenity"="parking"]',
    
    // Sanità e emergenza
    'node["amenity"="hospital"]',
    'node["amenity"="pharmacy"]',
    'node["amenity"="police"]',
    'node["amenity"="fire_station"]',
    
    // Negozi
    'node["shop"="supermarket"]',
    'node["shop"="convenience"]',
    'node["shop"="bakery"]',
    
    // Alloggi
    'node["tourism"="hotel"]',
    'node["tourism"="apartment"]',
    'node["tourism"="guest_house"]',
    
    // Sentieri e percorsi
    'way["route"="hiking"]',
    'way["route"="foot"]',
    'way["highway"]["scenic"="yes"]'
  ];
  
  // Build the query with all filters
  return `
    [out:json];
    (
      ${queryFilters.map(filter => `${filter}(around:${radius},${lat},${lon});`).join('\n      ')}
    );
    out center;
  `;
};

/**
 * Tenta di recuperare i POI dalla cache locale
 */
const getCachedPOIs = (cacheKey: string): POI[] | null => {
  try {
    const cachedData = cacheService.getCacheItem<POI[]>(CacheNamespace.POI, cacheKey);
    if (!cachedData) return null;
    
    return cachedData;
  } catch (error) {
    console.warn('Error reading POI cache:', error);
    return null;
  }
};

/**
 * Salva i POI nella cache locale
 */
const cachePOIs = (cacheKey: string, pois: POI[]): void => {
  try {
    cacheService.setCacheItem(CacheNamespace.POI, cacheKey, pois, CACHE_DURATION);
  } catch (error) {
    console.warn('Error writing POI cache:', error);
  }
};

/**
 * Genera una chiave di cache basata sui parametri
 */
const generateCacheKey = (lat: number, lon: number, radius: number, filters: string[]): string => {
  // Arrotonda le coordinate per creare aree di cache più ampie (600m circa)
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  const filterKey = filters.join('|');
  return `${roundedLat}_${roundedLon}_${radius}_${filterKey}`;
};

/**
 * Fetches POIs from OpenStreetMap via Overpass API
 * Con meccanismo di retry e fallback a endpoint alternativi
 */
const getPOIs = async (
  lat: number, 
  lon: number, 
  radius: number = 4000, 
  filters: string[] = []
): Promise<POI[]> => {
  // Genera chiave cache
  const cacheKey = generateCacheKey(lat, lon, radius, filters);
  
  // Controlla se ci sono dati in cache
  const cachedPOIs = getCachedPOIs(cacheKey);
  if (cachedPOIs) {
    console.log('Using cached POIs');
    return cachedPOIs;
  }
  
  // Costruisci la query Overpass
  const query = buildOverpassQuery(lat, lon, radius, filters);
  
  // Tenta di recuperare i POI da ciascun endpoint con backoff esponenziale
  for (let attempt = 0; attempt < OVERPASS_API_ENDPOINTS.length; attempt++) {
    const endpoint = OVERPASS_API_ENDPOINTS[attempt];
    const timeoutMs = Math.min(5000 * Math.pow(1.5, attempt), 15000); // Backoff esponenziale fino a 15 secondi
    
    try {
      console.log(`Attempting to fetch POIs from ${endpoint} (attempt ${attempt + 1})`);
      
      // Aggiungi timeout alla fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }
      
      const data: OSMResponse = await response.json();
      
      // Normalizza gli elementi OSM nel nostro formato POI
      const pois = normalizeOsmElements(data.elements, lat, lon);
      
      // Ordina per distanza
      const sortedPois = pois.sort((a, b) => a.distance - b.distance);
      
      // Salva in cache
      cachePOIs(cacheKey, sortedPois);
      
      return sortedPois;
    } catch (error) {
      console.warn(`Error with endpoint ${endpoint}:`, error);
      
      // Se è l'ultimo tentativo, registra l'errore
      if (attempt === OVERPASS_API_ENDPOINTS.length - 1) {
        const errorObj = createError(
          ErrorType.API,
          `Failed to fetch POIs: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : new Error(String(error)),
          'Non è stato possibile recuperare i punti di interesse nelle vicinanze. Riprova più tardi.',
          ErrorSeverity.MEDIUM
        );
        logError(errorObj);
      }
    }
  }
  
  // Se tutti i tentativi falliscono, restituisci i POI di default per quella posizione
  return getDefaultPOIs(lat, lon);
};

/**
 * Restituisce POI predefiniti per una posizione quando tutte le API falliscono
 */
const getDefaultPOIs = (lat: number, lon: number): POI[] => {
  // Se si tratta delle Canarie, restituisci alcuni POI predefiniti per garantire 
  // un'esperienza utente decente anche in caso di errori API
  const isCanaryIslands = lat > 27.5 && lat < 29.5 && lon > -18.5 && lon < -13.0;
  
  if (isCanaryIslands) {
    // POI predefiniti per le Isole Canarie
    return [
      {
        id: 'default_1',
        name: 'Playa de Las Canteras',
        type: 'beach',
        category: 'natural',
        lat: 28.1427,
        lon: -15.4420,
        distance: calculateDistance(lat, lon, 28.1427, -15.4420),
        tags: { natural: 'beach' },
        icon: POI_ICONS.beach || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_2',
        name: 'Parque Santa Catalina',
        type: 'park',
        category: 'leisure',
        lat: 28.1436,
        lon: -15.4322,
        distance: calculateDistance(lat, lon, 28.1436, -15.4322),
        tags: { leisure: 'park' },
        icon: POI_ICONS.park || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_3',
        name: 'Mirador del Palmarejo',
        type: 'viewpoint',
        category: 'tourism',
        lat: 28.1095,
        lon: -15.4178,
        distance: calculateDistance(lat, lon, 28.1095, -15.4178),
        tags: { tourism: 'viewpoint' },
        icon: POI_ICONS.viewpoint || POI_ICONS.default,
        isInteresting: true
      }
    ];
  }
  
  // Per altre località, restituisci un array vuoto
  return [];
};

/**
 * Gets POIs by category, filtering out unnamed locations and prioritizing interesting ones
 */
const getPOIsByCategory = async (
  lat: number,
  lon: number,
  category: 'tourism' | 'natural' | 'leisure' | 'amenity',
  radius: number = 4000,
  showOnlyInteresting: boolean = true
): Promise<POI[]> => {
  // Define filters based on category
  let filters: string[] = [];
  
  switch (category) {
    case 'tourism':
      filters = [
        'node["tourism"="viewpoint"]',
        'node["tourism"="attraction"]',
        'node["tourism"="museum"]',
        'node["tourism"="gallery"]',
        'node["tourism"="information"]'
      ];
      break;
    case 'natural':
      filters = [
        'node["natural"="peak"]',
        'node["natural"="volcano"]',
        'node["natural"="beach"]',
        'node["natural"="spring"]',
        'node["natural"="cave_entrance"]'
      ];
      break;
    case 'leisure':
      filters = [
        'way["leisure"="beach_resort"]',
        'way["leisure"="park"]',
        'way["leisure"="garden"]',
        'node["leisure"="swimming_pool"]'
      ];
      break;
    case 'amenity':
      filters = [
        'node["amenity"="cafe"]',
        'node["amenity"="restaurant"]',
        'node["amenity"="bar"]',
        'node["amenity"="pub"]'
      ];
      break;
  }
  
  return getPOIs(lat, lon, radius, filters);
};

/**
 * Gets nearby beaches
 */
const getNearbyBeaches = async (lat: number, lon: number, radius: number = 5000): Promise<POI[]> => {
  const filters = [
    'way["leisure"="beach_resort"]',
    'node["natural"="beach"]',
    'way["natural"="beach"]'
  ];
  
  return getPOIs(lat, lon, radius, filters);
};

/**
 * Gets nearby viewpoints (miradores)
 */
const getNearbyViewpoints = async (lat: number, lon: number, radius: number = 5000): Promise<POI[]> => {
  const filters = [
    'node["tourism"="viewpoint"]'
  ];
  
  return getPOIs(lat, lon, radius, filters);
};

/**
 * Gets nearby food and drink places
 */
const getNearbyFoodAndDrink = async (lat: number, lon: number, radius: number = 3000): Promise<POI[]> => {
  const filters = [
    'node["amenity"="cafe"]',
    'node["amenity"="restaurant"]',
    'node["amenity"="bar"]',
    'node["amenity"="pub"]'
  ];
  
  return getPOIs(lat, lon, radius, filters);
};

/**
 * Gets nearby hiking trails
 */
const getNearbyHikingTrails = async (lat: number, lon: number, radius: number = 5000): Promise<POI[]> => {
  const filters = [
    'way["highway"="path"]["sac_scale"]',
    'way["highway"="footway"]["trail_visibility"]',
    'relation["route"="hiking"]'
  ];
  
  return getPOIs(lat, lon, radius, filters);
};

export const osmService = {
  getPOIs,
  getPOIsByCategory,
  getNearbyBeaches,
  getNearbyViewpoints,
  getNearbyFoodAndDrink,
  getNearbyHikingTrails,
  // Esponiamo la funzione per svuotare la cache in caso di problemi
  clearCache: () => {
    return cacheService.clearNamespace(CacheNamespace.POI);
  }
};
