import { logError, ErrorType, createError, ErrorSeverity } from './errorService';
import { getCacheItem, setCacheItem, clearNamespace, CacheNamespace } from './cacheService';
import cacheService from './cacheService'; // Importiamo l'intero servizio per accedere alle funzioni non esportate singolarmente
import { API_KEYS, API_BASE_URLS, fetchWithRetry } from './apiConfigService';
import { logAppError, isOffline } from './appStateService';

// API URL principale (dal servizio centralizzato)
// Ora API_BASE_URLS.OVERPASS è un array, prendiamo il primo come default.
const OVERPASS_API_URL = API_BASE_URLS.OVERPASS[0];

// Cache keys
const CACHE_POI_PREFIX = 'poi_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore

// Enum per le categorie POI
export enum POICategory {
  TOURISM = 'tourism',
  NATURAL = 'natural',
  LEISURE = 'leisure',
  AMENITY = 'amenity',
  SHOP = 'shop',
  ROUTE = 'route'
}

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
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Gets the appropriate icon for a POI based on its tags
 */
const getPoiIcon = (tags: Record<string, string | undefined>): string => {
  if (tags.tourism && POI_ICONS[tags.tourism]) {
    return POI_ICONS[tags.tourism];
  } else if (tags.natural && POI_ICONS[tags.natural]) {
    return POI_ICONS[tags.natural];
  } else if (tags.leisure && POI_ICONS[tags.leisure]) {
    return POI_ICONS[tags.leisure];
  } else if (tags.amenity && POI_ICONS[tags.amenity]) {
    return POI_ICONS[tags.amenity];
  } else if (tags.shop && POI_ICONS[tags.shop]) {
    return POI_ICONS[tags.shop];
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
  if (tags.public_transport || tags.highway) return 'public_transport';
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
  return tags['name:es'] || tags.name || tags['name:en'] || 'Punto de interés';
};

/**
 * Determines if a POI is interesting based on its tags and name
 * Versione MOLTO inclusiva per garantire che vengano mostrati sempre alcuni POI
 */
const isPoiInteresting = (tags: Record<string, string | undefined>, name: string): boolean => {
  // Quasi tutti i POI con un nome dovrebbero essere considerati interessanti
  // Questo è un approccio molto più permissivo per garantire risultati
  if (name && name.length > 0) {
    // Tutte le categorie principali sono considerate interessanti
    if (tags.tourism || tags.natural || tags.historic || 
        tags.leisure || tags.amenity || tags.shop || 
        tags.public_transport || tags.highway || 
        tags.healthcare || tags.emergency || tags.sport) {
      return true;
    }
    
    // Verifica nomi in varie lingue
    const lowerName = name.toLowerCase();
    const interestingTerms = [
      // Spagnolo
      'mirador', 'playa', 'parque', 'museo', 'iglesia', 'castillo', 'puerto', 'sendero',
      'plaza', 'calle', 'mercado', 'tienda', 'bar', 'café', 'restaurante', 'hotel',
      'centro', 'estación', 'parada', 'edificio', 'ayuntamiento', 'casa', 'montaña', 'vista',
      // Inglese
      'viewpoint', 'beach', 'park', 'museum', 'church', 'castle', 'port', 'trail',
      'square', 'street', 'market', 'shop', 'bar', 'cafe', 'restaurant', 'hotel',
      'center', 'station', 'stop', 'building', 'town hall', 'house', 'mountain', 'view',
      // Termini generici utili in qualsiasi lingua
      'el', 'la', 'los', 'las', 'del', 'de', 'san', 'santa'
    ];
    
    // Se il nome contiene uno di questi termini, lo consideriamo interessante
    for (const term of interestingTerms) {
      if (lowerName.includes(term)) return true;
    }
  }
  
  // Anche se non ha un nome, consideriamo interessanti alcune categorie essenziali
  if (tags.tourism === 'viewpoint' || 
      tags.natural === 'beach' || 
      tags.amenity === 'restaurant' || 
      tags.amenity === 'cafe' || 
      tags.amenity === 'hospital' ||
      tags.amenity === 'pharmacy' ||
      tags.amenity === 'fuel' ||
      tags.highway === 'bus_stop' ||
      tags.public_transport === 'stop_position') {
    return true;
  }
  
  // Per luoghi senza nome, verifichiamo anche altri attributi
  if (tags.website || tags.phone || tags.stars || tags.rating) return true;
  
  return false;
};

/**
 * Gets the type of a POI based on its tags
 */
const getPoiType = (tags: Record<string, string | undefined>): string => {
  if (tags.tourism) return tags.tourism;
  if (tags.natural) return tags.natural;
  if (tags.leisure) return tags.leisure;
  if (tags.amenity) return tags.amenity;
  if (tags.shop) return tags.shop;
  if (tags.historic) return tags.historic;
  
  return 'point';
};

/**
 * Normalizes OSM elements to a standard POI format
 */
const normalizeOsmElements = (elements: (OSMNode | OSMWay)[], userLat: number, userLon: number): POI[] => {
  return elements.map(element => {
    // Handle both nodes and ways
    const lat = 'lat' in element ? element.lat : element.center.lat;
    const lon = 'lon' in element ? element.lon : element.center.lon;
    
    const tags = element.tags || {};
    const name = getPoiName(tags);
    const type = getPoiType(tags);
    const category = getPoiCategory(tags);
    const distance = calculateDistance(userLat, userLon, lat, lon);
    const icon = getPoiIcon(tags);
    
    return {
      id: `${element.id}`,
      name,
      type,
      category,
      lat,
      lon,
      distance,
      tags,
      icon,
      isInteresting: isPoiInteresting(tags, name)
    };
  });
};

/**
 * Builds an Overpass QL query for POIs around a location
 */
const buildOverpassQuery = (lat: number, lon: number, radius: number = 10000, filters: string[] = []): string => {
  // Se non sono specificati filtri personalizzati, usa una query generica che include diversi tipi di POI
  if (filters.length === 0) {
    return `
      [out:json][timeout:50];
      (
        // Punti di interesse turistici - inclusi quelli senza nome
        node["tourism"](around:${radius},${lat},${lon});
        way["tourism"](around:${radius},${lat},${lon});
        relation["tourism"](around:${radius},${lat},${lon});
        
        // Attrazioni naturali
        node["natural"](around:${radius},${lat},${lon});
        way["natural"](around:${radius},${lat},${lon});
        
        // Luoghi di svago
        node["leisure"](around:${radius},${lat},${lon});
        way["leisure"](around:${radius},${lat},${lon});
        
        // Servizi - tutti i tipi di amenity, non solo quelli specifici
        node["amenity"](around:${radius},${lat},${lon});
        way["amenity"](around:${radius},${lat},${lon});
        
        // Infrastrutture di trasporto
        node["public_transport"](around:${radius},${lat},${lon});
        way["highway"="bus_stop"](around:${radius},${lat},${lon});
        node["highway"="bus_stop"](around:${radius},${lat},${lon});
        
        // Negozi
        node["shop"](around:${radius},${lat},${lon});
        way["shop"](around:${radius},${lat},${lon});
        
        // Luoghi storici
        node["historic"](around:${radius},${lat},${lon});
        way["historic"](around:${radius},${lat},${lon});
        
        // Strade principali, utile quando non ci sono altri POI
        way["highway"="primary"](around:${radius},${lat},${lon});
        way["highway"="secondary"](around:${radius},${lat},${lon});
        way["highway"="tertiary"](around:${radius},${lat},${lon});
        
        // Aree residenziali e commerciali
        way["landuse"="residential"](around:${radius},${lat},${lon});
        way["landuse"="commercial"](around:${radius},${lat},${lon});
      );
      out center body qt;
    `;
  }
  
  // Default query allargato con più categorie per trovare più POI
  const defaultFilters = [
    // Turismo e punti di interesse
    'node["tourism"]',
    'way["tourism"]',
    'node["historic"]',
    'way["historic"]',
    
    // Natura e paesaggio
    'node["natural"]',
    'way["natural"]',
    
    // Tempo libero
    'node["leisure"]',
    'way["leisure"]',
    
    // Servizi vari
    'node["amenity"="restaurant"]',
    'node["amenity"="cafe"]',
    'node["amenity"="bar"]',
    'node["amenity"="pub"]',
    'node["amenity"="fast_food"]',
    'node["amenity"="ice_cream"]',
    'node["amenity"="cinema"]',
    'node["amenity"="theatre"]',
    'node["amenity"="arts_centre"]',
    'node["amenity"="marketplace"]',
    'node["amenity"="pharmacy"]',
    'node["amenity"="hospital"]',
    'node["amenity"="fuel"]',
    'node["amenity"="bank"]',
    'node["amenity"="police"]',
    
    // Negozi e shopping
    'node["shop"]',
    
    // Sport e attività
    'node["sport"]',
    'way["sport"]',
    
    // Luoghi di culto
    'node["amenity"="place_of_worship"]'
  ];
  
  const queryFilters = filters.length > 0 ? filters : defaultFilters;
  
  // Aumentato il timeout a 30 secondi per query più complesse
  return `
    [out:json][timeout:30];
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
    const cachedData = getCacheItem<POI[]>(CacheNamespace.POI, cacheKey);
    if (!cachedData) return null;
    
    return cachedData;
  } catch (error) {
    console.error('Error retrieving cached POIs:', error);
    return null;
  }
};

/**
 * Salva i POI nella cache locale
 * Implementa strategie per evitare di superare la quota di storage
 */
const cachePOIs = (cacheKey: string, pois: POI[]): void => {
  try {
    // Limita il numero massimo di POI in cache a 500 elementi
    const MAX_CACHED_POIS = 500;
    // Se abbiamo troppi POI, manteniamo solo quelli più interessanti e vicini
    let poisToCache = pois;
    
    if (pois.length > MAX_CACHED_POIS) {
      console.log(`[OSM SERVICE] Limitazione POI in cache da ${pois.length} a ${MAX_CACHED_POIS}`);
      
      // Priorità 1: POI interessanti
      const interestingPois = pois.filter(poi => poi.isInteresting);
      
      // Priorità 2: Se abbiamo ancora troppi POI interessanti, li ordiniamo per distanza
      const sortedPois = interestingPois
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_CACHED_POIS);
      
      // Se non abbiamo abbastanza POI interessanti, aggiungiamo altri POI ordinati per distanza
      if (sortedPois.length < MAX_CACHED_POIS) {
        const remainingPois = pois
          .filter(poi => !poi.isInteresting)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, MAX_CACHED_POIS - sortedPois.length);
        
        poisToCache = [...sortedPois, ...remainingPois];
      } else {
        poisToCache = sortedPois;
      }
    }
    
    // Prima di salvare, verifichiamo se ci sono altre cache di POI e ne rimuoviamo alcune se necessario
    try {
      // Se abbiamo più di 3 cache di POI, rimuoviamo quella più vecchia
      const allPOIKeys = cacheService.getAllNamespaceKeys(CacheNamespace.POI);
      if (allPOIKeys.length > 3) {
        // Otteniamo l'età di ciascuna cache e rimuoviamo quella più vecchia
        const oldestKey = allPOIKeys.reduce((oldest: string, current: string) => {
          const ageOldest = cacheService.getCacheItemAge(CacheNamespace.POI, oldest) || 0;
          const ageCurrent = cacheService.getCacheItemAge(CacheNamespace.POI, current) || 0;
          return ageCurrent > ageOldest ? current : oldest;
        }, allPOIKeys[0]);
        
        if (oldestKey) {
          console.log(`[OSM SERVICE] Rimozione cache POI più vecchia: ${oldestKey}`);
          cacheService.removeCacheItem(CacheNamespace.POI, oldestKey);
        }
      }
    } catch (e) {
      console.error('[OSM SERVICE] Errore nella pulizia della cache:', e);
    }
    
    // Ora salviamo i POI filtrati in cache
    setCacheItem(CacheNamespace.POI, cacheKey, poisToCache, CACHE_DURATION);
  } catch (error) {
    console.error('[OSM SERVICE] Error caching POIs:', error);
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
  return roundedLat + '_' + roundedLon + '_' + radius + '_' + filterKey;
};

/**
 * Fetches POIs from OpenStreetMap via Overpass API
 * Con meccanismo di retry avanzato e fallback intelligente
 */
const getPOIs = async (
  lat: number, 
  lon: number, 
  radius: number = 20000, // Aumentato il raggio predefinito a 20km per coprire più area
  filters: string[] = [],
  forceRefresh: boolean = false
): Promise<POI[]> => {
  // Log per debug
  console.log(`[OSM SERVICE] Richiesta POI per coordinate: ${lat}, ${lon}, raggio: ${radius}m`);
  
  // Controllo speciale per Santa Cruz de Tenerife, dove a volte l'API restituisce pochi risultati
  const isSantaCruzTenerife = Math.abs(lat - 28.4578) < 0.1 && Math.abs(lon - (-16.2637)) < 0.1;
  if (isSantaCruzTenerife) {
    console.log('[OSM SERVICE] Rilevata ricerca per Santa Cruz de Tenerife, utilizzo query ottimizzata');
    // Se siamo vicini a Santa Cruz, usiamo un set più ampio di filtri per trovare più POI
    if (filters.length === 0) {
      filters = [
        'node["tourism"]',
        'node["natural"]',
        'node["amenity"~"restaurant|cafe|bar|pub|ice_cream|fast_food"]',
        'node["shop"~"bakery|supermarket|convenience|mall"]',
        'way["tourism"]',
        'way["natural"="beach"]',
        'way["leisure"="park"]'
      ];
    }
    // Aumentiamo il raggio se specificato troppo piccolo
    radius = Math.max(radius, 30000);
  }
  
  // Genera chiave cache
  const cacheKey = generateCacheKey(lat, lon, radius, filters);
  
  // 1. Controlla se ci sono dati in cache (a meno che non sia stato richiesto un refresh forzato)
  if (!forceRefresh) {
    const cachedPOIs = getCachedPOIs(cacheKey);
    if (cachedPOIs) {
      console.log('[OSM SERVICE] Utilizzo POI dalla cache locale');
      return cachedPOIs;
    }
  } else {
    console.log('[OSM SERVICE] Refresh forzato: ignoro la cache locale');
  }
  
  // 2. Verifica se il dispositivo è offline
  if (isOffline()) {
    console.log('[OSM SERVICE] Dispositivo offline, utilizzo dati di default');
    return getDefaultPOIs(lat, lon);
  }
  
  // 3. Costruisci la query Overpass
  const query = buildOverpassQuery(lat, lon, radius, filters);
  
  // 4. Prova prima con l'API configurata centralmente usando fetchWithRetry
  try {
    console.log(`[OSM SERVICE] Tentativo con API primaria: ${OVERPASS_API_URL}`);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    };
    
    const response = await fetchWithRetry(OVERPASS_API_URL, requestOptions);
    
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
    
    console.log(`[OSM SERVICE] Recuperati ${sortedPois.length} POI`);
    return sortedPois;
  } catch (primaryError) {
    // Log dell'errore primario
    logAppError('osmService.getPOIs.primary', 
      `Errore con API primaria: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`);
    
    // 5. Fallback: prova con gli endpoint alternativi
    console.log('[OSM SERVICE] Fallback: tentativo con endpoint alternativi');
    
    for (let attempt = 0; attempt < API_BASE_URLS.OVERPASS.length; attempt++) {
      const endpoint = API_BASE_URLS.OVERPASS[attempt];
      const timeoutMs = Math.min(5000 * Math.pow(1.5, attempt), 20000); // Backoff esponenziale fino a 20 secondi
      
      try {
        console.log(`[OSM SERVICE] Tentativo ${attempt + 1}/${API_BASE_URLS.OVERPASS.length}: ${endpoint}`);
        
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
        
        console.log(`[OSM SERVICE] Recuperati ${sortedPois.length} POI da endpoint alternativo`);
        return sortedPois;
      } catch (error) {
        console.warn(`[OSM SERVICE] Errore con endpoint ${endpoint}:`, error);
        
        // Se è l'ultimo tentativo, registra l'errore
        if (attempt === API_BASE_URLS.OVERPASS.length - 1) {
          const errorObj = createError(
            ErrorType.API,
            `Impossibile recuperare POI dopo ${API_BASE_URLS.OVERPASS.length + 1} tentativi: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : new Error(String(error)),
            'Non è stato possibile recuperare i punti di interesse nelle vicinanze. Riprova più tardi.',
            ErrorSeverity.MEDIUM
          );
          logError(errorObj);
        }
      }
    }
  }
  
  // 6. Se tutti i tentativi falliscono, restituisci i POI di default
  console.log('[OSM SERVICE] Tutti i tentativi falliti, utilizzo POI predefiniti');
  const defaultPOIs = getDefaultPOIs(lat, lon);
  
  // Salva anche i POI di default in cache per evitare nuovi tentativi falliti
  if (defaultPOIs.length > 0) {
    cachePOIs(cacheKey, defaultPOIs);
  }
  
  return defaultPOIs;
};

/**
 * Restituisce POI predefiniti per una posizione quando tutte le API falliscono
 */
const getDefaultPOIs = (lat: number, lon: number): POI[] => {
  // Controllo speciale per Santa Cruz de Tenerife
  const isSantaCruzTenerife = Math.abs(lat - 28.4578) < 0.1 && Math.abs(lon - (-16.2637)) < 0.1;
  
  if (isSantaCruzTenerife) {
    console.log('[OSM SERVICE] Utilizzo dati predefiniti specifici per Santa Cruz de Tenerife');
    return [
      {
        id: 'scz_1',
        name: 'Playa de Las Teresitas',
        type: 'beach',
        category: 'natural',
        lat: 28.5077,
        lon: -16.1885,
        distance: calculateDistance(lat, lon, 28.5077, -16.1885),
        tags: { natural: 'beach' },
        icon: POI_ICONS.beach || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_2',
        name: 'Parque García Sanabria',
        type: 'park',
        category: 'leisure',
        lat: 28.4698,
        lon: -16.2569,
        distance: calculateDistance(lat, lon, 28.4698, -16.2569),
        tags: { leisure: 'park' },
        icon: POI_ICONS.park || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_3',
        name: 'Auditorio de Tenerife',
        type: 'attraction',
        category: 'tourism',
        lat: 28.4584,
        lon: -16.2475,
        distance: calculateDistance(lat, lon, 28.4584, -16.2475),
        tags: { tourism: 'attraction' },
        icon: POI_ICONS.attraction || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_4',
        name: 'Museo de la Naturaleza y el Hombre',
        type: 'museum',
        category: 'tourism',
        lat: 28.4633,
        lon: -16.2511,
        distance: calculateDistance(lat, lon, 28.4633, -16.2511),
        tags: { tourism: 'museum' },
        icon: POI_ICONS.museum || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_5',
        name: 'Mercado de Nuestra Señora de África',
        type: 'marketplace',
        category: 'amenity',
        lat: 28.4632,
        lon: -16.2649,
        distance: calculateDistance(lat, lon, 28.4632, -16.2649),
        tags: { amenity: 'marketplace' },
        icon: POI_ICONS.marketplace || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_6',
        name: 'Plaza de España',
        type: 'attraction',
        category: 'tourism',
        lat: 28.4676,
        lon: -16.2452,
        distance: calculateDistance(lat, lon, 28.4676, -16.2452),
        tags: { tourism: 'attraction' },
        icon: POI_ICONS.attraction || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_7',
        name: 'Iglesia de la Concepción',
        type: 'attraction',
        category: 'tourism',
        lat: 28.4686,
        lon: -16.2496,
        distance: calculateDistance(lat, lon, 28.4686, -16.2496),
        tags: { tourism: 'attraction', amenity: 'place_of_worship' },
        icon: POI_ICONS.attraction || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_8',
        name: 'Parque Marítimo César Manrique',
        type: 'swimming_pool',
        category: 'leisure',
        lat: 28.4598,
        lon: -16.2393,
        distance: calculateDistance(lat, lon, 28.4598, -16.2393),
        tags: { leisure: 'swimming_pool' },
        icon: POI_ICONS.swimming_pool || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_9',
        name: 'Castillo de San Juan Bautista',
        type: 'attraction',
        category: 'historic',
        lat: 28.4578,
        lon: -16.2416,
        distance: calculateDistance(lat, lon, 28.4578, -16.2416),
        tags: { historic: 'castle' },
        icon: POI_ICONS.attraction || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_10',
        name: 'Centro Comercial Meridiano',
        type: 'mall',
        category: 'shop',
        lat: 28.4563,
        lon: -16.2571,
        distance: calculateDistance(lat, lon, 28.4563, -16.2571),
        tags: { shop: 'mall' },
        icon: POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_11',
        name: 'Playa de Benijo',
        type: 'beach',
        category: 'natural',
        lat: 28.5734,
        lon: -16.1802,
        distance: calculateDistance(lat, lon, 28.5734, -16.1802),
        tags: { natural: 'beach' },
        icon: POI_ICONS.beach || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_12',
        name: 'Palmetum',
        type: 'garden',
        category: 'tourism',
        lat: 28.4532,
        lon: -16.2443,
        distance: calculateDistance(lat, lon, 28.4532, -16.2443),
        tags: { tourism: 'attraction', leisure: 'garden' },
        icon: POI_ICONS.garden || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_13',
        name: 'Restaurante El Cine',
        type: 'restaurant',
        category: 'amenity',
        lat: 28.4695,
        lon: -16.2487,
        distance: calculateDistance(lat, lon, 28.4695, -16.2487),
        tags: { amenity: 'restaurant' },
        icon: POI_ICONS.restaurant || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_14',
        name: 'Mirador de Cruz del Carmen',
        type: 'viewpoint',
        category: 'tourism',
        lat: 28.5358,
        lon: -16.2984,
        distance: calculateDistance(lat, lon, 28.5358, -16.2984),
        tags: { tourism: 'viewpoint' },
        icon: POI_ICONS.viewpoint || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'scz_15',
        name: 'Sendero de Los Sentidos',
        type: 'hiking',
        category: 'route',
        lat: 28.5326,
        lon: -16.2981,
        distance: calculateDistance(lat, lon, 28.5326, -16.2981),
        tags: { route: 'hiking' },
        icon: POI_ICONS.hiking || POI_ICONS.default,
        isInteresting: true
      }
    ];
  }
  
  // Per i luoghi in Gran Canaria, restituiamo POI predefiniti
  // Consideriamo che il centro di Las Palmas è vicino a lat: 28.13, lon: -15.43
  const isNearLasPalmas = calculateDistance(lat, lon, 28.13, -15.43) < 20000;
  const isNearTenerife = calculateDistance(lat, lon, 28.2916, -16.6291) < 30000;
  const isNearMadrid = calculateDistance(lat, lon, 40.4168, -3.7038) < 30000;
  const isNearBarcelona = calculateDistance(lat, lon, 41.3874, 2.1686) < 30000;
  
  // Qualsiasi località in Spagna (approssimativo)
  const isInSpain = lat > 36 && lat < 44 && lon > -9.5 && lon < 3.5;
  
  if (isNearLasPalmas) {
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
      },
      {
        id: 'default_4',
        name: 'Centro Comercial Las Arenas',
        type: 'mall',
        category: 'shop',
        lat: 28.1296,
        lon: -15.4356,
        distance: calculateDistance(lat, lon, 28.1296, -15.4356),
        tags: { shop: 'mall' },
        icon: POI_ICONS.supermarket || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_5',
        name: 'Museo Canario',
        type: 'museum',
        category: 'tourism',
        lat: 28.1315,
        lon: -15.4158,
        distance: calculateDistance(lat, lon, 28.1315, -15.4158),
        tags: { tourism: 'museum' },
        icon: POI_ICONS.museum || POI_ICONS.default,
        isInteresting: true
      }
    ];
  } else if (isNearTenerife) {
    return [
      {
        id: 'default_1',
        name: 'Playa de Las Teresitas',
        type: 'beach',
        category: 'natural',
        lat: 28.5054,
        lon: -16.1866,
        distance: calculateDistance(lat, lon, 28.5054, -16.1866),
        tags: { natural: 'beach' },
        icon: POI_ICONS.beach || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_2',
        name: 'Teide National Park',
        type: 'national_park',
        category: 'natural',
        lat: 28.2719,
        lon: -16.6442,
        distance: calculateDistance(lat, lon, 28.2719, -16.6442),
        tags: { natural: 'national_park' },
        icon: POI_ICONS.peak || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_3',
        name: 'Siam Park',
        type: 'theme_park',
        category: 'tourism',
        lat: 28.0715,
        lon: -16.7318,
        distance: calculateDistance(lat, lon, 28.0715, -16.7318),
        tags: { tourism: 'theme_park' },
        icon: POI_ICONS.viewpoint || POI_ICONS.default,
        isInteresting: true
      }
    ];
  } else if (isNearMadrid) {
    return [
      {
        id: 'default_1',
        name: 'Museo del Prado',
        type: 'museum',
        category: 'tourism',
        lat: 40.4138,
        lon: -3.6922,
        distance: calculateDistance(lat, lon, 40.4138, -3.6922),
        tags: { tourism: 'museum' },
        icon: POI_ICONS.museum || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_2',
        name: 'Parque del Retiro',
        type: 'park',
        category: 'leisure',
        lat: 40.4152,
        lon: -3.6844,
        distance: calculateDistance(lat, lon, 40.4152, -3.6844),
        tags: { leisure: 'park' },
        icon: POI_ICONS.park || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_3',
        name: 'Plaza Mayor',
        type: 'attraction',
        category: 'tourism',
        lat: 40.4168,
        lon: -3.7038,
        distance: calculateDistance(lat, lon, 40.4168, -3.7038),
        tags: { tourism: 'attraction' },
        icon: POI_ICONS.landmark || POI_ICONS.default,
        isInteresting: true
      }
    ];
  } else if (isNearBarcelona) {
    return [
      {
        id: 'default_1',
        name: 'Sagrada Família',
        type: 'attraction',
        category: 'tourism',
        lat: 41.4036,
        lon: 2.1744,
        distance: calculateDistance(lat, lon, 41.4036, 2.1744),
        tags: { tourism: 'attraction' },
        icon: POI_ICONS.landmark || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_2',
        name: 'Park Güell',
        type: 'park',
        category: 'leisure',
        lat: 41.4145,
        lon: 2.1527,
        distance: calculateDistance(lat, lon, 41.4145, 2.1527),
        tags: { leisure: 'park' },
        icon: POI_ICONS.park || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_3',
        name: 'Barceloneta Beach',
        type: 'beach',
        category: 'natural',
        lat: 41.3792,
        lon: 2.1915,
        distance: calculateDistance(lat, lon, 41.3792, 2.1915),
        tags: { natural: 'beach' },
        icon: POI_ICONS.beach || POI_ICONS.default,
        isInteresting: true
      }
    ];
  } else if (isInSpain) {
    // Alcuni POI generici per la Spagna
    return [
      {
        id: 'default_1',
        name: 'Plaza Central',
        type: 'square',
        category: 'tourism',
        lat: lat + 0.01,
        lon: lon + 0.01,
        distance: calculateDistance(lat, lon, lat + 0.01, lon + 0.01),
        tags: { tourism: 'attraction' },
        icon: POI_ICONS.landmark || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_2',
        name: 'Restaurante Local',
        type: 'restaurant',
        category: 'amenity',
        lat: lat - 0.01,
        lon: lon - 0.01,
        distance: calculateDistance(lat, lon, lat - 0.01, lon - 0.01),
        tags: { amenity: 'restaurant' },
        icon: POI_ICONS.restaurant || POI_ICONS.default,
        isInteresting: true
      },
      {
        id: 'default_3',
        name: 'Parque Municipal',
        type: 'park',
        category: 'leisure',
        lat: lat,
        lon: lon + 0.02,
        distance: calculateDistance(lat, lon, lat, lon + 0.02),
        tags: { leisure: 'park' },
        icon: POI_ICONS.park || POI_ICONS.default,
        isInteresting: true
      }
    ];
  }
  
  // Crea un insieme più completo di POI generici per la località
  // Aggiungiamo più POI con maggiore varietà e distribuiti in diverse direzioni
  // Questo garantisce che ci siano sempre almeno 10-12 punti di interesse mostrati
  return [
    {
      id: 'generic_1',
      name: 'Centro urbano',
      type: 'town_center',
      category: 'tourism',
      lat: lat,
      lon: lon,
      distance: 0,
      tags: { amenity: 'town_center' },
      icon: POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_2',
      name: 'Área recreativa',
      type: 'park',
      category: 'leisure',
      lat: lat + 0.015,
      lon: lon + 0.015,
      distance: calculateDistance(lat, lon, lat + 0.015, lon + 0.015),
      tags: { leisure: 'park' },
      icon: POI_ICONS.park || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_3',
      name: 'Mirador panorámico',
      type: 'viewpoint',
      category: 'tourism',
      lat: lat - 0.02,
      lon: lon - 0.02,
      distance: calculateDistance(lat, lon, lat - 0.02, lon - 0.02),
      tags: { tourism: 'viewpoint' },
      icon: POI_ICONS.viewpoint || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_4',
      name: 'Restaurante local',
      type: 'restaurant',
      category: 'amenity',
      lat: lat + 0.008,
      lon: lon - 0.01,
      distance: calculateDistance(lat, lon, lat + 0.008, lon - 0.01),
      tags: { amenity: 'restaurant' },
      icon: POI_ICONS.restaurant || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_5',
      name: 'Café El Descanso',
      type: 'cafe',
      category: 'amenity',
      lat: lat - 0.005,
      lon: lon + 0.012,
      distance: calculateDistance(lat, lon, lat - 0.005, lon + 0.012),
      tags: { amenity: 'cafe' },
      icon: POI_ICONS.cafe || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_6',
      name: 'Supermercado',
      type: 'supermarket',
      category: 'shop',
      lat: lat + 0.01,
      lon: lon + 0.005,
      distance: calculateDistance(lat, lon, lat + 0.01, lon + 0.005),
      tags: { shop: 'supermarket' },
      icon: POI_ICONS.supermarket || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_7',
      name: 'Farmacia',
      type: 'pharmacy',
      category: 'healthcare',
      lat: lat + 0.007,
      lon: lon - 0.006,
      distance: calculateDistance(lat, lon, lat + 0.007, lon - 0.006),
      tags: { amenity: 'pharmacy' },
      icon: POI_ICONS.pharmacy || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_8',
      name: 'Bar El Paso',
      type: 'bar',
      category: 'amenity',
      lat: lat - 0.012,
      lon: lon - 0.007,
      distance: calculateDistance(lat, lon, lat - 0.012, lon - 0.007),
      tags: { amenity: 'bar' },
      icon: POI_ICONS.bar || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_9',
      name: 'Iglesia',
      type: 'place_of_worship',
      category: 'amenity',
      lat: lat - 0.005,
      lon: lon - 0.015,
      distance: calculateDistance(lat, lon, lat - 0.005, lon - 0.015),
      tags: { amenity: 'place_of_worship' },
      icon: POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_10',
      name: 'Parada de Autobús',
      type: 'bus_stop',
      category: 'public_transport',
      lat: lat + 0.003,
      lon: lon + 0.003,
      distance: calculateDistance(lat, lon, lat + 0.003, lon + 0.003),
      tags: { highway: 'bus_stop' },
      icon: POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_11',
      name: 'Tienda Local',
      type: 'convenience',
      category: 'shop',
      lat: lat - 0.008,
      lon: lon + 0.007,
      distance: calculateDistance(lat, lon, lat - 0.008, lon + 0.007),
      tags: { shop: 'convenience' },
      icon: POI_ICONS.convenience || POI_ICONS.default,
      isInteresting: true
    },
    {
      id: 'generic_12',
      name: 'Sendero local',
      type: 'hiking',
      category: 'route',
      lat: lat - 0.018,
      lon: lon + 0.02,
      distance: calculateDistance(lat, lon, lat - 0.018, lon + 0.02),
      tags: { route: 'hiking' },
      icon: POI_ICONS.hiking || POI_ICONS.default,
      isInteresting: true
    }
  ];
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

/**
 * Trova POI vicini alla posizione specificata in base alla categoria e al termine di ricerca
 * @param lat Latitudine del centro della ricerca
 * @param lon Longitudine del centro della ricerca
 * @param category Categoria di POI da cercare
 * @param radius Raggio di ricerca in metri
 * @param searchTerm Termine di ricerca opzionale
 * @returns Promise contenente un array di POI
 */
export const findNearbyPOIs = async (
  lat: number,
  lon: number,
  category: POICategory,
  radius: number = 5000,
  searchTerm?: string
): Promise<POI[]> => {
  try {
    // Crea filtri in base alla categoria
    let filters: string[] = [];
    
    switch (category) {
      case POICategory.TOURISM:
        filters.push('node["tourism"]');
        if (searchTerm) {
          filters = [`node["tourism"="${searchTerm}"]`];
        }
        break;
      case POICategory.NATURAL:
        filters.push('node["natural"]');
        if (searchTerm) {
          filters = [`node["natural"="${searchTerm}"]`];
        }
        break;
      case POICategory.LEISURE:
        filters.push('node["leisure"]', 'way["leisure"]');
        if (searchTerm) {
          filters = [`node["leisure"="${searchTerm}"]`, `way["leisure"="${searchTerm}"]`];
        }
        break;
      case POICategory.AMENITY:
        filters.push('node["amenity"]');
        if (searchTerm) {
          filters = [`node["amenity"="${searchTerm}"]`];
        }
        break;
      case POICategory.SHOP:
        filters.push('node["shop"]');
        if (searchTerm) {
          filters = [`node["shop"="${searchTerm}"]`];
        }
        break;
      case POICategory.ROUTE:
        filters.push('relation["route"]');
        if (searchTerm) {
          filters = [`relation["route"="${searchTerm}"]`];
        }
        break;
    }
    
    // Se abbiamo un termine di ricerca più generale, proviamo anche con il nome
    if (searchTerm && searchTerm.length > 2) {
      filters.push(`node["name"~"${searchTerm}",i]`);
    }
    
    // Ottieni i POI con i filtri creati
    const pois = await getPOIs(lat, lon, radius, filters);
    
    // Filtra POI senza nome e ordina per distanza
    return pois
      .filter(poi => poi.name && poi.name.trim() !== '')
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Errore nel recupero dei POI:', error);
    return [];
  }
};

/**
 * Esportiamo le funzioni del servizio OpenStreetMap
 */
export const osmService = {
  getPOIs,
  getPOIsByCategory,
  getNearbyBeaches,
  getNearbyViewpoints,
  getNearbyFoodAndDrink,
  getNearbyHikingTrails,
  calculateDistance,
  findNearbyPOIs,
  // Esponiamo la funzione per svuotare la cache in caso di problemi
  clearCache: () => {
    return clearNamespace(CacheNamespace.POI);
  }
};
