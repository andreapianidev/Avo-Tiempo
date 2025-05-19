import { Activity, ActivityCategory, ActivityContext, RatedActivity } from '../types/activities';
import { WeatherData } from './weatherService';
import { getCacheItem, setCacheItem, CacheNamespace } from './cacheService';
import { getAIInsight } from './aiService';
import { findNearbyPOIs, POICategory } from './osmService'; 
import { logInfo, logError } from '../utils/logger';

// Costanti
const ACTIVITIES_CACHE_TTL = 60 * 60 * 1000; // 1 ora

// Database delle attività predefinite
const predefinedActivities: Activity[] = [
  {
    id: 'hiking',
    name: 'Escursionismo',
    description: 'Esplora i sentieri naturali dell\'isola',
    category: ActivityCategory.NATURA,
    icon: 'hiking',
    poiType: 'natural=peak',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy'],
      acceptable: ['cloudy'],
      avoid: ['rain', 'thunderstorm', 'snow', 'mist']
    },
    temperatureRange: {
      min: 12,
      max: 28
    },
    seasonality: {
      spring: 10,
      summer: 8,
      autumn: 9,
      winter: 6
    },
    tags: ['outdoor', 'montagna', 'trekking', 'natura'],
    estimatedDuration: 4,
    difficulty: 3
  },
  {
    id: 'museum',
    name: 'Visita al Museo',
    description: 'Esplora la storia e cultura locale nei musei',
    category: ActivityCategory.CULTURA,
    icon: 'museum',
    poiType: 'tourism=museum',
    weatherConditions: {
      ideal: ['rain', 'thunderstorm', 'snow', 'mist'],
      acceptable: ['clear', 'partly cloudy', 'cloudy'],
      avoid: []
    },
    temperatureRange: {
      min: 0,
      max: 35
    },
    seasonality: {
      spring: 8,
      summer: 7,
      autumn: 9,
      winter: 10
    },
    tags: ['cultura', 'indoor', 'arte', 'storia'],
    estimatedDuration: 2,
    difficulty: 1
  },
  {
    id: 'beach',
    name: 'Giornata in Spiaggia',
    description: 'Rilassati o nuota nelle meravigliose spiagge dell\'isola',
    category: ActivityCategory.SPORT,
    icon: 'umbrella-beach',
    poiType: 'natural=beach',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy'],
      acceptable: ['cloudy'],
      avoid: ['rain', 'thunderstorm', 'mist']
    },
    temperatureRange: {
      min: 22,
      max: 35
    },
    seasonality: {
      spring: 6,
      summer: 10,
      autumn: 5,
      winter: 1
    },
    tags: ['mare', 'relax', 'nuoto', 'outdoor'],
    estimatedDuration: 5,
    difficulty: 1
  },
  {
    id: 'gastronomy',
    name: 'Tour Gastronomico',
    description: 'Assapora i piatti tipici canari nei ristoranti locali',
    category: ActivityCategory.GASTRONOMIA,
    icon: 'utensils',
    poiType: 'amenity=restaurant',
    weatherConditions: {
      ideal: ['rain', 'thunderstorm', 'snow', 'mist', 'clear', 'partly cloudy', 'cloudy'],
      acceptable: [],
      avoid: []
    },
    temperatureRange: {
      min: 5,
      max: 35
    },
    seasonality: {
      spring: 9,
      summer: 9,
      autumn: 9,
      winter: 9
    },
    tags: ['cibo', 'ristoranti', 'cucina', 'vino'],
    estimatedDuration: 3,
    difficulty: 1
  },
  {
    id: 'family-park',
    name: 'Parco Divertimenti',
    description: 'Divertimento per tutta la famiglia',
    category: ActivityCategory.FAMIGLIA,
    icon: 'child',
    poiType: 'tourism=theme_park',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy'],
      acceptable: ['cloudy'],
      avoid: ['rain', 'thunderstorm', 'snow', 'mist']
    },
    temperatureRange: {
      min: 15,
      max: 30
    },
    seasonality: {
      spring: 9,
      summer: 10,
      autumn: 8,
      winter: 6
    },
    tags: ['bambini', 'divertimento', 'giochi', 'famiglia'],
    estimatedDuration: 6,
    difficulty: 1
  },
  {
    id: 'cycling',
    name: 'Ciclismo',
    description: 'Percorri le strade panoramiche in bicicletta',
    category: ActivityCategory.SPORT,
    icon: 'bicycle',
    poiType: 'route=bicycle',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy'],
      acceptable: ['cloudy'],
      avoid: ['rain', 'thunderstorm', 'snow', 'mist']
    },
    temperatureRange: {
      min: 12,
      max: 28
    },
    seasonality: {
      spring: 10,
      summer: 7,
      autumn: 9,
      winter: 5
    },
    tags: ['sport', 'bici', 'outdoor', 'percorsi'],
    estimatedDuration: 3,
    difficulty: 4
  },
  {
    id: 'stargazing',
    name: 'Osservazione Stelle',
    description: 'Osserva le stelle nei cieli limpidi di La Palma',
    category: ActivityCategory.NATURA,
    icon: 'star',
    poiType: 'tourism=viewpoint',
    weatherConditions: {
      ideal: ['clear'],
      acceptable: ['partly cloudy'],
      avoid: ['cloudy', 'rain', 'thunderstorm', 'snow', 'mist']
    },
    temperatureRange: {
      min: 8,
      max: 22
    },
    seasonality: {
      spring: 8,
      summer: 9,
      autumn: 8,
      winter: 7
    },
    tags: ['notte', 'astronomia', 'natura', 'outdoor'],
    estimatedDuration: 2,
    difficulty: 1
  },
  {
    id: 'local-markets',
    name: 'Mercati Locali',
    description: 'Visita i mercati con prodotti locali e artigianato',
    category: ActivityCategory.CULTURA,
    icon: 'shopping-basket',
    poiType: 'amenity=marketplace',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy', 'cloudy'],
      acceptable: ['light rain'],
      avoid: ['rain', 'thunderstorm', 'snow']
    },
    temperatureRange: {
      min: 12,
      max: 30
    },
    seasonality: {
      spring: 9,
      summer: 9,
      autumn: 9,
      winter: 8
    },
    tags: ['shopping', 'artigianato', 'cultura', 'cibo'],
    estimatedDuration: 2,
    difficulty: 1
  },
  {
    id: 'vineyard-tour',
    name: 'Tour dei Vigneti',
    description: 'Visita alle cantine e degustazione di vini locali',
    category: ActivityCategory.GASTRONOMIA,
    icon: 'wine-glass',
    poiType: 'landuse=vineyard',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy', 'cloudy'],
      acceptable: ['light rain'],
      avoid: ['rain', 'thunderstorm']
    },
    temperatureRange: {
      min: 14,
      max: 28
    },
    seasonality: {
      spring: 7,
      summer: 8,
      autumn: 10,
      winter: 6
    },
    tags: ['vino', 'degustazione', 'agricoltura', 'gastronomia'],
    estimatedDuration: 3,
    difficulty: 1
  },
  {
    id: 'playground',
    name: 'Parco Giochi',
    description: 'Divertimento all\'aperto per i bambini',
    category: ActivityCategory.FAMIGLIA,
    icon: 'child',
    poiType: 'leisure=playground',
    weatherConditions: {
      ideal: ['clear', 'partly cloudy'],
      acceptable: ['cloudy'],
      avoid: ['rain', 'thunderstorm', 'snow', 'mist']
    },
    temperatureRange: {
      min: 15,
      max: 30
    },
    seasonality: {
      spring: 10,
      summer: 9,
      autumn: 8,
      winter: 6
    },
    tags: ['bambini', 'giochi', 'outdoor', 'famiglia'],
    estimatedDuration: 2,
    difficulty: 1
  }
];

/**
 * Ottiene il contesto corrente per la valutazione delle attività
 * @param weatherData Dati meteo attuali
 * @returns Contesto per la valutazione delle attività
 */
const getActivityContext = (weatherData: WeatherData): ActivityContext => {
  return {
    currentWeather: {
      condition: weatherData.condition,
      temperature: weatherData.temperature,
      windSpeed: weatherData.windSpeed || 0,
      humidity: weatherData.humidity || 50,
      precipitation: 0, // Da calcolare se disponibile
      uvIndex: weatherData.uvIndex
    },
    location: {
      name: weatherData.location,
      lat: weatherData.lat,
      lon: weatherData.lon
    },
    date: new Date()
  };
};

/**
 * Calcola il punteggio per un'attività in base al contesto meteo
 * @param activity Attività da valutare
 * @param context Contesto meteo e preferenze
 * @returns Punteggio da 0 a 100
 */
const calculateActivityScore = (activity: Activity, context: ActivityContext): RatedActivity => {
  let score = 50; // Punteggio base
  const reasons: string[] = [];
  const weather = context.currentWeather;
  const date = context.date;
  const month = date.getMonth(); // 0-11
  
  // Calcola la stagione corrente
  let currentSeason = 'winter';
  if (month >= 2 && month <= 4) currentSeason = 'spring';
  else if (month >= 5 && month <= 7) currentSeason = 'summer';
  else if (month >= 8 && month <= 10) currentSeason = 'autumn';
  
  // Valuta condizioni meteo
  if (activity.weatherConditions.ideal.includes(weather.condition)) {
    score += 20;
    reasons.push('Condizioni meteo ideali');
  } else if (activity.weatherConditions.acceptable.includes(weather.condition)) {
    score += 10;
    reasons.push('Condizioni meteo accettabili');
  } else if (activity.weatherConditions.avoid.includes(weather.condition)) {
    score -= 30;
    reasons.push('Condizioni meteo sfavorevoli');
  }
  
  // Valuta temperatura
  if (weather.temperature >= activity.temperatureRange.min && 
      weather.temperature <= activity.temperatureRange.max) {
    score += 15;
    reasons.push('Temperatura ideale');
  } else if (weather.temperature < activity.temperatureRange.min) {
    score -= 15;
    reasons.push('Temperatura troppo bassa');
  } else {
    score -= 15;
    reasons.push('Temperatura troppo alta');
  }
  
  // Valuta stagionalità
  if (currentSeason === 'spring' && activity.seasonality.spring >= 8) {
    score += 15;
    reasons.push('Periodo primaverile ideale');
  } else if (currentSeason === 'summer' && activity.seasonality.summer >= 8) {
    score += 15;
    reasons.push('Periodo estivo ideale');
  } else if (currentSeason === 'autumn' && activity.seasonality.autumn >= 8) {
    score += 15;
    reasons.push('Periodo autunnale ideale');
  } else if (currentSeason === 'winter' && activity.seasonality.winter >= 8) {
    score += 15;
    reasons.push('Periodo invernale ideale');
  }
  
  // Limita il punteggio tra 0 e 100
  score = Math.max(0, Math.min(100, score));
  
  // Genera raccomandazione
  let recommendation = '';
  if (score >= 80) {
    recommendation = `Condizioni perfette per ${activity.name}!`;
  } else if (score >= 60) {
    recommendation = `Buon momento per ${activity.name}, ma considera ${reasons[reasons.length - 1].toLowerCase()}.`;
  } else if (score >= 40) {
    recommendation = `${activity.name} è possibile, ma non ideale oggi.`;
  } else {
    recommendation = `Meglio rimandare ${activity.name} a un giorno con condizioni migliori.`;
  }
  
  return {
    ...activity,
    score,
    reasons,
    recommendation
  };
};

/**
 * Recupera attività consigliate per il contesto attuale
 * @param weatherData Dati meteo attuali
 * @param category Categoria opzionale per filtrare le attività
 * @returns Lista di attività ordinate per punteggio
 */
const getRecommendedActivities = async (
  weatherData: WeatherData, 
  category?: ActivityCategory
): Promise<RatedActivity[]> => {
  try {
    const cacheKey = `activities_${weatherData.location}_${category || 'all'}`;
    
    // Verifica cache
    const cachedActivities = getCacheItem<RatedActivity[]>(CacheNamespace.ACTIVITIES, cacheKey);
    if (cachedActivities) {
      logInfo('ACTIVITIES', 'Recuperate attività dalla cache');
      return cachedActivities;
    }
    
    // Ottieni contesto
    const context = getActivityContext(weatherData);
    
    // Filtra per categoria se specificata
    let filteredActivities = [...predefinedActivities];
    if (category) {
      filteredActivities = filteredActivities.filter(a => a.category === category);
    }
    
    // Calcola punteggi
    const ratedActivities = filteredActivities.map(activity => 
      calculateActivityScore(activity, context)
    );
    
    // Ordina per punteggio (decrescente)
    const sortedActivities = ratedActivities.sort((a, b) => b.score - a.score);
    
    // Arricchisci con insight AI per le top 5 attività
    const topActivities = sortedActivities.slice(0, 5);
    
    // Salva in cache
    setCacheItem(CacheNamespace.ACTIVITIES, cacheKey, sortedActivities, ACTIVITIES_CACHE_TTL);
    
    return sortedActivities;
  } catch (error) {
    logError('ACTIVITIES', `Errore nel recupero attività: ${error}`);
    return [];
  }
};

/**
 * Ottiene un messaggio AI divertente per un'attività
 * @param activity Attività 
 * @param weather Dati meteo
 * @returns Messaggio AI in stile canaro 
 */
const getActivityAIMessage = async (activity: RatedActivity, weather: WeatherData): Promise<string> => {
  try {
    const cacheKey = `activity_ai_${activity.id}_${weather.condition}_${Math.round(weather.temperature)}`;
    
    // Verifica cache
    const cachedMessage = getCacheItem<string>(CacheNamespace.AI_INSIGHTS, cacheKey);
    if (cachedMessage) {
      return cachedMessage;
    }
    
    // Crea prompt per AI
    const prompt = `
      Sei un assistente turistico canario esperto dell'isola di La Palma.
      Genera un breve consiglio divertente (massimo 2 frasi) in stile canaro per questa attività:
      - Nome: ${activity.name}
      - Descrizione: ${activity.description}
      - Punteggio di idoneità: ${activity.score}/100
      - Meteo attuale: ${weather.condition}, ${weather.temperature}°C
      - Luogo: ${weather.location}
      
      Lo stile canaro mescola spagnolo e italiano in modo colloquiale e divertente, 
      usa spesso termini come "mi niño", "qué va", "guagua" e un tono allegro e musicale.
      
      Esempio:
      "¡Qué va mi niño! Con questo solecito, sei perfetto para un hiking al Roque. ¡Dale caña y disfruta la vista espectacular!"
    `;
    
    // Ottieni risposta AI - passando solo il prompt come unico parametro
    const aiMessage = await getAIInsight(prompt);
    
    // Salva in cache
    if (aiMessage) {
      setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, aiMessage, ACTIVITIES_CACHE_TTL);
    }
    
    return aiMessage || "¡Qué tal mi niño! Questa attività è perfetta oggi, disfrutala!";
  } catch (error) {
    logError('ACTIVITIES', `Errore nel generare messaggio AI: ${error}`);
    return "¡Ay mi niño! Qualcosa è andato storto, ma l'attività sembra buona!";
  }
};

/**
 * Ottiene POI rilevanti per un'attività
 * @param activity Attività per cui cercare POI
 * @param location Coordinate per la ricerca
 * @returns Lista di POI rilevanti
 */
const getRelevantPOIs = async (activity: Activity, location: {lat: number, lon: number}): Promise<any[]> => {
  try {
    if (!activity.poiType) {
      return [];
    }
    
    // Converti il tipo di POI nel formato corretto per osmService
    let osmCategory: POICategory;
    if (activity.poiType.includes('natural=')) {
      osmCategory = POICategory.NATURAL;
    } else if (activity.poiType.includes('tourism=')) {
      osmCategory = POICategory.TOURISM;
    } else if (activity.poiType.includes('amenity=')) {
      osmCategory = POICategory.AMENITY;
    } else if (activity.poiType.includes('leisure=')) {
      osmCategory = POICategory.LEISURE;
    } else {
      osmCategory = POICategory.NATURAL;
    }
    
    // Estrai la query di ricerca dal poiType
    const searchQuery = activity.poiType.split('=')[1];
    
    // Cerca POI vicini
    const pois = await findNearbyPOIs(location.lat, location.lon, osmCategory, 10000);
    
    // Filtriamo solo i POI che corrispondono meglio alla categoria dell'attività
    return pois.filter(poi => {
      if (searchQuery && poi.tags) {
        // Cerca nelle tags se c'è corrispondenza con la query
        const matchesTags = Object.values(poi.tags).some(value => 
          value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
        return matchesTags;
      }
      return true;
    }).slice(0, 20); // Limitiamo a 20 POI per evitare di sovraccaricare la mappa
  } catch (error) {
    logError('ACTIVITIES', `Errore nel recupero POI: ${error}`);
    return [];
  }
};

// Esportiamo tutte le funzioni come oggetto singleton
const activitiesService = {
  getRecommendedActivities,
  getActivityAIMessage,
  getRelevantPOIs,
  getActivityContext,
  calculateActivityScore
};

// Esportazioni per TypeScript
export {
  getRecommendedActivities,
  getActivityAIMessage,
  getRelevantPOIs,
  getActivityContext,
  calculateActivityScore,
  activitiesService
};

// Esportazione default per retrocompatibilità
export default activitiesService;
