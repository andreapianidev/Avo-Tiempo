import { createError, ErrorType } from './errorService';

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
export const getCurrentPosition = (): Promise<GeoCoords> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(createError(
        ErrorType.LOCATION, 
        'La geolocalizzazione non è supportata dal tuo browser', 
        null
      ));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
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
        
        reject(createError(
          ErrorType.LOCATION, 
          errorMessage, 
          error
        ));
      }, 
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 600000  // Cache position for 10 minutes
      }
    );
  });
};

/**
 * Get city name from coordinates using reverse geocoding with OpenStreetMap
 * @param coords - Latitude and longitude
 * @returns Promise with city name
 */
export const getCityFromCoords = async (coords: GeoCoords): Promise<string> => {
  try {
    // Using OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10&addressdetails=1`,
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
export const getCurrentCity = async (): Promise<{city: string, coords: GeoCoords}> => {
  try {
    const coords = await getCurrentPosition();
    const city = await getCityFromCoords(coords);
    return { city, coords };
  } catch (error) {
    console.error('Error getting current city:', error);
    throw error;
  }
};
