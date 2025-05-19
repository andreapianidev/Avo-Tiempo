// Weather service to handle API calls to OpenWeather API
import { canMakeApiCall, getCurrentLocation, getCurrentCoordinates, logAppError, isOffline } from './appStateService';
import { createError, ErrorType } from './errorService';
import { getCacheItem, setCacheItem, CacheNamespace } from './cacheService';
import { calculateDistance } from './osmService';
import { API_KEYS, API_BASE_URLS, fetchWithRetry } from './apiConfigService';
import { redact, logInfo, logWarning, logError } from '../utils/logger';

// --- patch: configurazione per diversi piani di OpenWeather
type OpenWeatherPlan = 'free' | 'pro';
const OPENWEATHER_PLAN: OpenWeatherPlan = process.env.OPENWEATHER_PLAN as OpenWeatherPlan || 'free';

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
 * Fetch weather data from the appropriate API based on the subscription plan
 */
const fetchWeatherData = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  try {
    if (OPENWEATHER_PLAN === 'pro') {
      // --- patch: per utenti Pro, utilizza One Call 3.0
      return await fetchOneCallWeather(city, countryCode);
    } else {
      // --- patch: per utenti Free, usa la combinazione di API gratuite
      return await fetchFreeWeather(city, countryCode);
    }
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

// --- patch: implementazione per utenti con piano Pro
const fetchOneCallWeather = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  try {
    // Prima dobbiamo ottenere le coordinate dalla città
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
    logInfo('WEATHER', `Geocoding API call: ${redact(geoUrl)}`);
    
    const geoResponse = await fetchWithRetry(geoUrl);
    if (!geoResponse.ok) {
      throw createError(ErrorType.API, `Geocoding API error: ${geoResponse.status}`, new Error(geoResponse.statusText));
    }
    
    const geoData = await geoResponse.json();
    if (!geoData || geoData.length === 0) {
      throw createError(ErrorType.API, 'Location not found', new Error('No location data returned from geocoding API'));
    }
    
    const { lat, lon, country } = geoData[0];
    
    // Otteniamo i dati meteo da One Call 3.0
    const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    logInfo('WEATHER', `One Call API call: ${redact(oneCallUrl)}`);
    
    const oneCallResponse = await fetchWithRetry(oneCallUrl);
    if (!oneCallResponse.ok) {
      throw createError(ErrorType.API, `One Call API error: ${oneCallResponse.status}`, new Error(oneCallResponse.statusText));
    }
    
    const oneCallData = await oneCallResponse.json();
    
    // --- patch: Ottieni dati di allerta AEMET solo se il paese è la Spagna
    let alertMsg = '';
    if (country === 'ES' || countryCode === 'ES') {
      try {
        const aemetUrl = 'https://opendata.aemet.es/opendata/api/avisos/active/area/63';
        logInfo('WEATHER', `AEMET warnings call: ${redact(aemetUrl)}`);
        const aemetResponse = await fetchWithRetry(aemetUrl);
        
        if (aemetResponse.ok) {
          const aemetData = await aemetResponse.json();
          if (aemetData && aemetData.length > 0) {
            alertMsg = aemetData[0].description || 'Alerta meteorológica activa';
          }
        }
      } catch (aemetError) {
        logError('WEATHER', `Errore nel recupero allerta AEMET: ${aemetError instanceof Error ? aemetError.message : String(aemetError)}`);
      }
    }
    
    // Mappiamo i dati alla nostra struttura
    const current = oneCallData.current;
    const hourlyForecast = oneCallData.hourly.slice(0, 8).map((hour: any) => ({
      time: formatTime(hour.dt),
      temperature: Math.round(hour.temp),
      condition: mapWeatherCondition(hour.weather[0].id)
    }));
    
    // Prendi l'allerta da One Call se non l'abbiamo da AEMET
    if (!alertMsg && oneCallData.alerts && oneCallData.alerts.length > 0) {
      alertMsg = oneCallData.alerts[0].description;
    }
    
    const fullWeatherData: WeatherData = {
      location: city,
      temperature: Math.round(current.temp),
      feelsLike: Math.round(current.feels_like),
      humidity: current.humidity,
      windSpeed: Math.round(current.wind_speed * 3.6),
      condition: mapWeatherCondition(current.weather[0].id),
      alert: alertMsg,
      lat,
      lon,
      hourlyForecast,
      pressure: current.pressure,
      visibility: current.visibility ? Math.round(current.visibility / 1000) : undefined,
      sunrise: current.sunrise,
      sunset: current.sunset,
      windDirection: current.wind_deg,
      windGust: current.wind_gust ? Math.round(current.wind_gust * 3.6) : undefined,
      clouds: current.clouds,
      uvIndex: current.uvi
    };
    
    const cacheKey = `weather_${city.toLowerCase().replace(/\s+/g, '_')}`;
    const newEntry: WeatherCacheEntry = {
      data: fullWeatherData,
      timestamp: Date.now(),
      latitude: lat,
      longitude: lon,
    };
    setCacheItem(CacheNamespace.WEATHER_DATA, cacheKey, newEntry, WEATHER_CACHE_TTL);
    logInfo('WEATHER', `Dati meteo da One Call salvati in cache per ${city}`);
    
    return fullWeatherData;
  } catch (error) {
    logError('WEATHER', `Errore nel recupero dati One Call: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};

// --- patch: implementazione per utenti con piano Free
const fetchFreeWeather = async (city: string, countryCode?: string): Promise<WeatherData | null> => {
  try {
    // Otteniamo i dati meteo correnti
    const currentUrl = `${BASE_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`;
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
        const aemetUrl = 'https://opendata.aemet.es/opendata/api/avisos/active/area/63';
        logInfo('WEATHER', `AEMET warnings call: ${redact(aemetUrl)}`);
        const aemetResponse = await fetchWithRetry(aemetUrl);
        
        if (aemetResponse.ok) {
          const aemetData = await aemetResponse.json();
          if (aemetData && aemetData.length > 0) {
            alertMsg = aemetData[0].description || 'Alerta meteorológica activa';
          }
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

  return {
    location: city,
    temperature: 24,
    feelsLike: 26,
    humidity: 65,
    windSpeed: 28,
    condition: 'sunny',
    alert: 'Calima moderada durante las próximas 24 horas.',
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
