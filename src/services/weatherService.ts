// Weather service to handle API calls to OpenWeather API
import { canMakeApiCall, getCurrentLocation, getCurrentCoordinates, logAppError, isOffline } from './appStateService';
import { createError, ErrorType } from './errorService';
import { getCacheItem, setCacheItem, CacheNamespace } from './cacheService';
import { calculateDistance } from './osmService';
import { API_KEYS, API_BASE_URLS, fetchWithRetry } from './apiConfigService';
import { redact, logInfo, logWarning, logError } from '../utils/logger';
import { AemetArea, aemetService } from './aemetService';

// --- patch: abbiamo rimosso la gestione dei piani e usiamo solo API Free
// Per futuri riferimenti: OpenWeather offre piani 'free' e 'pro' con API diverse

// --- patch: mappa per tenere traccia delle richieste in corso
const pendingRequests: Map<string, Promise<any>> = new Map();

// Utilizziamo il servizio centralizzato per la configurazione API
const API_KEY = API_KEYS.OPENWEATHER;
const BASE_URL = API_BASE_URLS.OPENWEATHER_CURRENT;

const WEATHER_CACHE_TTL = 20 * 60 * 1000; // 20 minutes in milliseconds
const SIGNIFICANT_DISTANCE_KM = 10; // 10 km

// Formato dell'interfaccia dei dati meteo
export interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  alert?: string;
  lat: number;  // Latitude for map and POI features
  lon: number;  // Longitude for map and POI features
  pressure?: number;
  visibility?: number;
  sunrise?: number;
  sunset?: number;
  windDirection?: number;
  windGust?: number;
  clouds?: number;
  uvIndex?: number;
  rain1h?: number;
  snow1h?: number;
  airQuality?: {
    value: number;      // AQI value
    category: string;   // Description (Good, Moderate, etc)
    pm25?: number;      // PM2.5 value
    pm10?: number;      // PM10 value
    o3?: number;        // Ozone value
    no2?: number;       // Nitrogen dioxide value
    so2?: number;       // Sulfur dioxide value
    co?: number;        // Carbon monoxide value
    pollen?: number;    // Pollen count if available
  };
  hourlyForecast: {
    time: string;
    temperature: number;
    condition: string;
  }[];
}

interface WeatherCacheEntry {
  data: WeatherData;
  timestamp: number;
  latitude: number;
  longitude: number;
}

// Convert OpenWeather condition codes to our simplified conditions
const mapWeatherCondition = (conditionCode: number): string => {
  if (conditionCode >= 200 && conditionCode < 300) return 'thunderstorm';
  if (conditionCode >= 300 && conditionCode < 400) return 'drizzle';
  if (conditionCode >= 500 && conditionCode < 600) return 'rain';
  if (conditionCode >= 600 && conditionCode < 700) return 'snow';
  if (conditionCode >= 700 && conditionCode < 800) return 'mist';
  if (conditionCode === 800) return 'clear';
  if (conditionCode > 800) return 'cloudy';
  return 'clear'; // default
};

// Format time from timestamp
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

// --- patch: wrapper unificato per ottenere i dati meteo da diverse API
/**
 * Unified wrapper to get weather data from different sources based on subscription plan
 */
export const getWeatherData = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  // Creiamo una chiave per identificare questa richiesta
  const requestKey = `weather_${city.toLowerCase()}_${countryCode || ''}`;
  
  // --- patch: controlla se è già in corso una richiesta per questa città
  if (pendingRequests.has(requestKey)) {
    logInfo('WEATHER', `Riutilizzo richiesta esistente per ${city}`);
    return pendingRequests.get(requestKey);
  }
  
  try {
    const weatherPromise = fetchWeatherData(city, countryCode);
    pendingRequests.set(requestKey, weatherPromise);
    
    const result = await weatherPromise;
    return result;
  } catch (error) {
    throw error;
  } finally {
    // Rimuovi la richiesta pendente dalla mappa dopo che è completata
    pendingRequests.delete(requestKey);
  }
};

/**
 * Fetch weather data using the free OpenWeather API
 */
const fetchWeatherData = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  try {
    logInfo('WEATHER', `Utilizzo API standard (Free plan) per ${city}`);
    const result = await fetchFreeWeather(city, countryCode);
    logInfo('WEATHER', `Dati meteo recuperati con successo per ${city}`);
    return result;
  } catch (error) {
    logError('WEATHER', `Errore nel recupero dati meteo: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

// Fetch current weather and forecast for a location
export const fetchWeather = async (cityInput?: string, countryCode?: string): Promise<WeatherData | null> => {
  let city = cityInput;
  if (!city) {
    city = getCurrentLocation(); // Returns city name string
    if (!city) {
      logInfo('WEATHER', 'Nessuna posizione corrente, usando El Paso come fallback');
      city = 'El Paso';
    }
  }

  const cacheKey = `weather_${city.toLowerCase().replace(/\s+/g, '_')}`;
  logInfo('WEATHER', `Richiesta meteo per ${city} (cache key: ${cacheKey})`);

  // 1. Check intelligent cache first
  const cachedWeatherEntry = getCacheItem<WeatherCacheEntry>(CacheNamespace.WEATHER_DATA, cacheKey);

  if (cachedWeatherEntry) {
    const isTimeValid = (Date.now() - cachedWeatherEntry.timestamp) < WEATHER_CACHE_TTL;
    let isDistanceValid = true;
    let currentDistance = 0;

    let currentUserCoords = typeof getCurrentCoordinates === 'function' ? await getCurrentCoordinates() : null;
    if (currentUserCoords) {
      currentDistance = calculateDistance(
        currentUserCoords.lat,
        currentUserCoords.lon,
        cachedWeatherEntry.latitude,
        cachedWeatherEntry.longitude
      ) / 1000; // Convert to km
      isDistanceValid = currentDistance <= SIGNIFICANT_DISTANCE_KM;
    }

    if (isTimeValid && isDistanceValid) {
      logInfo('WEATHER', `Cache HIT per ${city} (age: ${Math.round((Date.now() - cachedWeatherEntry.timestamp) / 1000)}s, distance: ${Math.round(currentDistance)}km)`);
      return cachedWeatherEntry.data;
    } else {
      logInfo('WEATHER', `Cache EXPIRED per ${city} (age: ${Math.round((Date.now() - cachedWeatherEntry.timestamp) / 1000)}s, distance: ${Math.round(currentDistance)}km)`);
    }
  } else {
    logInfo('WEATHER', `Cache MISS per ${city}`);
  }

  // 2. If no valid cache, check if we are offline/network limited
  if (isOffline()) {
    logInfo('WEATHER', `Offline mode - usando cache stale o mock data`);
    
    if (cachedWeatherEntry) {
      // Se c'è una cache (anche se scaduta) usiamola ma segnaliamo che è stale
      return { 
        ...cachedWeatherEntry.data, 
        alert: 'Offline mode. Showing cached data.' 
      };
    }
    
    // Fornisci dati mock se non c'è cache disponibile
    return getMockWeatherData(city);
  }
  
  // 3. Check API call limits
  if (!canMakeApiCall()) {
    logInfo('WEATHER', `API rate limit reached - usando cache stale o mock data`);
    
    if (cachedWeatherEntry) {
      return { 
        ...cachedWeatherEntry.data, 
        alert: 'API limit reached. Showing cached data.' 
      };
    }
    
    return getMockWeatherData(city);
  }
  
  // 4. If we get here, proceed with API call
  try {
    logInfo('WEATHER', `Fetching fresh data from API for ${city}`);
    
    // --- patch: utilizziamo il nuovo wrapper per ottenere i dati meteo
    const weatherData = await getWeatherData(city, countryCode);
    return weatherData;
  } catch (error: any) {
    logError('WEATHER', `Errore CRITICO nel recupero dati meteo per ${city}: ${error.message}`);
    logAppError('weatherService.fetchWeather.critical', error.type ? error : createError(ErrorType.UNKNOWN, error.message, error, city));

    if (cachedWeatherEntry) {
      logWarning('WEATHER', `Errore API: usando dati STALE da cache intelligente come fallback per ${city}`);
      return { 
        ...cachedWeatherEntry.data, 
        alert: cachedWeatherEntry.data.alert || 'Errore API. Mostrando últimos datos disponibles.' 
      };
    }
    
    const mockData = getMockWeatherData(city);
    mockData.alert = 'No se pudieron obtener datos meteorológicos. Mostrando datos de ejemplo.';
    return mockData;
  }
};

// --- NOTA: Questa funzione è stata rimossa in quanto utilizza l'API OneCall che richiede un piano Pro di OpenWeather
// Per riferimento futuro, implementazione dell'API OneCall 3.0 per utenti con piano Pro
/*
const fetchOneCallWeather = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  // Prima ottenere coordinate dalla città tramite geocoding API
  // Poi chiamare OneCall API: https://api.openweathermap.org/data/3.0/onecall
  // Gestire la risposta e formattare i dati secondo l'interfaccia WeatherData
  // Include previsioni orarie e gestione allerte meteo
};
*/

// --- patch: implementazione per utenti con piano Free
const fetchFreeWeather = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  try {
    // Costruisci l'URL con il codice paese se disponibile
    const locationQuery = countryCode ? `${city},${countryCode}` : city;
    
    logInfo('WEATHER', `Chiamata OpenWeather Free API per ${locationQuery}`);
    
    // 1. Prima chiamata per ottenere coordinate e dati meteo
    const currentUrl = `${BASE_URL}/weather?q=${locationQuery}&units=metric&appid=${API_KEY}`;
    logInfo('WEATHER', `Current weather API call: ${redact(currentUrl)}`);
    const currentResponse = await fetchWithRetry(currentUrl);
    
    if (!currentResponse.ok) {
      throw createError(
        ErrorType.API, 
        `Weather API error: ${currentResponse.status}`, 
        new Error(currentResponse.statusText)
      );
    }
    
    const currentData = await currentResponse.json();
    logInfo('WEATHER', `Dati meteo correnti ricevuti per ${locationQuery}: ${JSON.stringify(currentData).substring(0, 200)}...`);
    
    // Otteniamo la previsione oraria da OpenWeather
    const forecastUrl = `${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`;
    logInfo('WEATHER', `Forecast API call: ${redact(forecastUrl)}`);
    const forecastResponse = await fetchWithRetry(forecastUrl);
    
    if (!forecastResponse.ok) {
      throw createError(
        ErrorType.API, 
        `Forecast API error: ${forecastResponse.status}`, 
        new Error(forecastResponse.statusText)
      );
    }
    
    const forecastData = await forecastResponse.json();
    logInfo('WEATHER', `Dati previsione ricevuti per ${locationQuery}: ${JSON.stringify(forecastData.list?.[0] || {}).substring(0, 200)}...`);
    
    // Estrai le previsioni orarie
    const hourlyForecast = forecastData.list.slice(0, 8).map((item: any) => ({
      time: formatTime(item.dt),
      temperature: Math.round(item.main.temp),
      condition: mapWeatherCondition(item.weather[0].id)
    }));
    
    // --- patch: Ottieni dati di allerta dalla API di alerts
    let alertMsg = '';
    
    // --- patch: Ottieni dati di allerta AEMET solo se il paese è la Spagna
    if (currentData.sys?.country === 'ES' || countryCode === 'ES') {
      try {
        // Utilizza il servizio AEMET parametrizzato per ottenere gli avvisi meteo
        // Questo utilizzerà automaticamente determineAemetArea internamente
        const aemetAlerts = await aemetService.getWeatherAlerts(
          currentData.coord.lat, 
          currentData.coord.lon
        );
        
        if (aemetAlerts.length > 0) {
          // Prendiamo il primo avviso disponibile
          alertMsg = aemetAlerts[0].description || 'Alerta meteorológica activa';
          logInfo('WEATHER', `Recuperato avviso AEMET: ${alertMsg.substring(0, 100)}...`);
        } else {
          logInfo('WEATHER', `Nessun avviso AEMET attivo per le coordinate [${currentData.coord.lat}, ${currentData.coord.lon}]`);
        }
      } catch (aemetError) {
        logError('WEATHER', `Errore nel recupero allerta AEMET: ${aemetError instanceof Error ? aemetError.message : String(aemetError)}`);
      }
    }
    
    // Se non abbiamo allerta da AEMET, prova a prenderla dalle altre API
    if (!alertMsg) {
      // Ottieni eventuali dati di allerta dalla città
      // A volte disponibili in città, a volte in forecast
      if (currentData.alerts && currentData.alerts.length > 0) {
          alertMsg = currentData.alerts[0].description;
      } else if (forecastData.city && forecastData.city.alerts && forecastData.city.alerts.length > 0) { // check city property on forecast
          alertMsg = forecastData.city.alerts[0].description;
      } else if (Array.isArray(forecastData.alerts) && forecastData.alerts.length > 0) { // check root alerts on forecast (less common)
          alertMsg = forecastData.alerts[0].description;
      }
    }

    const fullWeatherData: WeatherData = {
      location: currentData.name,
      temperature: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed * 3.6),
      condition: mapWeatherCondition(currentData.weather[0].id),
      alert: alertMsg,
      lat: currentData.coord.lat,
      lon: currentData.coord.lon,
      hourlyForecast,
      pressure: currentData.main.pressure,
      visibility: currentData.visibility ? Math.round(currentData.visibility / 1000) : undefined,
      sunrise: currentData.sys?.sunrise,
      sunset: currentData.sys?.sunset,
      windDirection: currentData.wind?.deg,
      windGust: currentData.wind?.gust ? Math.round(currentData.wind.gust * 3.6) : undefined,
      clouds: currentData.clouds?.all,
      rain1h: currentData.rain?.['1h'],
      snow1h: currentData.snow?.['1h']
    };

    const cacheKey = `weather_${city.toLowerCase().replace(/\s+/g, '_')}`;
    const newEntry: WeatherCacheEntry = {
      data: fullWeatherData,
      timestamp: Date.now(),
      latitude: fullWeatherData.lat,
      longitude: fullWeatherData.lon,
    };
    setCacheItem(CacheNamespace.WEATHER_DATA, cacheKey, newEntry, WEATHER_CACHE_TTL);
    logInfo('WEATHER', `Dati meteo COMPLETI salvati in cache intelligente per ${city}`);
    return fullWeatherData;
  } catch (error) {
    logError('WEATHER', `Errore nel recupero dati Free tier: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

// For demo/fallback purposes
export const getMockWeatherData = (city: string): WeatherData => {
  // Provide default lat/lon for mock data if needed by other services
  const defaultCoords: { [key: string]: { lat: number; lon: number } } = {
    'el paso': { lat: 28.6586, lon: -17.7797 }, // El Paso, La Palma
    'los llanos de aridane': { lat: 28.6584, lon: -17.9147 },
    'santa cruz de la palma': { lat: 28.6835, lon: -17.7642 },
  };
  const cityKey = city.toLowerCase();
  const coords = defaultCoords[cityKey] || { lat: 28.6, lon: -17.8 }; // Generic La Palma coords

  // Genera temperature realistiche basate su data e ora attuali
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const hour = now.getHours(); // 0-23
  
  // Temperatura base per stagione nelle Canarie
  let baseTemp = 22; // primavera/autunno
  if (month >= 5 && month <= 8) { // estate (giugno-settembre)
    baseTemp = 26;
  } else if (month >= 9 || month <= 2) { // inverno (ottobre-marzo)
    baseTemp = 20;
  }
  
  // Variazione per ora del giorno
  let hourVariation = 0;
  if (hour >= 12 && hour <= 15) { // ore più calde
    hourVariation = 3;
  } else if (hour >= 0 && hour <= 6) { // notte
    hourVariation = -3;
  }
  
  // Piccola variazione casuale ±1
  const randomVariation = Math.floor(Math.random() * 3) - 1;
  
  // Calcola temperatura realistica
  const temp = Math.round(baseTemp + hourVariation + randomVariation);
  
  return {
    location: city,
    temperature: temp,
    feelsLike: temp + 1,
    humidity: 65,
    windSpeed: 15 + Math.floor(Math.random() * 10),
    condition: hour >= 6 && hour <= 18 ? 'sunny' : 'clear',
    alert: '📊 [DATOS SIMULADOS] No se pudieron obtener datos meteorológicos actuales.',
    lat: coords.lat,
    lon: coords.lon,
    pressure: 1013,
    visibility: 10,
    sunrise: Math.floor(Date.now() / 1000) - 25200,
    sunset: Math.floor(Date.now() / 1000) + 18000,
    windDirection: 245,
    windGust: 35,
    clouds: 20,
    uvIndex: 7,
    hourlyForecast: [
      { time: 'Ahora', temperature: 24, condition: 'sunny' },
      { time: '14:00', temperature: 25, condition: 'sunny' },
      { time: '15:00', temperature: 25, condition: 'sunny' },
      { time: '16:00', temperature: 24, condition: 'partly cloudy' },
      { time: '17:00', temperature: 23, condition: 'partly cloudy' },
      { time: '18:00', temperature: 22, condition: 'partly cloudy' },
      { time: '19:00', temperature: 21, condition: 'cloudy' },
      { time: '20:00', temperature: 20, condition: 'cloudy' },
    ]
  };
};
