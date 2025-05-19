import { WeatherData } from './weatherService';
import { WeatherTrend } from './trendService';
import { createError, ErrorType } from './errorService';

// Chiavi per localStorage
const CURRENT_LOCATION_KEY = 'avo_current_location';
const WEATHER_CACHE_KEY = 'avo_weather_cache';
const TRENDS_CACHE_KEY = 'avo_trends_cache';
const LAST_API_CALL_KEY = 'avo_last_api_call';
const ERROR_LOG_KEY = 'avo_error_log';
const APP_STATE_VERSION = 'avo_state_version';
const SAVED_LOCATIONS_KEY = 'avo_saved_locations'; // Key for storing saved locations array

// Versione corrente dello stato dell'app
// Importante: incrementare quando cambia la struttura dei dati salvati
const CURRENT_VERSION = '1.0.0';

// Struttura per la cache meteo
interface WeatherCache {
  data: WeatherData;
  location: string;
  timestamp: number;
}

// Struttura per la cache tendenze
interface TrendsCache {
  data: WeatherTrend[];
  location: string;
  timestamp: number;
}

// TTL per i dati in cache (30 minuti)
const CACHE_TTL = 30 * 60 * 1000;

// TTL esteso per situazioni di connettività limitata (2 ore)
const EXTENDED_CACHE_TTL = 2 * 60 * 60 * 1000;

// Minimo tempo tra chiamate API (15 minuti)
const API_CALL_LIMIT = 15 * 60 * 1000;

// Limite per lo storage di errori
const MAX_ERROR_LOG_SIZE = 20;

// Flag per modalità offline
let isOfflineMode = false;

// Preferenze per le notifiche
interface NotificationPreferences {
  offlineMode: boolean;  // Notifiche quando l'app passa in modalità offline/online
  weatherAlerts: boolean; // Notifiche per nuovi avvisi meteo
  dataUpdates: boolean;  // Notifiche per aggiornamenti dei dati automatici
}

// Valori di default per le preferenze di notifica
const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  offlineMode: true,
  weatherAlerts: true,
  dataUpdates: false
};

// Chiave per le preferenze di notifica
const NOTIFICATION_PREFS_KEY = 'avo_notification_prefs';

/**
 * Verifica la versione dello stato e inizializza il sistema se necessario
 */
const initAppState = (): void => {
  try {
    const savedVersion = localStorage.getItem(APP_STATE_VERSION);
    
    // Se è la prima installazione o la versione è cambiata, inizializza
    if (!savedVersion || savedVersion !== CURRENT_VERSION) {
      console.log('[APP STATE] Inizializzazione storage con versione', CURRENT_VERSION);
      
      // Preserva la posizione attuale se esiste
      const currentLocation = localStorage.getItem(CURRENT_LOCATION_KEY);
      
      // Reset di tutti i dati, mantenendo solo la posizione
      localStorage.clear();
      
      // Ripristina la posizione se disponibile
      if (currentLocation) {
        localStorage.setItem(CURRENT_LOCATION_KEY, currentLocation);
      }
      
      // Imposta la versione corrente
      localStorage.setItem(APP_STATE_VERSION, CURRENT_VERSION);
    }
    
    // Configura listener per gestire la modalità offline
    setupOfflineDetection();
  } catch (error) {
    console.error('[APP STATE] Errore nell\'inizializzazione:', error);
    logAppError('initAppState', error);
  }
};

/**
 * Configura il rilevamento dello stato offline
 */
const setupOfflineDetection = (): void => {
  // Aggiorna lo stato iniziale
  isOfflineMode = !navigator.onLine;
  
  // Configura i listener per i cambiamenti di connettività
  window.addEventListener('online', () => {
    console.log('[APP STATE] Connessione ripristinata');
    isOfflineMode = false;
    window.dispatchEvent(new CustomEvent('connectivityChanged', { 
      detail: { online: true } 
    }));
  });
  
  window.addEventListener('offline', () => {
    console.log('[APP STATE] Connessione persa, passaggio a modalità offline');
    isOfflineMode = true;
    window.dispatchEvent(new CustomEvent('connectivityChanged', { 
      detail: { online: false } 
    }));
  });
};

/**
 * Controlla se l'app è offline
 */
export const isOffline = (): boolean => isOfflineMode;

/**
 * Ottiene le preferenze correnti per le notifiche
 */
export const getNotificationPreferences = (): NotificationPreferences => {
  try {
    const savedPrefs = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (savedPrefs) {
      return JSON.parse(savedPrefs) as NotificationPreferences;
    }
  } catch (error) {
    console.error('[APP STATE] Errore nel recupero delle preferenze di notifica:', error);
  }
  
  // Se non ci sono preferenze salvate o c'è un errore, usa i valori predefiniti
  return DEFAULT_NOTIFICATION_PREFS;
};

/**
 * Attiva/disattiva una specifica preferenza di notifica
 */
export const toggleNotificationPreference = (key: keyof NotificationPreferences): boolean => {
  try {
    const currentPrefs = getNotificationPreferences();
    currentPrefs[key] = !currentPrefs[key];
    
    // Salva le preferenze aggiornate
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(currentPrefs));
    
    return currentPrefs[key];
  } catch (error) {
    console.error(`[APP STATE] Errore nella modifica della preferenza ${key}:`, error);
    return false;
  }
};

/**
 * Imposta una specifica preferenza di notifica
 */
export const setNotificationPreference = (key: keyof NotificationPreferences, value: boolean): void => {
  try {
    const currentPrefs = getNotificationPreferences();
    currentPrefs[key] = value;
    
    // Salva le preferenze aggiornate
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(currentPrefs));
  } catch (error) {
    console.error(`[APP STATE] Errore nell'impostazione della preferenza ${key}:`, error);
  }
};

/**
 * Salva la posizione corrente in localStorage
 */
export const setCurrentLocation = (location: string): void => {
  try {
    if (!location || typeof location !== 'string' || location.trim() === '') {
      throw createError(ErrorType.VALIDATION, 'Posizione non valida');
    }
    
    localStorage.setItem(CURRENT_LOCATION_KEY, location);
    
    // Dispatch evento personalizzato per notificare i componenti
    window.dispatchEvent(new CustomEvent('locationChanged', { 
      detail: { location } 
    }));
    
    console.log(`[APP STATE] Posizione corrente impostata: ${location}`);
  } catch (error) {
    console.error('[APP STATE] Errore nel salvataggio della posizione:', error);
    logAppError('setCurrentLocation', error);
  }
};

/**
 * Recupera la posizione corrente da localStorage
 */
export const getCurrentLocation = (): string => {
  try {
    const location = localStorage.getItem(CURRENT_LOCATION_KEY);
    return location || '';
  } catch (error) {
    logAppError('getCurrentLocation', error);
    return ''; // Default to empty string on error
  }
};

/**
 * Recupera l'elenco delle posizioni salvate da localStorage.
 * @returns Un array di stringhe con i nomi delle posizioni salvate.
 */
export const getSavedLocations = (): string[] => {
  try {
    const savedLocationsJson = localStorage.getItem(SAVED_LOCATIONS_KEY);
    return savedLocationsJson ? JSON.parse(savedLocationsJson) : [];
  } catch (error) {
    logAppError('getSavedLocations', error);
    return [];
  }
};

/**
 * Controlla se una posizione è già salvata.
 * @param locationName Il nome della posizione da controllare.
 * @returns True se la posizione è salvata, altrimenti false.
 */
export const isLocationSaved = (locationName: string): boolean => {
  const savedLocations = getSavedLocations();
  return savedLocations.some(loc => loc.toLowerCase() === locationName.toLowerCase());
};

/**
 * Aggiunge una posizione all'elenco delle posizioni salvate.
 * Non aggiunge duplicati (case-insensitive) o stringhe vuote.
 * @param locationName Il nome della posizione da aggiungere.
 * @returns True se la posizione è stata aggiunta, false altrimenti (es. duplicato, vuota).
 */
export const addSavedLocation = (locationName: string): boolean => {
  if (!locationName || typeof locationName !== 'string' || locationName.trim() === '') {
    logAppError('addSavedLocation', 'Tentativo di aggiungere una posizione non valida o vuota.');
    return false;
  }
  if (isLocationSaved(locationName)) {
    console.log(`[APP STATE] La posizione "${locationName}" è già salvata.`);
    return false; // Non aggiungere duplicati
  }

  try {
    const savedLocations = getSavedLocations();
    savedLocations.push(locationName.trim());
    localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(savedLocations));
    window.dispatchEvent(new CustomEvent('savedLocationsChanged', { detail: { savedLocations } }));
    console.log(`[APP STATE] Posizione "${locationName}" aggiunta alle salvate.`);
    return true;
  } catch (error) {
    logAppError('addSavedLocation', error);
    return false;
  }
};

/**
 * Rimuove una posizione dall'elenco delle posizioni salvate.
 * @param locationName Il nome della posizione da rimuovere.
 */
export const removeSavedLocation = (locationName: string): void => {
  if (!locationName || typeof locationName !== 'string' || locationName.trim() === '') {
    logAppError('removeSavedLocation', 'Tentativo di rimuovere una posizione non valida o vuota.');
    return;
  }
  try {
    let savedLocations = getSavedLocations();
    const initialLength = savedLocations.length;
    savedLocations = savedLocations.filter(loc => loc.toLowerCase() !== locationName.toLowerCase());
    
    if (savedLocations.length < initialLength) {
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(savedLocations));
      window.dispatchEvent(new CustomEvent('savedLocationsChanged', { detail: { savedLocations } }));
      console.log(`[APP STATE] Posizione "${locationName}" rimossa dalle salvate.`);
    } else {
      console.log(`[APP STATE] Posizione "${locationName}" non trovata nelle salvate per la rimozione.`);
    }
  } catch (error) {
    logAppError('removeSavedLocation', error);
  }
};

/**
 * Salva i dati meteo in cache
 */
export const cacheWeatherData = (data: WeatherData, location: string): void => {
  try {
    // Validazione dei dati
    if (!data || !location) {
      throw createError(ErrorType.VALIDATION, 'Dati meteo o posizione non validi');
    }
    
    // Validazione dei campi obbligatori
    if (typeof data.temperature !== 'number' || typeof data.location !== 'string') {
      throw createError(ErrorType.VALIDATION, 'Formato dati meteo non valido');
    }
    
    const weatherCache: WeatherCache = {
      data,
      location,
      timestamp: Date.now()
    };
    
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherCache));
    console.log(`[APP STATE] Dati meteo in cache per ${location}`);
    
    // Aggiorna il timestamp dell'ultima chiamata API
    updateLastApiCall();
  } catch (error) {
    console.error('[APP STATE] Errore nel salvataggio della cache meteo:', error);
    logAppError('cacheWeatherData', error);
  }
};

/**
 * Recupera i dati meteo dalla cache
 */
export const getCachedWeatherData = (location: string): WeatherData | null => {
  try {
    if (!location) {
      throw createError(ErrorType.VALIDATION, 'Posizione non specificata');
    }
    
    const cacheJson = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cacheJson) return null;
    
    const cache: WeatherCache = JSON.parse(cacheJson);
    
    // Verifica che la posizione sia la stessa
    if (cache.location.toLowerCase() !== location.toLowerCase()) {
      console.log(`[APP STATE] Cache meteo non valida: posizione diversa (cache: ${cache.location}, richiesta: ${location})`);
      return null;
    }
    
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    
    // In modalità online, usa il TTL standard
    if (!isOfflineMode && cacheAge > CACHE_TTL) {
      console.log(`[APP STATE] Cache meteo scaduta per ${location}`);
      return null;
    }
    
    // In modalità offline, usa un TTL esteso
    if (isOfflineMode && cacheAge > EXTENDED_CACHE_TTL) {
      console.log(`[APP STATE] Cache meteo scaduta (anche per modalità offline) per ${location}`);
      return null;
    }
    
    // Avvisa se stiamo usando dati potenzialmente obsoleti in modalità offline
    if (isOfflineMode && cacheAge > CACHE_TTL) {
      console.log(`[APP STATE] Usando dati meteo potenzialmente obsoleti per ${location} (modalità offline)`);
    } else {
      console.log(`[APP STATE] Usando dati meteo in cache per ${location}`);
    }
    
    return cache.data;
  } catch (error) {
    console.error('[APP STATE] Errore nel recupero della cache meteo:', error);
    logAppError('getCachedWeatherData', error);
    return null;
  }
};

/**
 * Salva i dati tendenze in cache
 */
export const cacheTrendsData = (data: WeatherTrend[], location: string): void => {
  try {
    const trendsCache: TrendsCache = {
      data,
      location,
      timestamp: Date.now()
    };
    
    localStorage.setItem(TRENDS_CACHE_KEY, JSON.stringify(trendsCache));
    console.log(`[APP STATE] Dati tendenze in cache per ${location}`);
    
    // Aggiorna il timestamp dell'ultima chiamata API
    updateLastApiCall();
  } catch (error) {
    console.error('[APP STATE] Errore nel salvataggio della cache tendenze:', error);
  }
};

/**
 * Recupera i dati tendenze dalla cache
 */
export const getCachedTrendsData = (location: string): WeatherTrend[] | null => {
  try {
    const cacheJson = localStorage.getItem(TRENDS_CACHE_KEY);
    if (!cacheJson) return null;
    
    const cache: TrendsCache = JSON.parse(cacheJson);
    
    // Verifica che la posizione sia la stessa e che i dati non siano scaduti
    if (cache.location.toLowerCase() !== location.toLowerCase()) {
      console.log(`[APP STATE] Cache tendenze non valida: posizione diversa (cache: ${cache.location}, richiesta: ${location})`);
      return null;
    }
    
    if (Date.now() - cache.timestamp > CACHE_TTL) {
      console.log(`[APP STATE] Cache tendenze scaduta per ${location}`);
      return null;
    }
    
    console.log(`[APP STATE] Usando dati tendenze in cache per ${location}`);
    return cache.data;
  } catch (error) {
    console.error('[APP STATE] Errore nel recupero della cache tendenze:', error);
    return null;
  }
};

/**
 * Aggiorna il timestamp dell'ultima chiamata API
 */
export const updateLastApiCall = (): void => {
  try {
    localStorage.setItem(LAST_API_CALL_KEY, Date.now().toString());
  } catch (error) {
    console.error('[APP STATE] Errore nell\'aggiornamento del timestamp API:', error);
  }
};

/**
 * Verifica se è possibile effettuare una nuova chiamata API
 */
export const canMakeApiCall = (): boolean => {
  // Se siamo offline, non possiamo fare chiamate API
  if (isOfflineMode) {
    console.log('[APP STATE] Impossibile fare chiamate API in modalità offline');
    return false;
  }
  
  try {
    const lastCallStr = localStorage.getItem(LAST_API_CALL_KEY);
    if (!lastCallStr) return true;
    
    const lastCall = parseInt(lastCallStr, 10);
    const timeSinceLastCall = Date.now() - lastCall;
    
    if (timeSinceLastCall < API_CALL_LIMIT) {
      console.log(`[APP STATE] Limite chiamate API: attendi ${Math.ceil((API_CALL_LIMIT - timeSinceLastCall) / 1000)} secondi`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[APP STATE] Errore nel controllo del limite API:', error);
    logAppError('canMakeApiCall', error);
    return false; // In caso di errore, per sicurezza non permettiamo la chiamata
  }
};

/**
 * Forza l'attesa del limite API (per usi avanzati)
 */
export const forceApiCallDelay = async (): Promise<void> => {
  try {
    const lastCallStr = localStorage.getItem(LAST_API_CALL_KEY);
    if (!lastCallStr) return;
    
    const lastCall = parseInt(lastCallStr, 10);
    const timeSinceLastCall = Date.now() - lastCall;
    
    if (timeSinceLastCall < API_CALL_LIMIT) {
      const waitTime = API_CALL_LIMIT - timeSinceLastCall;
      console.log(`[APP STATE] Forzando attesa di ${Math.ceil(waitTime / 1000)} secondi per rispettare limite API`);
      
      // Attendi il tempo necessario
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  } catch (error) {
    console.error('[APP STATE] Errore nell\'attesa forzata:', error);
    logAppError('forceApiCallDelay', error);
  }
};

/**
 * Ascolta i cambiamenti di posizione
 */
export const listenToLocationChanges = (callback: (location: string) => void): () => void => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{location: string}>;
    callback(customEvent.detail.location);
  };
  
  window.addEventListener('locationChanged', handler);
  
  // Funzione per rimuovere l'event listener
  return () => {
    window.removeEventListener('locationChanged', handler);
  };
};

/**
 * Ascolta i cambiamenti di connettività
 */
export const listenToConnectivityChanges = (callback: (online: boolean) => void): () => void => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{online: boolean}>;
    callback(customEvent.detail.online);
  };
  
  window.addEventListener('connectivityChanged', handler);
  
  // Funzione per rimuovere l'event listener
  return () => {
    window.removeEventListener('connectivityChanged', handler);
  };
};

/**
 * Registra un errore dell'applicazione per analisi
 */
// Definizione del tipo per le coordinate geografiche
export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Recupera le coordinate geografiche correnti dell'utente.
 * Supporta browser web, iOS e Android grazie al locationPermissionService.
 * @returns Una Promise che risolve con un oggetto { lat: number, lon: number } o null se le coordinate non possono essere ottenute.
 */
export const getCurrentCoordinates = async (): Promise<Coordinates | null> => {
  try {
    // Importiamo il servizio dinamicamente per evitare dipendenze circolari
    const locationService = await import('./locationPermissionService');
    
    // Usiamo il nuovo servizio che gestisce tutte le piattaforme
    const coordinates = await locationService.getDeviceLocation({
      enableHighAccuracy: true, 
      timeout: 10000, 
      maximumAge: 0
    });
    
    // Log per debug
    if (coordinates) {
      console.log(`[APP STATE] Posizione ottenuta: ${coordinates.lat}, ${coordinates.lon}`);
    } else {
      console.log('[APP STATE] Impossibile ottenere la posizione dell\'utente');
    }
    
    return coordinates;
  } catch (error) {
    logAppError('getCurrentCoordinates', error);
    return null;
  }
};

/**
 * Registra un errore dell'applicazione per analisi
 */
export const logAppError = (source: string, error: any): void => {
  try {
    // Recupera gli errori esistenti o inizializza un nuovo array
    const existingErrorsJson = localStorage.getItem(ERROR_LOG_KEY);
    const errorLog = existingErrorsJson ? JSON.parse(existingErrorsJson) : [];
    
    // Crea una nuova voce di errore
    const errorEntry = {
      timestamp: Date.now(),
      source,
      message: error.message || 'Errore sconosciuto',
      type: error.type || 'UNKNOWN',
      stack: error.stack || null
    };
    
    // Aggiungi l'errore all'inizio del log (più recenti prima)
    errorLog.unshift(errorEntry);
    
    // Limita la dimensione del log
    if (errorLog.length > MAX_ERROR_LOG_SIZE) {
      errorLog.length = MAX_ERROR_LOG_SIZE;
    }
    
    // Salva il log aggiornato
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(errorLog));
  } catch (logError) {
    // In caso di errore nel logging, registra solo in console
    console.error('[APP STATE] Errore nel logging dell\'errore:', logError);
  }
};

/**
 * Recupera il log errori per diagnostica
 */
export const getErrorLog = (): Array<any> => {
  try {
    const errorLogJson = localStorage.getItem(ERROR_LOG_KEY);
    return errorLogJson ? JSON.parse(errorLogJson) : [];
  } catch (error) {
    console.error('[APP STATE] Errore nel recupero del log errori:', error);
    return [];
  }
};

// Inizializza lo stato dell'app
initAppState();
