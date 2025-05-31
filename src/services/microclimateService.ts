import { GeoCoords, DEFAULT_LOCATIONS } from './geolocationService';
import { calculateDistance } from './osmService';
import { getWeatherData } from './weatherService';
import { getCacheItem, setCacheItem, CacheNamespace } from './cacheService';
import { getAIInsight } from './aiService';
import { logAppError } from './appStateService';

// Definizione di località con microclimi specifici nelle Isole Canarie
// Particolarmente dettagliato per La Palma, che ha microclimi variabili
export const MICROCLIMATE_LOCATIONS = {
  // La Palma (focus principale)
  'LA_PALMA': [
    { name: 'El Paso', lat: 28.6586, lon: -17.7797, elevation: 600, region: 'centro' },
    { name: 'Los Llanos de Aridane', lat: 28.6585, lon: -17.9182, elevation: 325, region: 'oeste' },
    { name: 'Santa Cruz de La Palma', lat: 28.6835, lon: -17.7642, elevation: 5, region: 'este' },
    { name: 'Tazacorte', lat: 28.6393, lon: -17.9346, elevation: 30, region: 'costa oeste' },
    { name: 'Tijarafe', lat: 28.7074, lon: -17.9523, elevation: 650, region: 'noroeste' },
    { name: 'Puntagorda', lat: 28.7649, lon: -17.9827, elevation: 600, region: 'norte' },
    { name: 'Garafía', lat: 28.8313, lon: -17.9231, elevation: 400, region: 'norte' },
    { name: 'Barlovento', lat: 28.8271, lon: -17.7983, elevation: 550, region: 'noreste' },
    { name: 'San Andrés y Sauces', lat: 28.8048, lon: -17.7676, elevation: 100, region: 'noreste' },
    { name: 'Puntallana', lat: 28.7541, lon: -17.7338, elevation: 290, region: 'este' },
    { name: 'Villa de Mazo', lat: 28.5833, lon: -17.7667, elevation: 500, region: 'sureste' },
    { name: 'Fuencaliente', lat: 28.4865, lon: -17.8438, elevation: 700, region: 'sur' },
    { name: 'Roque de los Muchachos', lat: 28.7547, lon: -17.8837, elevation: 2426, region: 'cumbres' }
  ],
  // Tenerife
  'TENERIFE': [
    { name: 'Santa Cruz de Tenerife', lat: 28.4636, lon: -16.2518, elevation: 4, region: 'este' },
    { name: 'La Laguna', lat: 28.4816, lon: -16.3213, elevation: 545, region: 'noreste' },
    { name: 'Puerto de la Cruz', lat: 28.4127, lon: -16.5484, elevation: 9, region: 'norte' },
    { name: 'Los Cristianos', lat: 28.0489, lon: -16.7071, elevation: 7, region: 'sur' },
    { name: 'Los Gigantes', lat: 28.2463, lon: -16.8407, elevation: 10, region: 'oeste' },
    { name: 'El Teide', lat: 28.2719, lon: -16.6434, elevation: 3718, region: 'cumbres' }
  ],
  // Gran Canaria
  'GRAN_CANARIA': [
    { name: 'Las Palmas de Gran Canaria', lat: 28.1248, lon: -15.4300, elevation: 8, region: 'noreste' },
    { name: 'Maspalomas', lat: 27.7520, lon: -15.5866, elevation: 6, region: 'sur' },
    { name: 'Tejeda', lat: 27.9958, lon: -15.6137, elevation: 1050, region: 'centro' },
    { name: 'Agaete', lat: 28.1003, lon: -15.7010, elevation: 43, region: 'noroeste' }
  ]
};

// Interfacce
export interface MicroclimateLocation {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  region: string;
  distance?: number; // Distanza dalla posizione attuale (opzionale, calcolata dinamicamente)
}

export interface WeatherComparison {
  currentLocation: {
    name: string;
    coords: GeoCoords;
    weather: any; // Dati meteo della posizione corrente
  };
  betterLocations: Array<{
    location: MicroclimateLocation;
    weather: any; // Dati meteo della località alternativa
    improvement: string; // Descrizione del miglioramento (es. "più soleggiato", "meno ventoso")
    score: number; // Punteggio di miglioramento (0-100)
  }>;
}

const CACHE_KEY = 'microclimate_suggestions';
const CACHE_TTL = 30 * 60 * 1000; // 30 minuti

/**
 * Determina l'isola in base alle coordinate
 * @param coords Coordinate geografiche
 * @returns Chiave dell'isola (LA_PALMA, TENERIFE, GRAN_CANARIA)
 */
const determineIsland = (coords: GeoCoords): keyof typeof MICROCLIMATE_LOCATIONS => {
  // Bounding boxes approssimative delle isole
  const LA_PALMA_BOUNDS = { minLat: 28.4, maxLat: 28.85, minLon: -18.0, maxLon: -17.7 };
  const TENERIFE_BOUNDS = { minLat: 28.0, maxLat: 28.6, minLon: -16.9, maxLon: -16.1 };
  const GRAN_CANARIA_BOUNDS = { minLat: 27.7, maxLat: 28.2, minLon: -15.8, maxLon: -15.3 };
  
  const { latitude, longitude } = coords;
  
  if (latitude >= LA_PALMA_BOUNDS.minLat && 
      latitude <= LA_PALMA_BOUNDS.maxLat && 
      longitude >= LA_PALMA_BOUNDS.minLon && 
      longitude <= LA_PALMA_BOUNDS.maxLon) {
    return 'LA_PALMA';
  } else if (latitude >= TENERIFE_BOUNDS.minLat && 
            latitude <= TENERIFE_BOUNDS.maxLat && 
            longitude >= TENERIFE_BOUNDS.minLon && 
            longitude <= TENERIFE_BOUNDS.maxLon) {
    return 'TENERIFE';
  } else if (latitude >= GRAN_CANARIA_BOUNDS.minLat && 
            latitude <= GRAN_CANARIA_BOUNDS.maxLat && 
            longitude >= GRAN_CANARIA_BOUNDS.minLon && 
            longitude <= GRAN_CANARIA_BOUNDS.maxLon) {
    return 'GRAN_CANARIA';
  }
  
  // Default a La Palma se non siamo sicuri
  return 'LA_PALMA';
};

/**
 * Trova località vicine alla posizione corrente
 * @param coords Coordinate dell'utente
 * @param maxDistance Distanza massima in km (default 30km)
 * @param maxLocations Numero massimo di località da restituire (default 5)
 * @returns Lista di località vicine con distanza calcolata
 */
export const findNearbyLocations = (
  coords: GeoCoords, 
  maxDistance: number = 30, 
  maxLocations: number = 5
): MicroclimateLocation[] => {
  const island = determineIsland(coords);
  const locations = MICROCLIMATE_LOCATIONS[island];
  
  // Calcola la distanza per ogni località e filtra per distanza massima
  const locationsWithDistance = locations.map(location => {
    const distance = calculateDistance(
      coords.latitude, 
      coords.longitude, 
      location.lat, 
      location.lon
    ) / 1000; // Converti da metri a km
    
    return {
      ...location,
      distance
    };
  }).filter(location => 
    // Escludiamo la posizione corrente (distanze molto piccole)
    location.distance > 1 && location.distance <= maxDistance
  );
  
  // Ordina per distanza crescente e prendi solo il numero richiesto
  return locationsWithDistance
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, maxLocations);
};

/**
 * Valuta se il meteo in una località è migliore rispetto alla posizione corrente
 * @param currentWeather Dati meteo della posizione corrente
 * @param alternativeWeather Dati meteo della località alternativa
 * @returns Oggetto con punteggio e descrizione del miglioramento
 */
const evaluateWeatherImprovement = (currentWeather: any, alternativeWeather: any): { score: number, improvement: string } => {
  let score = 0;
  const improvements: string[] = [];
  
  // Controllo base: è più soleggiato?
  if (alternativeWeather.clouds.all < currentWeather.clouds.all - 15) {
    score += 20;
    improvements.push('más soleado');
  }
  
  // È meno piovoso?
  if ((alternativeWeather.rain?.['1h'] || 0) < (currentWeather.rain?.['1h'] || 0) - 0.5) {
    score += 25;
    improvements.push('sin lluvia');
  }
  
  // È meno ventoso?
  if (alternativeWeather.wind.speed < currentWeather.wind.speed - 2) {
    score += 15;
    improvements.push('menos viento');
  }
  
  // È più caldo? (solo se la temperatura attuale è < 21°C)
  if (currentWeather.main.temp < 21 && alternativeWeather.main.temp > currentWeather.main.temp + 3) {
    score += 20;
    improvements.push('más caliente');
  }
  
  // È più fresco? (solo se la temperatura attuale è > 25°C)
  if (currentWeather.main.temp > 25 && alternativeWeather.main.temp < currentWeather.main.temp - 3) {
    score += 20;
    improvements.push('más fresco');
  }

  // Controlla per eventi specifici: calima (sabbia dal Sahara)
  const hasCalima = (weather: any) => {
    return weather.weather.some((w: any) => 
      w.id === 761 || // dust
      w.id === 731 || // sand/dust whirls
      (w.description && w.description.toLowerCase().includes('calima'))
    );
  };
  
  if (hasCalima(currentWeather) && !hasCalima(alternativeWeather)) {
    score += 30;
    improvements.push('sin calima');
  }
  
  // Condizioni speciali
  const currentMainWeather = currentWeather.weather[0]?.main?.toLowerCase();
  const alternativeMainWeather = alternativeWeather.weather[0]?.main?.toLowerCase();
  
  if (currentMainWeather === 'rain' && alternativeMainWeather !== 'rain') {
    score += 25;
    improvements.push('sin lluvia');
  }
  
  if (currentMainWeather === 'fog' && alternativeMainWeather !== 'fog') {
    score += 20;
    improvements.push('sin niebla');
  }
  
  return {
    score,
    improvement: improvements.length > 0 ? improvements.join(', ') : 'mejor clima'
  };
};

/**
 * Trova e suggerisce località vicine con meteo migliore
 * @param currentLocation Nome della località attuale
 * @param coords Coordinate dell'utente
 * @param forceRefresh Forzare l'aggiornamento ignorando la cache
 * @returns Promise con confronto meteo e suggerimenti
 */
export const findBetterWeatherNearby = async (
  currentLocation: string,
  coords: GeoCoords,
  forceRefresh: boolean = false
): Promise<WeatherComparison> => {
  // Controlla se abbiamo già dei suggerimenti in cache
  const cacheKey = `${CACHE_KEY}_${coords.latitude.toFixed(2)}_${coords.longitude.toFixed(2)}`;
  
  if (!forceRefresh) {
    const cachedData = getCacheItem<WeatherComparison>(CacheNamespace.WEATHER, cacheKey);
    if (cachedData) {
      console.log('[MICROCLIMA] Utilizzando dati in cache per suggerimenti microclima');
      return cachedData;
    }
  }
  
  try {
    // Ottieni il meteo per la posizione corrente
    const currentWeather = await getWeatherData(
      currentLocation
    );
    
    // Trova località vicine
    const nearbyLocations = findNearbyLocations(coords);
    
    // Se non ci sono località vicine, ritorna un oggetto vuoto
    if (nearbyLocations.length === 0) {
      return {
        currentLocation: {
          name: currentLocation,
          coords,
          weather: currentWeather
        },
        betterLocations: []
      };
    }
    
    // Ottieni il meteo per tutte le località vicine
    const locationsWithWeather = await Promise.all(
      nearbyLocations.map(async (location) => {
        try {
          const weather = await getWeatherData(
            location.name,
            'ES'
          );
          
          const improvement = evaluateWeatherImprovement(currentWeather, weather);
          
          return {
            location,
            weather,
            improvement: improvement.improvement,
            score: improvement.score
          };
        } catch (error) {
          console.error(`[MICROCLIMA] Errore nel recupero meteo per ${location.name}:`, error);
          return null;
        }
      })
    );
    
    // Filtra località nulle (errori) e quelle con punteggio basso
    const betterLocations = locationsWithWeather
      .filter(item => item !== null && item.score >= 25)
      .sort((a, b) => b!.score - a!.score);
    
    const result: WeatherComparison = {
      currentLocation: {
        name: currentLocation,
        coords,
        weather: currentWeather
      },
      betterLocations: betterLocations as any[]
    };
    
    // Salva in cache
    setCacheItem(CacheNamespace.WEATHER, cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('[MICROCLIMA] Errore nel trovare località con meteo migliore:', error);
    logAppError('microclimate', `Errore nel trovare località con meteo migliore: ${error}`);
    
    // Ritorna un oggetto vuoto in caso di errore
    return {
      currentLocation: {
        name: currentLocation,
        coords,
        weather: {}
      },
      betterLocations: []
    };
  }
};

/**
 * Genera un suggerimento AI per il microclima in stile "canaro"
 * @param comparison Risultato del confronto microclima
 * @returns Promise con suggerimento AI
 */
export const getMicroclimateAISuggestion = async (comparison: WeatherComparison): Promise<string> => {
  // Se non ci sono località migliori, ritorna null
  if (!comparison.betterLocations || comparison.betterLocations.length === 0) {
    return '';
  }
  
  // Prendi la località migliore
  const bestLocation = comparison.betterLocations[0];
  const currentWeatherMain = comparison.currentLocation.weather.weather[0]?.main || 'Unknown';
  const currentWeatherDesc = comparison.currentLocation.weather.weather[0]?.description || 'desconocido';
  const alternativeWeatherMain = bestLocation.weather.weather[0]?.main || 'Unknown';
  const alternativeWeatherDesc = bestLocation.weather.weather[0]?.description || 'desconocido';
  
  // Crea un prompt per l'AI
  const prompt = `
    Situación actual en ${comparison.currentLocation.name}: ${currentWeatherMain} (${currentWeatherDesc}).
    Temperatura: ${Math.round(comparison.currentLocation.weather.main?.temp || 0)}°C.
    
    Alternativa en ${bestLocation.location.name} (a ${Math.round(bestLocation.location.distance || 0)} km): 
    ${alternativeWeatherMain} (${alternativeWeatherDesc}).
    Temperatura: ${Math.round(bestLocation.weather.main?.temp || 0)}°C.
    Mejoras: ${bestLocation.improvement}.
    
    Genera un consejo breve y gracioso en estilo canario sobre escaparse a ${bestLocation.location.name} 
    para disfrutar de mejor clima. Usa expresiones locales canarias y un tono amistoso.
    Ejemplo: "En El Paso hay calima, pero en Tijarafe está despejado. ¡Escápate!"
  `;
  
  try {
    // Usiamo una versione semplificata del prompt per il servizio AI
    // La firma completa richiede più parametri specifici, ma per semplicità
    // useremo dei valori fittizi per soddisfare l'interfaccia
    const suggestion = await getAIInsight(
      comparison.currentLocation.name,
      currentWeatherDesc,
      comparison.currentLocation.weather.main?.temp || 25,
      undefined,
      undefined,
      undefined
    );
    return suggestion;
  } catch (error) {
    console.error('[MICROCLIMA] Errore nella generazione del suggerimento AI:', error);
    
    // Fallback: genera un suggerimento statico
    const improvements = bestLocation.improvement.split(', ');
    return `¡Ey! En ${comparison.currentLocation.name} está ${currentWeatherDesc}, 
      pero a solo ${Math.round(bestLocation.location.distance || 0)} km, 
      ${bestLocation.location.name} tiene ${alternativeWeatherDesc} 
      ${improvements.length > 0 ? `(${improvements.join(', ')})` : ''}. 
      ¡Échate p'allá!`;
  }
};

export const microclimateService = {
  findNearbyLocations,
  findBetterWeatherNearby,
  getMicroclimateAISuggestion
};

export default microclimateService;
