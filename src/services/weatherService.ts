// Weather service to handle API calls to OpenWeather API
import { getCachedWeatherData, cacheWeatherData, canMakeApiCall, getCurrentLocation, logAppError, isOffline } from './appStateService';
import { createError, ErrorType } from './errorService';

const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || 'b33c9835879f888134e97c6d58d6e4a7';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';



// Convert OpenWeather condition codes to our simplified conditions
const mapWeatherCondition = (conditionCode: number): string => {
  // Weather condition codes: https://openweathermap.org/weather-conditions
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
  // Dati aggiuntivi
  pressure?: number;        // Pressione atmosferica in hPa
  visibility?: number;      // Visibilità in km
  sunrise?: number;         // Orario alba (timestamp)
  sunset?: number;          // Orario tramonto (timestamp)
  windDirection?: number;   // Direzione del vento in gradi
  windGust?: number;        // Raffiche di vento in km/h
  clouds?: number;          // Nuvolosità in percentuale
  uvIndex?: number;         // Indice UV
  rain1h?: number;          // Precipitazioni ultima ora in mm
  snow1h?: number;          // Neve ultima ora in mm
  // Previsione oraria
  hourlyForecast: {
    time: string;
    temperature: number;
    condition: string;
  }[];
}

// Fetch current weather and forecast for a location
export const fetchWeather = async (city?: string): Promise<WeatherData | null> => {
  // Se non viene specificata una città, usa la posizione corrente dell'utente
  if (!city) {
    city = getCurrentLocation();
    // Se non c'è una posizione corrente, usa un valore di fallback
    if (!city) {
      console.log('[WEATHER SERVICE] Nessuna posizione corrente, usando El Paso come fallback');
      city = 'El Paso';
    }
  }
  
  console.log(`[WEATHER SERVICE] Richiesta meteo per ${city}`);
  
  // Logica della cache commentata per forzare l'uso delle API
  // Controlla se abbiamo dati in cache validi (solo quando si è offline)
  const isOfflineState = typeof isOffline === 'function' && isOffline();
  
  console.log(`[WEATHER SERVICE] Stato offline: ${isOfflineState}`);
  console.log(`[WEATHER SERVICE] Forzando chiamata alle API per ${city}`);
  
  // Utilizziamo la cache solo se siamo veramente offline
  if (isOfflineState) {
    const cachedData = getCachedWeatherData(city);
    if (cachedData) {
      console.log(`[WEATHER SERVICE] Offline: usando dati persistenti in cache per ${city}`);
      // Ensure cached data has lat and lon properties
      if (!cachedData.lat || !cachedData.lon) {
        cachedData.lat = 28.6; // Default latitude for El Paso, La Palma
        cachedData.lon = -17.8; // Default longitude for El Paso, La Palma
      }
      return cachedData;
    }
  }
  
  // Verifica se è possibile effettuare una chiamata API
  if (!canMakeApiCall()) {
    console.log(`[WEATHER SERVICE] Limite globale API raggiunto, usando dati fallback per ${city}`);
    // Log l'errore e restituisci dati mock
    logAppError('weatherService', {
      message: 'API rate limit exceeded',
      type: ErrorType.API,
      detail: `Rate limit hit while fetching weather for ${city}`
    });
    return getMockWeatherData(city);
  }
  
  try {
    console.log(`[WEATHER SERVICE] Esecuzione chiamata API per ${city}`);
    
    // First, get current weather
    const currentUrl = `${BASE_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`;
    console.log(`[WEATHER SERVICE] Chiamata API current: ${currentUrl}`);
    
    const currentResponse = await fetch(currentUrl);
    
    if (!currentResponse.ok) {
      // Gestione specifica degli errori HTTP
      const statusCode = currentResponse.status;
      let errorMsg = 'Error desconocido al obtener datos meteorológicos';
      let errorType = ErrorType.API;
      
      if (statusCode === 404) {
        errorMsg = `No se pudo encontrar la ubicación '${city}'`;
        errorType = ErrorType.LOCATION;
      } else if (statusCode === 401 || statusCode === 403) {
        errorMsg = 'Acceso denegado al servicio meteorológico';
        errorType = ErrorType.API;
      } else if (statusCode >= 500) {
        errorMsg = 'El servicio meteorológico no está disponible';
        errorType = ErrorType.API;
      } else if (statusCode === 429) {
        errorMsg = 'Demasiadas solicitudes al servicio meteorológico';
        errorType = ErrorType.API;
      }
      
      throw createError(
        errorType,
        errorMsg, 
        { statusCode, endpoint: 'current weather' }
      );
    }
    
    console.log(`[WEATHER SERVICE] Risposta ricevuta per ${city}`);
    const currentData = await currentResponse.json();
    console.log(`[WEATHER SERVICE] Ricevuti dati current per ${city}`);
    
    // Then get forecast
    const forecastUrl = `${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`;
    console.log(`[WEATHER SERVICE] Chiamata API forecast: ${forecastUrl}`);
    
    let forecastResponse;
    let forecastData;
    
    try {
      forecastResponse = await fetch(forecastUrl);
      
      if (!forecastResponse.ok) {
        throw new Error(`Errore nella risposta forecast: ${forecastResponse.status}`);
      }
      
      forecastData = await forecastResponse.json();
      console.log(`[WEATHER SERVICE] Ricevuti dati forecast per ${city}`);
    } catch (networkError: any) {
      // Gestiamo l'errore ma continuiamo con i dati attuali
      console.error(`[WEATHER SERVICE] Errore nella chiamata forecast: ${networkError.message || 'Unknown error'}`);
      
      logAppError('weatherService', createError(
        ErrorType.API,
        'Error al obtener la previsión. Mostrando solo datos actuales.',
        { message: networkError.message || 'Unknown forecast error', endpoint: 'forecast' }
      ));
      
      // Creiamo un forecast reale basato sui dati attuali
      const weatherData = {
        location: currentData.name,
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
        condition: mapWeatherCondition(currentData.weather[0].id),
        alert: 'Solo se muestran datos actuales. Previsión no disponible.',
        lat: currentData.coord.lat,
        lon: currentData.coord.lon,
        hourlyForecast: Array(8).fill(null).map((_, i) => ({
          time: i === 0 ? 'Ahora' : `${new Date().getHours() + i}:00`,
          temperature: Math.round(currentData.main.temp),
          condition: mapWeatherCondition(currentData.weather[0].id)
        })),
        // Aggiunta dati aggiuntivi dai dati attuali
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
      
      // Cache these limited data
      cacheWeatherData(weatherData, city);
      return weatherData;
    }
    
    // Se siamo qui, abbiamo ottenuto con successo i dati della previsione
    // Map the hourly forecast for the next 24 hours
    const hourlyForecast = forecastData.list.slice(0, 8).map((item: any) => ({
      time: formatTime(item.dt),
      temperature: Math.round(item.main.temp),
      condition: mapWeatherCondition(item.weather[0].id)
    }));
    
    // Add 'Ahora' for the first item
    hourlyForecast[0].time = 'Ahora';
    
    // Check if there are any alerts
    let alert = undefined;
    if (forecastData.alerts && forecastData.alerts.length > 0) {
      alert = forecastData.alerts[0].description;
    }
    
    const weatherData = {
      location: currentData.name,
      temperature: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      condition: mapWeatherCondition(currentData.weather[0].id),
      alert,
      lat: currentData.coord.lat,
      lon: currentData.coord.lon,
      hourlyForecast,
      // Dati aggiuntivi
      pressure: currentData.main.pressure,
      visibility: currentData.visibility ? Math.round(currentData.visibility / 1000) : undefined, // Converti da m a km
      sunrise: currentData.sys?.sunrise,
      sunset: currentData.sys?.sunset,
      windDirection: currentData.wind?.deg,
      windGust: currentData.wind?.gust ? Math.round(currentData.wind.gust * 3.6) : undefined, // Converti da m/s a km/h
      clouds: currentData.clouds?.all,
      rain1h: currentData.rain?.['1h'],
      snow1h: currentData.snow?.['1h']
    };
    
    // Salvataggio in cache persistente
    cacheWeatherData(weatherData, city);
    
    console.log(`[WEATHER SERVICE] Dati meteo completi salvati in cache per ${city}`);
    return weatherData;
  } catch (error: any) {
    console.error(`[WEATHER SERVICE] Errore critico nel recupero dati meteo per ${city}:`, error);
    
    // Log dell'errore per analisi
    logAppError('weatherService.fetchWeather', error);
    
    // In caso di errore, proviamo a recuperare dati precedentemente salvati
    const cachedData = getCachedWeatherData(city);
    if (cachedData) {
      console.log(`[WEATHER SERVICE] Errore API: usando dati in cache come fallback per ${city}`);
      // Aggiorniamo il campo alert per informare l'utente
      // Ensure cached data has lat and lon properties
      if (!cachedData.lat || !cachedData.lon) {
        cachedData.lat = 28.6; // Default latitude for El Paso, La Palma
        cachedData.lon = -17.8; // Default longitude for El Paso, La Palma
      }
      
      return {
        ...cachedData,
        alert: cachedData.alert || 'Mostrando datos anteriores. No se pudieron obtener datos actualizados.'
      };
    }
    
    // Se non abbiamo dati in cache, usiamo i dati di fallback
    const mockData = getMockWeatherData(city);
    // Aggiorniamo l'alert per informare l'utente
    mockData.alert = 'No se pudieron obtener datos meteorológicos reales. Mostrando datos de ejemplo.';
    
    // Se l'errore ha un tipo specifico, lo propaghiamo affinché il componente possa mostrarelo
    if (error.type) {
      throw error; // Propaghiamo l'errore originale già formattato
    } else {
      // Altrimenti creiamo un errore standardizzato
      throw createError(
        ErrorType.NETWORK,
        'No se pudieron obtener datos meteorológicos',
        error,
        'Comprueba tu conexión a internet e inténtalo de nuevo'
      );
    }
  }
};

// For demo/fallback purposes
export const getMockWeatherData = (city: string): WeatherData => {
  return {
    location: city,
    temperature: 24,
    feelsLike: 26,
    humidity: 65,
    windSpeed: 28,
    condition: 'sunny',
    alert: 'Calima moderada durante las próximas 24 horas.',
    lat: 28.6, // Default latitude for El Paso, La Palma
    lon: -17.8, // Default longitude for El Paso, La Palma,
    // Dati meteo aggiuntivi di esempio
    pressure: 1013,
    visibility: 10,
    sunrise: Math.floor(Date.now() / 1000) - 25200, // 7 ore fa
    sunset: Math.floor(Date.now() / 1000) + 18000,  // 5 ore nel futuro
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
