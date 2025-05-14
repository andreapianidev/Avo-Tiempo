import { handleApiError, handleNetworkError, ErrorType, createError, logError } from './errorService';
import { getCurrentCity } from './geolocationService';
import { getCachedTrendsData, cacheTrendsData, canMakeApiCall, getCurrentLocation } from './appStateService';

export interface WeatherTrend {
  day: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  precipitation: number;
}

export interface TrendSummary {
  summary: string;
  averageMaxTemp: number;
  averageMinTemp: number;
  dominantCondition: string;
  rainDays: number;
}

const API_KEY = 'b33c9835879f888134e97c6d58d6e4a7';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
// Valore di fallback per la posizione
const FALLBACK_LOCATION = 'El Paso';

/**
 * Map OpenWeather condition codes to our simplified conditions
 */
const mapWeatherCondition = (conditionCode: number): string => {
  // Weather condition codes: https://openweathermap.org/weather-conditions
  if (conditionCode >= 200 && conditionCode < 300) return 'thunderstorm';
  if (conditionCode >= 300 && conditionCode < 400) return 'drizzle';
  if (conditionCode >= 500 && conditionCode < 600) return 'rain';
  if (conditionCode >= 600 && conditionCode < 700) return 'snow';
  if (conditionCode >= 700 && conditionCode < 800) return 'mist';
  if (conditionCode === 800) return 'clear';
  if (conditionCode > 800 && conditionCode <= 802) return 'partly cloudy';
  if (conditionCode > 802) return 'cloudy';
  return 'clear'; // default
};

/**
 * Format day of week from timestamp
 */
const formatDay = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('es-ES', { weekday: 'short' });
};



/**
 * Ottieni la posizione corrente dell'utente (se possibile)
 */
export const getActiveLocation = async (): Promise<string> => {
  try {
    // Prima controlla se c'è una posizione salvata in appStateService
    const savedLocation = getCurrentLocation();
    if (savedLocation) {
      return savedLocation;
    }
    
    // Altrimenti prova a ottenere la posizione dal browser
    const { city } = await getCurrentCity();
    return city;
  } catch (error) {
    console.error('Unable to get current location, using default:', error);
    return FALLBACK_LOCATION;
  }
};

/**
 * Fetch 7-day weather forecast for a location
 * Utilizza il sistema centralizzato di cache e limitazione API
 */
export const fetchWeeklyTrend = async (city?: string): Promise<WeatherTrend[]> => {
  // Se non viene specificata una città, usa la posizione corrente dell'utente
  if (!city) {
    city = getCurrentLocation();
    if (!city) {
      console.log('[TREND SERVICE] Nessuna posizione attiva, usando fallback');
      city = FALLBACK_LOCATION;
    }
  }
  
  console.log(`[TREND SERVICE] Richiesta tendenze per ${city}`);
  
  // Verifica se abbiamo dati in cache validi
  const cachedData = getCachedTrendsData(city);
  if (cachedData) {
    console.log(`[TREND SERVICE] Usando dati in cache per ${city}`);
    return cachedData;
  }
  
  // Verifica se è possibile effettuare una chiamata API
  if (!canMakeApiCall()) {
    console.log(`[TREND SERVICE] Limite API raggiunto, usando dati fallback per ${city}`);
    return getMockWeeklyTrend();
  }
  
  try {
    console.log(`[TREND SERVICE] Esecuzione chiamata API per ${city}`);
    
    // Get 5-day forecast from OpenWeather API
    const forecastUrl = `${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`;
    console.log(`[TREND SERVICE] Chiamata forecast API: ${forecastUrl}`);
    
    const forecastResponse = await fetch(forecastUrl);
    
    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text();
      console.error(`[TREND SERVICE] Errore API: ${forecastResponse.status}`);
      throw createError(
        ErrorType.API, 
        `Failed to fetch forecast: ${forecastResponse.status}`, 
        errorText
      );
    }
    
    const forecastData = await forecastResponse.json();
    
    // Group forecast data by day
    const dailyForecasts: { [key: string]: any[] } = {};
    
    forecastData.list.forEach((item: any) => {
      const day = formatDay(item.dt);
      if (!dailyForecasts[day]) {
        dailyForecasts[day] = [];
      }
      dailyForecasts[day].push(item);
    });
    
    // Process each day's data
    const weeklyTrend: WeatherTrend[] = Object.keys(dailyForecasts).map(day => {
      const dayData = dailyForecasts[day];
      
      // Find max and min temperatures
      const temperatures = dayData.map((item: any) => item.main.temp);
      const maxTemp = Math.round(Math.max(...temperatures));
      const minTemp = Math.round(Math.min(...temperatures));
      
      // Determine dominant weather condition
      const conditions = dayData.map((item: any) => mapWeatherCondition(item.weather[0].id));
      const conditionCounts: { [key: string]: number } = {};
      conditions.forEach(condition => {
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });
      
      const dominantCondition = Object.keys(conditionCounts).reduce(
        (a, b) => conditionCounts[a] > conditionCounts[b] ? a : b
      );
      
      // Determine precipitation probability
      const precipTotal = dayData.reduce((total: number, item: any) => {
        return total + (item.pop || 0);
      }, 0);
      const precipitation = Math.round((precipTotal / dayData.length) * 100);
      
      return {
        day,
        maxTemp,
        minTemp,
        condition: dominantCondition,
        precipitation
      };
    });
    
    // Salva i dati in cache persistente
    cacheTrendsData(weeklyTrend, city);
    
    console.log(`[TREND SERVICE] Dati salvati in cache per ${city}`);
    return weeklyTrend;
  } catch (error: any) {
    if (error.type === ErrorType.API) {
      logError(error);
    } else if (error.message && error.message.includes('network')) {
      handleNetworkError(error, 'Network error fetching weekly trends');
    } else {
      handleApiError(error, 'Error fetching weekly trends');
    }
    
    // In caso di errore, verifica se ci sono dati in cache (anche scaduti)
    const cachedData = getCachedTrendsData(city);
    if (cachedData) {
      console.log(`[TREND SERVICE] Errore API, usando cache come fallback per ${city}`);
      return cachedData;
    }
    
    return getMockWeeklyTrend();
  }
};

/**
 * Generate a summary of the weekly trend
 */
export const generateTrendSummary = (trends: WeatherTrend[]): TrendSummary => {
  // Calculate average temperatures
  const totalMaxTemp = trends.reduce((sum, trend) => sum + trend.maxTemp, 0);
  const totalMinTemp = trends.reduce((sum, trend) => sum + trend.minTemp, 0);
  const averageMaxTemp = Math.round(totalMaxTemp / trends.length);
  const averageMinTemp = Math.round(totalMinTemp / trends.length);
  
  // Count condition occurrences
  const conditionCounts: { [key: string]: number } = {};
  trends.forEach(trend => {
    conditionCounts[trend.condition] = (conditionCounts[trend.condition] || 0) + 1;
  });
  
  // Find dominant condition
  const dominantCondition = Object.keys(conditionCounts).reduce(
    (a, b) => conditionCounts[a] > conditionCounts[b] ? a : b
  );
  
  // Count rain days
  const rainDays = trends.filter(trend => 
    ['rain', 'drizzle', 'thunderstorm'].includes(trend.condition) || 
    trend.precipitation > 50
  ).length;
  
  // Generate summary text
  let summary = '';
  
  if (dominantCondition === 'clear' || dominantCondition === 'partly cloudy') {
    summary = `Semana mayormente ${dominantCondition === 'clear' ? 'soleada' : 'con nubes ocasionales'} con temperaturas entre ${averageMinTemp}-${averageMaxTemp}°C.`;
  } else if (dominantCondition === 'cloudy') {
    summary = `Semana nublada con temperaturas entre ${averageMinTemp}-${averageMaxTemp}°C.`;
  } else if (['rain', 'drizzle', 'thunderstorm'].includes(dominantCondition)) {
    summary = `Semana lluviosa con temperaturas entre ${averageMinTemp}-${averageMaxTemp}°C.`;
  }
  
  // Add rain info if applicable
  if (rainDays > 0 && !['rain', 'drizzle', 'thunderstorm'].includes(dominantCondition)) {
    summary += ` Posibilidad de lluvia ${rainDays} ${rainDays === 1 ? 'día' : 'días'} de la semana.`;
  }
  
  // Check for temperature variations
  const tempDifference = averageMaxTemp - averageMinTemp;
  if (tempDifference > 10) {
    summary += ' Grandes variaciones de temperatura durante el día.';
  }
  
  return {
    summary,
    averageMaxTemp,
    averageMinTemp,
    dominantCondition,
    rainDays
  };
};

/**
 * Mock weekly trend data for fallback
 */
export const getMockWeeklyTrend = (): WeatherTrend[] => {
  return [
    { day: 'Lun', maxTemp: 26, minTemp: 19, condition: 'clear', precipitation: 0 },
    { day: 'Mar', maxTemp: 25, minTemp: 18, condition: 'clear', precipitation: 0 },
    { day: 'Mié', maxTemp: 24, minTemp: 19, condition: 'partly cloudy', precipitation: 10 },
    { day: 'Jue', maxTemp: 25, minTemp: 20, condition: 'partly cloudy', precipitation: 20 },
    { day: 'Vie', maxTemp: 26, minTemp: 19, condition: 'cloudy', precipitation: 30 },
    { day: 'Sáb', maxTemp: 24, minTemp: 18, condition: 'partly cloudy', precipitation: 20 },
    { day: 'Dom', maxTemp: 25, minTemp: 19, condition: 'clear', precipitation: 0 }
  ];
};
