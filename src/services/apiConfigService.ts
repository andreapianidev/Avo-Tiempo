/**
 * API Configuration Service
 * Centralizza la gestione delle chiavi API e configurazioni per i servizi esterni
 */

import { logAppError } from './appStateService';

// Chiavi API
export const API_KEYS = {
  // Chiave per OpenWeather API - verificare sempre la validità di questa chiave
  // Per ottenere una chiave: https://home.openweathermap.org/users/sign_up
  OPENWEATHER: process.env.REACT_APP_OPENWEATHER_API_KEY || 'b33c9835879f888134e97c6d58d6e4a7',
  // Nessuna chiave necessaria per Overpass API
  OVERPASS: '',
  // Chiave per Mapbox API
  // Per ottenere una chiave: https://account.mapbox.com/auth/signup/
  MAPBOX: process.env.REACT_APP_MAPBOX_TOKEN || '',
};

// URL di base dei servizi
export const API_BASE_URLS = {
  OPENWEATHER_CURRENT: 'https://api.openweathermap.org/data/2.5',
  // NOTA: Rimosso riferimento a OPENWEATHER_ONECALL per evitare chiamate all'API a pagamento
  MAPBOX: 'https://api.mapbox.com',
  OVERPASS: [
    'https://overpass-api.de/api/interpreter',            // Server principale in Germania
    'https://lz4.overpass-api.de/api/interpreter',        // Mirror con compressione LZ4 (più veloce)
    'https://z.overpass-api.de/api/interpreter',          // Mirror secondario ufficiale
    'https://overpass.openstreetmap.fr/api/interpreter',  // Mirror francese, stabile e attivo
    'https://overpass.kumi.systems/api/interpreter',      // Mirror molto veloce, gestito da terzi affidabili
    'https://overpass.osm.ch/api/interpreter',            // Mirror svizzero (OpenStreetMap.ch)
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter' // Mirror di Mail.ru (lento, ma utile come fallback)
  ]
};

// Configurazioni di timeout e retry
export const API_CONFIG = {
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 5000
};

/**
 * Ottiene la configurazione completa per l'API specificata
 * @param apiName Nome dell'API (es. OPENWEATHER, OVERPASS)
 */
export const getApiConfig = (apiName: 'OPENWEATHER' | 'OVERPASS' | 'MAPBOX') => {
  let baseUrl;
  if (apiName === 'OPENWEATHER') {
    baseUrl = API_BASE_URLS.OPENWEATHER_CURRENT;
  } else if (apiName === 'MAPBOX') {
    baseUrl = API_BASE_URLS.MAPBOX;
  } else {
    baseUrl = API_BASE_URLS.OVERPASS[0]; // Prende il primo URL dall'array
  }
  
  return {
    key: API_KEYS[apiName],
    baseUrl: baseUrl,
    timeout: API_CONFIG.TIMEOUT_MS,
    retryAttempts: API_CONFIG.RETRY_ATTEMPTS,
    retryDelay: API_CONFIG.RETRY_DELAY_MS
  };
};

// Tipo per le chiavi API supportate
export type ApiName = keyof typeof API_KEYS;

/**
 * Implementa una funzione fetch con retry automatico in caso di errore
 * @param url URL da chiamare
 * @param options Opzioni fetch standard
 * @param retries Numero di tentativi rimanenti
 * @param baseDelay Ritardo base tra tentativi (in ms)
 */
export const fetchWithRetry = async (
  url: string, 
  options?: RequestInit, 
  retries = API_CONFIG.RETRY_ATTEMPTS,
  baseDelay = API_CONFIG.RETRY_DELAY_MS
): Promise<Response> => {
  try {
    // Aggiunge un timeout alla richiesta fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Se la risposta è ok, la restituiamo
    if (response.ok) return response;
    
    // Altrimenti lanciamo un errore
    throw new Error(`Server responded with status: ${response.status}`);
  } catch (error) {
    // Se non ci sono più tentativi, propaga l'errore
    if (retries <= 0) throw error;
    
    // Log dell'errore
    console.warn(`API call failed, retrying (${retries} attempts left)...`, error);
    logAppError('fetchWithRetry', `API call failed to ${url}, retrying (${retries} attempts left): ${error}`);
    
    // Calcola il ritardo con backoff esponenziale
    const delay = Math.min(baseDelay * (API_CONFIG.RETRY_ATTEMPTS - retries + 1), API_CONFIG.MAX_RETRY_DELAY_MS);
    
    // Attende il ritardo calcolato
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Riprova la chiamata con un tentativo in meno
    return fetchWithRetry(url, options, retries - 1, baseDelay);
  }
};

/**
 * Verifica se una chiave API è valida
 * @param apiName Nome dell'API (es. OPENWEATHER, OVERPASS)
 * @returns Promise<boolean> che risolve a true se la chiave è valida
 */
export const validateApiKey = async (apiName: 'OPENWEATHER' | 'MAPBOX'): Promise<boolean> => {
  try {
    if (apiName === 'OPENWEATHER') {
      const response = await fetchWithRetry(
        `${API_BASE_URLS.OPENWEATHER_CURRENT}/weather?q=London&appid=${API_KEYS.OPENWEATHER}`
      );
      return response.ok;
    } else if (apiName === 'MAPBOX') {
      // Verifica la validità della chiave Mapbox
      const response = await fetchWithRetry(
        `${API_BASE_URLS.MAPBOX}/styles/v1/mapbox/streets-v11?access_token=${API_KEYS.MAPBOX}`
      );
      return response.ok;
    }
    return false;
  } catch (error) {
    logAppError('validateApiKey', `Failed to validate API key for ${apiName}: ${error}`);
    return false;
  }
};
