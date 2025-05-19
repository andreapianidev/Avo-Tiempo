// Weather service to handle API calls to OpenWeather API
import { canMakeApiCall, getCurrentLocation, getCurrentCoordinates, logAppError, isOffline } from './appStateService';
import { createError, ErrorType } from './errorService';
import { getCacheItem, setCacheItem, CacheNamespace } from './cacheService';
import { calculateDistance } from './osmService';
import { API_KEYS, API_BASE_URLS, fetchWithRetry } from './apiConfigService';

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

// Fetch current weather and forecast for a location
export const fetchWeather = async (cityInput?: string): Promise<WeatherData | null> => {
  let city = cityInput;
  if (!city) {
    city = getCurrentLocation(); // Returns city name string
    if (!city) {
      console.log('[WEATHER SERVICE] Nessuna posizione corrente, usando El Paso come fallback');
      city = 'El Paso';
    }
  }

  const cacheKey = `weather_${city.toLowerCase().replace(/\s+/g, '_')}`;
  console.log(`[WEATHER SERVICE] Richiesta meteo per ${city} (cache key: ${cacheKey})`);

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
      console.log(`[WEATHER SERVICE] Cache HIT per ${city}. Tempo valido, Distanza (${currentDistance.toFixed(1)}km) valida.`);
      return cachedWeatherEntry.data;
    } else {
      console.log(`[WEATHER SERVICE] Cache STALE per ${city}. Tempo valido: ${isTimeValid}, Distanza valida: ${isDistanceValid} (${currentDistance.toFixed(1)}km).`);
    }
  }

  // 2. Handle offline state - prefer stale cache over mock data if available
  const isOfflineState = typeof isOffline === 'function' && isOffline();
  if (isOfflineState) {
    if (cachedWeatherEntry) {
      console.log(`[WEATHER SERVICE] Offline: usando dati STALE da cache intelligente per ${city}`);
      return { 
        ...cachedWeatherEntry.data,
         alert: cachedWeatherEntry.data.alert || 'Estás offline. Mostrando últimos datos disponibles.' 
      };
    }
    console.log(`[WEATHER SERVICE] Offline: Nessun dato in cache intelligente. Tentando fallback...`);
    // Fallback to mock if no cache entry when offline, or integrate old appStateService cache if desired
    return getMockWeatherData(city);
  }

  // 3. Check API call limit
  if (!canMakeApiCall()) {
    console.log(`[WEATHER SERVICE] Limite API raggiunto. Tentando cache intelligente STALE o fallback per ${city}`);
    if (cachedWeatherEntry) {
      return { 
        ...cachedWeatherEntry.data,
         alert: cachedWeatherEntry.data.alert || 'Límite API. Mostrando últimos datos disponibles.' 
      };
    }
    logAppError('weatherService', {
      message: 'API rate limit exceeded, no cache available',
      type: ErrorType.API,
      detail: `Rate limit hit while fetching weather for ${city}`
    });
    return getMockWeatherData(city);
  }

  // 4. Perform API call
  try {
    console.log(`[WEATHER SERVICE] Esecuzione chiamata API per ${city}`);
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=es`;
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      logAppError('fetchCurrentWeather', `Error ${response.status}: ${response.statusText}`);
      throw createError(ErrorType.API, `Error ${response.status}: ${response.statusText}`);
    }
    const currentData = await response.json();
    console.log(`[WEATHER SERVICE] Ricevuti dati current per ${city} (${currentData.coord.lat}, ${currentData.coord.lon})`);

    const forecastUrl = `${API_BASE_URLS.OPENWEATHER_CURRENT}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=es`;
    let forecastData;
    try {
      const forecastResponse = await fetchWithRetry(forecastUrl);
      if (!forecastResponse.ok) throw new Error(`Errore nella risposta forecast: ${forecastResponse.status}`);
      forecastData = await forecastResponse.json();
      console.log(`[WEATHER SERVICE] Ricevuti dati forecast per ${city}`);
    } catch (forecastError: any) {
      console.error(`[WEATHER SERVICE] Errore nella chiamata forecast per ${city}: ${forecastError.message}`);
      logAppError('weatherService.fetchWeather.forecast', createError(
        ErrorType.API,
        'Error al obtener la previsión. Mostrando solo datos actuales.',
        { message: forecastError.message, city, endpoint: 'forecast' }
      ));
      // Construct WeatherData with current data and placeholder forecast
      const partialWeatherData: WeatherData = {
        location: currentData.name,
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6),
        condition: mapWeatherCondition(currentData.weather[0].id),
        alert: 'Solo se muestran datos actuales. Previsión no disponible.',
        lat: currentData.coord.lat,
        lon: currentData.coord.lon,
        hourlyForecast: Array(8).fill(null).map((_, i) => ({
          time: i === 0 ? 'Ahora' : `${new Date(Date.now() + i * 3600000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
          temperature: Math.round(currentData.main.temp),
          condition: mapWeatherCondition(currentData.weather[0].id)
        })),
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
      const newEntryForPartialData: WeatherCacheEntry = {
        data: partialWeatherData,
        timestamp: Date.now(),
        latitude: partialWeatherData.lat,
        longitude: partialWeatherData.lon,
      };
      setCacheItem(CacheNamespace.WEATHER_DATA, cacheKey, newEntryForPartialData, WEATHER_CACHE_TTL);
      console.log(`[WEATHER SERVICE] Dati meteo PARZIALI salvati in cache intelligente per ${city}`);
      return partialWeatherData;
    }

    const hourlyForecast = forecastData.list.slice(0, 8).map((item: any) => ({
      time: formatTime(item.dt),
      temperature: Math.round(item.main.temp),
      condition: mapWeatherCondition(item.weather[0].id)
    }));
    if (hourlyForecast.length > 0) hourlyForecast[0].time = 'Ahora';

    let alertMsg = undefined;
    if (currentData.alerts && currentData.alerts.length > 0) { // Prefer alerts from current weather if available
      alertMsg = currentData.alerts[0].description;
    } else if (forecastData.city && forecastData.city.alerts && forecastData.city.alerts.length > 0) { // OpenWeather puts alerts in forecast's city object sometimes
        alertMsg = forecastData.city.alerts[0].description;
    } else if (Array.isArray(forecastData.alerts) && forecastData.alerts.length > 0) { // check root alerts on forecast (less common)
        alertMsg = forecastData.alerts[0].description;
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

    const newEntry: WeatherCacheEntry = {
      data: fullWeatherData,
      timestamp: Date.now(),
      latitude: fullWeatherData.lat,
      longitude: fullWeatherData.lon,
    };
    setCacheItem(CacheNamespace.WEATHER_DATA, cacheKey, newEntry, WEATHER_CACHE_TTL);
    console.log(`[WEATHER SERVICE] Dati meteo COMPLETI salvati in cache intelligente per ${city}`);
    return fullWeatherData;

  } catch (error: any) {
    console.error(`[WEATHER SERVICE] Errore CRITICO nel recupero dati meteo per ${city}:`, error.message);
    logAppError('weatherService.fetchWeather.critical', error.type ? error : createError(ErrorType.UNKNOWN, error.message, error, city));

    if (cachedWeatherEntry) {
      console.log(`[WEATHER SERVICE] Errore API: usando dati STALE da cache intelligente come fallback per ${city}`);
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
