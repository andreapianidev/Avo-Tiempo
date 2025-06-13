import { createError, ErrorType } from './errorService';
import { getCacheItem, setCacheItem, CacheNamespace } from './cacheService';
import { logAppError } from './appStateService';

// Tipo per le località predefinite
type LocationKey = 'el paso' | 'santa cruz de tenerife' | 'las palmas' | 'default';

// Interfaccia per i dati di località
interface LocationData {
  lat: number;
  lon: number;
  name: string;
}

// Coordenadas predeterminadas para ubicaciones canarias populares
export const DEFAULT_LOCATIONS: Record<LocationKey, LocationData> = {
  'el paso': { lat: 28.6586, lon: -17.7797, name: 'El Paso, La Palma' }, // El Paso, La Palma
  'santa cruz de tenerife': { lat: 28.4636, lon: -16.2518, name: 'Santa Cruz de Tenerife' },
  'las palmas': { lat: 28.1248, lon: -15.4300, name: 'Las Palmas de Gran Canaria' },
  'default': { lat: 28.4636, lon: -16.2518, name: 'Islas Canarias' }  // Default to Santa Cruz de Tenerife
};

// Cache key for last known position
const LAST_POSITION_CACHE_KEY = 'last_known_position';
const POSITION_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Interface for geolocation coordinates
 */
export interface GeoCoords {
  latitude: number;
  longitude: number;
}

/**
 * Get the user's current location using browser's geolocation API
 * @returns Promise with coordinates
 */
/**
 * Get the user's current location using browser's geolocation API
 * @param useFallback If true, return cached or default position on error
 * @returns Promise with coordinates
 */
export const getCurrentPosition = (useFallback: boolean = false): Promise<GeoCoords> => {
  return new Promise((resolve, reject) => {
    // Try to get cached position first in case we need to fall back to it
    const cachedPosition = getCacheItem<GeoCoords>(CacheNamespace.LOCATIONS, LAST_POSITION_CACHE_KEY);
    
    if (!navigator.geolocation) {
      const error = createError(
        ErrorType.LOCATION, 
        'La geolocalizzazione non è supportata dal tuo browser', 
        null
      );
      
      if (useFallback) {
        logAppError('getCurrentPosition.noGeolocation', error);
        if (cachedPosition) {
          console.log('[GEOLOCATION] Utilizzando l\'ultima posizione nota dalla cache');
          return resolve(cachedPosition);
        } else {
          console.log('[GEOLOCATION] Utilizzando posizione predefinita: Santa Cruz de Tenerife');
          return resolve({
            latitude: DEFAULT_LOCATIONS.default.lat,
            longitude: DEFAULT_LOCATIONS.default.lon
          });
        }
      }
      
      return reject(error);
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        // Cache successful position for future fallback
        setCacheItem(CacheNamespace.LOCATIONS, LAST_POSITION_CACHE_KEY, coords, POSITION_CACHE_TTL);
        console.log('[GEOLOCATION] Posizione ottenuta con successo e salvata in cache');
        
        resolve(coords);
      },
      (error) => {
        let errorMessage: string;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato dall\'utente';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informazioni sulla posizione non disponibili';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout nella richiesta di posizione';
            break;
          default:
            errorMessage = 'Errore sconosciuto durante la geolocalizzazione';
        }
        
        const appError = createError(
          ErrorType.LOCATION, 
          errorMessage, 
          error
        );
        
        if (useFallback) {
          logAppError('getCurrentPosition.error', appError);
          
          if (cachedPosition) {
            console.log('[GEOLOCATION] Fallback: utilizzando l\'ultima posizione nota dalla cache');
            return resolve(cachedPosition);
          } else {
            console.log('[GEOLOCATION] Fallback: utilizzando posizione predefinita Canarie');
            return resolve({
              latitude: DEFAULT_LOCATIONS.default.lat,
              longitude: DEFAULT_LOCATIONS.default.lon
            });
          }
        }
        
        reject(appError);
      }, 
      { 
        enableHighAccuracy: false, 
        timeout: 20000, 
        maximumAge: 600000  // Cache position for 10 minutes
      }
    );
  });
};

/**
 * Check if coordinates are in the Canary Islands region
 * @param coords - Latitude and longitude
 * @returns Boolean indicating if coords are in Canary Islands
 */
const isInCanaryIslands = (coords: GeoCoords): boolean => {
  // Canary Islands bounding box (approximate)
  const canaryBounds = {
    minLat: 27.6, maxLat: 29.5,
    minLon: -18.2, maxLon: -13.4
  };
  
  return coords.latitude >= canaryBounds.minLat && 
         coords.latitude <= canaryBounds.maxLat && 
         coords.longitude >= canaryBounds.minLon && 
         coords.longitude <= canaryBounds.maxLon;
};

/**
 * Get city name from coordinates using reverse geocoding with OpenStreetMap
 * @param coords - Latitude and longitude
 * @returns Promise with city name
 */
export const getCityFromCoords = async (coords: GeoCoords): Promise<string> => {
  try {
    // Verifica se siamo nelle Canarie per prevenire errori di geocoding
    if (isInCanaryIslands(coords)) {
      console.log('[GEOLOCATION] Coordinate nelle Isole Canarie detectate');
      
      // Trova la località canaria più vicina alle coordinate fornite
      let closestLocation: LocationKey | null = null;
      let minDistance = Number.MAX_VALUE;
      
      for (const [locationName, location] of Object.entries(DEFAULT_LOCATIONS)) {
        const distance = Math.sqrt(
          Math.pow(coords.latitude - location.lat, 2) + 
          Math.pow(coords.longitude - location.lon, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = locationName as LocationKey;
        }
      }
      
      if (closestLocation && minDistance < 0.1) { // Circa 11km
        console.log(`[GEOLOCATION] Località corrispondente trovata: ${DEFAULT_LOCATIONS[closestLocation].name}`);
        return DEFAULT_LOCATIONS[closestLocation].name;
      }
    }
    
    // Using OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10&addressdetails=1&countrycodes=es`,
      {
        headers: {
          'Accept-Language': 'es,it', // Prefer Spanish and Italian results
          'User-Agent': 'AVO Weather App' // Required by Nominatim usage policy
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if we're in Spain
    if (data.address && data.address.country_code !== 'es') {
      console.warn(`[GEOLOCATION] Coordinate fuori dalla Spagna rilevate: ${data.address.country_code}`);
      console.log('[GEOLOCATION] Usando località predefinita delle Canarie');
      return DEFAULT_LOCATIONS.default.name;
    }
    
    // Try to get the city or town name
    let cityName = data.address.city || 
                  data.address.town || 
                  data.address.village || 
                  data.address.municipality ||
                  data.address.county;
    
    // If no city-like entity found, use the display name
    if (!cityName && data.display_name) {
      const parts = data.display_name.split(',');
      cityName = parts[0].trim();
    }
    
    // If still no name, throw error
    if (!cityName) {
      throw new Error('No city name found in geocoding result');
    }
    
    return cityName;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    throw createError(
      ErrorType.API, 
      'Impossibile determinare la città dalle coordinate', 
      error
    );
  }
};

/**
 * Get both coordinates and city name using browser geolocation
 * @returns Promise with city name
 */
/**
 * Get both coordinates and city name using browser geolocation
 * @param useFallback If true, use cached or default position on error
 * @returns Promise with city name and coordinates
 */
export const getCurrentCity = async (useFallback: boolean = true): Promise<{city: string, coords: GeoCoords}> => {
  try {
    const coords = await getCurrentPosition(useFallback);
    const city = await getCityFromCoords(coords);
    return { city, coords };
  } catch (error) {
    console.error('[GEOLOCATION] Error getting current city:', error);
    
    if (useFallback) {
      console.log('[GEOLOCATION] Fallback: usando posizione predefinita per città');
      // Use default location for La Palma
      const defaultCoords = {
        latitude: DEFAULT_LOCATIONS.default.lat,
        longitude: DEFAULT_LOCATIONS.default.lon
      };
      return {
        city: DEFAULT_LOCATIONS.default.name,
        coords: defaultCoords
      };
    }
    
    throw error;
  }
};
