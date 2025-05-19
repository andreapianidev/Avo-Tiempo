// Servizio avanzato per la raccomandazione di attività in base a meteo, ora e stagione
import { WeatherData } from './weatherService';
import { POI } from './osmService';
import cacheService, { CacheNamespace } from './cacheService';
import { generateDailyActivitySuggestion } from './aiService';

// Interfacce per i dati di raccomandazione
export interface ActivityScore {
  name: string;
  score: number;  // 0-100
  category: string;
  description: string;
  idealWeather: string[];
  idealTimeOfDay: string[];
  seasonality: {
    spring: number;  // 0-10
    summer: number;
    autumn: number;
    winter: number;
  };
  idealTemperatureRange: {
    min: number;
    max: number;
  };
  weatherSensitivity: number;  // 0-10, quanto l'attività è sensibile al meteo
  popularityTrend: 'rising' | 'falling' | 'stable';
  icon: string;
  tags: string[];
}

export interface ActivityRecommendation {
  topActivities: ActivityScore[];
  currentTrends: {
    trend: string;
    description: string;
    popularity: number;  // 0-100
  }[];
  seasonalSuggestion: string;
  weatherBasedTip: string;
  timeBasedTip: string;
  localEvents?: {
    name: string;
    time: string;
    location: string;
    weatherCompatibility: number;  // 0-100
  }[];
}

// Periodo di validità della cache (1 ora)
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Genera raccomandazioni di attività avanzate basate su meteo, ora, stagione e trend
 */
export const getAdvancedActivityRecommendations = async (
  context: {
    weather: WeatherData;
    location: string;
    time: {
      hour: number;
      timeOfDay: string;
      isWeekend: boolean;
    };
    pois: POI[];
    date?: Date;
  }
): Promise<ActivityRecommendation> => {
  try {
    const { weather, location, time, pois, date = new Date() } = context;
    
    // Verifica nella cache
    const cacheKey = `advanced_recommendations_${location}_${weather.temperature}_${weather.condition}_${time.timeOfDay}_${time.isWeekend}`;
    const cachedResult = cacheService.getCacheItem<ActivityRecommendation>(CacheNamespace.AI_INSIGHTS, cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached activity recommendations');
      return cachedResult;
    }
    
    // In una implementazione reale, qui ci sarebbe una logica più complessa
    // che considera vari fattori e potenzialmente usa modelli di ML
    // Per questa demo, generiamo raccomandazioni basate su regole e casualità
    
    const result = generateRecommendations(context);
    
    // Salva in cache
    cacheService.setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('Error generating advanced activity recommendations:', error);
    // Fornisci un risultato di fallback in caso di errore
    return getFallbackRecommendations(context);
  }
};

/**
 * Determina se un'attività è adatta in base alle condizioni meteo
 */
export const getActivityWeatherCompatibility = (
  activity: ActivityScore,
  weather: WeatherData
): number => {
  const { temperature, condition, humidity, windSpeed } = weather;
  const conditionLower = condition.toLowerCase();
  let compatibility = 50; // Base di partenza
  
  // Controlla se le condizioni meteo sono tra quelle ideali per l'attività
  const isIdealWeather = activity.idealWeather.some(ideal => 
    conditionLower.includes(ideal.toLowerCase())
  );
  
  if (isIdealWeather) {
    compatibility += 20;
  }
  
  // Verifica range di temperatura
  if (temperature >= activity.idealTemperatureRange.min && 
      temperature <= activity.idealTemperatureRange.max) {
    compatibility += 25;
  } else {
    // Penalità proporzionale alla distanza dal range ideale
    const distanceFromIdeal = Math.min(
      Math.abs(temperature - activity.idealTemperatureRange.min),
      Math.abs(temperature - activity.idealTemperatureRange.max)
    );
    compatibility -= Math.min(35, distanceFromIdeal * 3);
  }
  
  // Adattamenti specifici in base al tipo di attività
  if (activity.category === 'outdoor') {
    if (conditionLower.includes('rain') || conditionLower.includes('thunder')) {
      compatibility -= 40;
    }
    if (conditionLower.includes('snow')) {
      // La neve è buona per alcune attività, cattiva per altre
      if (activity.tags.includes('winter') || activity.tags.includes('snow')) {
        compatibility += 30;
      } else {
        compatibility -= 30;
      }
    }
    if (windSpeed > 30) {
      compatibility -= 20;
    }
    if (humidity > 85) {
      compatibility -= 10;
    }
  } else if (activity.category === 'indoor') {
    // Per attività al chiuso, il brutto tempo è un bonus
    if (conditionLower.includes('rain') || conditionLower.includes('thunder')) {
      compatibility += 20;
    }
    // Ma con bel tempo è meno desiderabile stare al chiuso
    if (conditionLower.includes('clear') && temperature > 22 && temperature < 30) {
      compatibility -= 15;
    }
  }
  
  // Prendi in considerazione la sensibilità dell'attività al meteo
  compatibility = Math.round(
    compatibility * (1 - (activity.weatherSensitivity / 20))
  );
  
  // Assicurati che il valore sia tra 0 e 100
  return Math.max(0, Math.min(100, compatibility));
};

/**
 * Calcola le attività di trend in base a stagione, meteo e ora
 */
export const getTrendingActivities = (
  date: Date = new Date(),
  weather: WeatherData,
  isWeekend: boolean
): { trend: string; description: string; popularity: number }[] => {
  const trends: { trend: string; description: string; popularity: number }[] = [];
  const month = date.getMonth();
  const temperature = weather.temperature;
  const conditionLower = weather.condition.toLowerCase();
  
  // Definisci le stagioni
  const isSpring = month >= 2 && month <= 4;  // Marzo, Aprile, Maggio
  const isSummer = month >= 5 && month <= 7;  // Giugno, Luglio, Agosto
  const isAutumn = month >= 8 && month <= 10; // Settembre, Ottobre, Novembre
  const isWinter = month === 11 || month <= 1; // Dicembre, Gennaio, Febbraio
  
  // Aggiungi trend basati sulla stagione
  if (isSpring) {
    trends.push({
      trend: 'Escursioni Primaverili',
      description: 'Percorsi nella natura per vedere la fioritura',
      popularity: 85
    });
    
    trends.push({
      trend: 'Picnic all\'aperto',
      description: 'Pranzi all\'aperto nei parchi e giardini',
      popularity: 80
    });
  } 
  
  if (isSummer) {
    trends.push({
      trend: 'Attività in Spiaggia',
      description: 'Bagni, sport acquatici e relax in spiaggia',
      popularity: 95
    });
    
    trends.push({
      trend: 'Festival Estivi',
      description: 'Eventi musicali e culturali all\'aperto',
      popularity: 90
    });
  }
  
  if (isAutumn) {
    trends.push({
      trend: 'Trekking Autunnale',
      description: 'Percorsi per ammirare i colori autunnali',
      popularity: 85
    });
    
    trends.push({
      trend: 'Degustazioni Enogastronomiche',
      description: 'Visita a cantine e mercati agricoli',
      popularity: 80
    });
  }
  
  if (isWinter) {
    trends.push({
      trend: 'Attività Culturali al Coperto',
      description: 'Musei, mostre e eventi culturali',
      popularity: 85
    });
    
    if (temperature < 10) {
      trends.push({
        trend: 'Sport Invernali',
        description: 'Sci, snowboard e altri sport sulla neve',
        popularity: 90
      });
    }
  }
  
  // Aggiungi trend basati sul meteo corrente
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    trends.push({
      trend: 'Attività all\'aperto',
      description: 'Dalla mountain bike al kayak, tutto ciò che è outdoor',
      popularity: 95
    });
  }
  
  if (conditionLower.includes('rain') || conditionLower.includes('cloud')) {
    trends.push({
      trend: 'Attività al Coperto',
      description: 'Dai musei ai centri commerciali, passando per cinema e teatri',
      popularity: 85
    });
  }
  
  // Trend basati sul giorno della settimana
  if (isWeekend) {
    trends.push({
      trend: 'Gite fuori porta',
      description: 'Escursioni di un giorno nei dintorni',
      popularity: 90
    });
  } else {
    trends.push({
      trend: 'After-work sociali',
      description: 'Aperitivi e attività post-lavoro',
      popularity: 75
    });
  }
  
  // Trend sempre popolari indipendentemente dalla stagione
  trends.push({
    trend: 'Gastronomia locale',
    description: 'Esplorazione dei sapori tipici del territorio',
    popularity: 88
  });
  
  // Seleziona 3-5 trend in modo semi-casuale pesato per popolarità
  trends.sort(() => 0.5 - Math.random());
  const selectedTrends = trends.slice(0, Math.floor(Math.random() * 2) + 3);
  return selectedTrends.sort((a, b) => b.popularity - a.popularity);
};

/**
 * Ottiene consigli stagionali in base alla data corrente
 */
export const getSeasonalSuggestion = (
  date: Date = new Date(),
  location: string
): string => {
  const month = date.getMonth();
  
  // Definisci le stagioni
  const isSpring = month >= 2 && month <= 4;
  const isSummer = month >= 5 && month <= 7;
  const isAutumn = month >= 8 && month <= 10;
  const isWinter = month === 11 || month <= 1;
  
  if (isSpring) {
    return `La primavera è il momento ideale per esplorare i sentieri naturalistici di ${location}. La vegetazione è rigogliosa e le temperature sono perfette per attività all'aperto.`;
  } 
  
  if (isSummer) {
    return `L'estate a ${location} è perfetta per le attività balneari e per gli sport acquatici. Approfitta delle lunghe giornate per esplorare anche le zone più remote.`;
  }
  
  if (isAutumn) {
    return `L'autunno porta a ${location} colori spettacolari e temperature miti. È il momento ideale per escursioni, fotografia naturalistica e scoprire la gastronomia locale.`;
  }
  
  if (isWinter) {
    return `L'inverno a ${location} offre l'opportunità di scoprire un lato diverso del territorio. Tra attività culturali al coperto e specialità gastronomiche stagionali, c'è molto da esplorare.`;
  }
  
  return `Ogni stagione a ${location} ha il suo fascino unico. Scopri le attività più adatte al periodo attuale.`;
};

/**
 * Genera un elenco di attività con punteggi di compatibilità
 */
const generateActivitiesList = (): ActivityScore[] => {
  return [
    {
      name: 'Escursionismo',
      score: 0, // Sarà calcolato dinamicamente
      category: 'outdoor',
      description: 'Esplora sentieri e percorsi naturalistici',
      idealWeather: ['clear', 'partly cloudy', 'sun'],
      idealTimeOfDay: ['morning', 'afternoon'],
      seasonality: {
        spring: 9,
        summer: 7,
        autumn: 9,
        winter: 5
      },
      idealTemperatureRange: {
        min: 15,
        max: 28
      },
      weatherSensitivity: 8,
      popularityTrend: 'rising',
      icon: '🥾',
      tags: ['nature', 'outdoor', 'trekking']
    },
    {
      name: 'Spiaggia',
      score: 0,
      category: 'outdoor',
      description: 'Relax e attività in spiaggia',
      idealWeather: ['clear', 'sun'],
      idealTimeOfDay: ['morning', 'afternoon'],
      seasonality: {
        spring: 5,
        summer: 10,
        autumn: 4,
        winter: 1
      },
      idealTemperatureRange: {
        min: 23,
        max: 35
      },
      weatherSensitivity: 9,
      popularityTrend: 'stable',
      icon: '🏖️',
      tags: ['beach', 'relax', 'swimming']
    },
    {
      name: 'Ciclismo',
      score: 0,
      category: 'outdoor',
      description: 'Tour in bicicletta su strada o mountain bike',
      idealWeather: ['clear', 'partly cloudy', 'sun'],
      idealTimeOfDay: ['morning', 'afternoon'],
      seasonality: {
        spring: 9,
        summer: 7,
        autumn: 8,
        winter: 4
      },
      idealTemperatureRange: {
        min: 15,
        max: 28
      },
      weatherSensitivity: 7,
      popularityTrend: 'rising',
      icon: '🚴',
      tags: ['biking', 'sport', 'outdoor']
    },
    {
      name: 'Visita Musei',
      score: 0,
      category: 'indoor',
      description: 'Esplora musei, gallerie d\'arte e attrazioni culturali',
      idealWeather: ['rain', 'snow', 'storm', 'cloudy'],
      idealTimeOfDay: ['morning', 'afternoon', 'evening'],
      seasonality: {
        spring: 6,
        summer: 5,
        autumn: 7,
        winter: 9
      },
      idealTemperatureRange: {
        min: 0,
        max: 35
      },
      weatherSensitivity: 2,
      popularityTrend: 'stable',
      icon: '🏛️',
      tags: ['culture', 'art', 'indoor']
    },
    {
      name: 'Tour Enogastronomico',
      score: 0,
      category: 'mixed',
      description: 'Degustazione di prodotti tipici e vini locali',
      idealWeather: ['clear', 'partly cloudy', 'cloudy'],
      idealTimeOfDay: ['afternoon', 'evening'],
      seasonality: {
        spring: 7,
        summer: 6,
        autumn: 9,
        winter: 7
      },
      idealTemperatureRange: {
        min: 10,
        max: 30
      },
      weatherSensitivity: 4,
      popularityTrend: 'rising',
      icon: '🍷',
      tags: ['food', 'wine', 'culture']
    },
    {
      name: 'Shopping',
      score: 0,
      category: 'indoor',
      description: 'Shopping nei centri commerciali o nei mercati',
      idealWeather: ['rain', 'cloudy', 'clear'],
      idealTimeOfDay: ['afternoon', 'evening'],
      seasonality: {
        spring: 7,
        summer: 5,
        autumn: 7,
        winter: 8
      },
      idealTemperatureRange: {
        min: 0,
        max: 35
      },
      weatherSensitivity: 3,
      popularityTrend: 'stable',
      icon: '🛍️',
      tags: ['shopping', 'indoor']
    },
    {
      name: 'Parchi e Giardini',
      score: 0,
      category: 'outdoor',
      description: 'Visita parchi urbani, giardini botanici e aree verdi',
      idealWeather: ['clear', 'partly cloudy', 'sun'],
      idealTimeOfDay: ['morning', 'afternoon'],
      seasonality: {
        spring: 10,
        summer: 8,
        autumn: 9,
        winter: 4
      },
      idealTemperatureRange: {
        min: 15,
        max: 30
      },
      weatherSensitivity: 6,
      popularityTrend: 'rising',
      icon: '🌳',
      tags: ['nature', 'relax', 'outdoor']
    },
    {
      name: 'Tour Storico',
      score: 0,
      category: 'mixed',
      description: 'Visita siti storici, monumenti e percorsi della memoria',
      idealWeather: ['clear', 'partly cloudy', 'cloudy'],
      idealTimeOfDay: ['morning', 'afternoon'],
      seasonality: {
        spring: 8,
        summer: 7,
        autumn: 8,
        winter: 6
      },
      idealTemperatureRange: {
        min: 10,
        max: 30
      },
      weatherSensitivity: 5,
      popularityTrend: 'stable',
      icon: '🏰',
      tags: ['history', 'culture', 'sightseeing']
    },
    {
      name: 'Sport Acquatici',
      score: 0,
      category: 'outdoor',
      description: 'Attività come surf, paddle, kayak o vela',
      idealWeather: ['clear', 'sun', 'partly cloudy'],
      idealTimeOfDay: ['morning', 'afternoon'],
      seasonality: {
        spring: 6,
        summer: 10,
        autumn: 5,
        winter: 1
      },
      idealTemperatureRange: {
        min: 20,
        max: 35
      },
      weatherSensitivity: 9,
      popularityTrend: 'rising',
      icon: '🏄',
      tags: ['water', 'sport', 'outdoor']
    },
    {
      name: 'Fotografia',
      score: 0,
      category: 'mixed',
      description: 'Tour fotografici di paesaggi, architettura o vita quotidiana',
      idealWeather: ['clear', 'partly cloudy', 'cloudy', 'golden hour'],
      idealTimeOfDay: ['morning', 'afternoon', 'evening'],
      seasonality: {
        spring: 9,
        summer: 8,
        autumn: 10,
        winter: 7
      },
      idealTemperatureRange: {
        min: 5,
        max: 30
      },
      weatherSensitivity: 6,
      popularityTrend: 'rising',
      icon: '📸',
      tags: ['photography', 'art', 'sightseeing']
    }
  ];
};

/**
 * Genera raccomandazioni di attività basate su meteo, ora e POI disponibili
 */
const generateRecommendations = (
  context: {
    weather: WeatherData;
    location: string;
    time: {
      hour: number;
      timeOfDay: string;
      isWeekend: boolean;
    };
    pois: POI[];
    date?: Date;
  }
): ActivityRecommendation => {
  const { weather, location, time, date = new Date() } = context;
  
  // Ottieni l'elenco base di attività
  const activities = generateActivitiesList();
  
  // Calcola i punteggi per ogni attività
  activities.forEach(activity => {
    // Calcola compatibilità meteo
    const weatherScore = getActivityWeatherCompatibility(activity, weather);
    
    // Calcola compatibilità oraria
    const timeScore = activity.idealTimeOfDay.includes(time.timeOfDay) ? 85 : 50;
    
    // Calcola compatibilità stagionale
    const month = date.getMonth();
    let seasonScore = 50;
    
    if (month >= 2 && month <= 4) { // Primavera
      seasonScore = activity.seasonality.spring * 10;
    } else if (month >= 5 && month <= 7) { // Estate
      seasonScore = activity.seasonality.summer * 10;
    } else if (month >= 8 && month <= 10) { // Autunno
      seasonScore = activity.seasonality.autumn * 10;
    } else { // Inverno
      seasonScore = activity.seasonality.winter * 10;
    }
    
    // Weekend bonus per certe attività
    const weekendBonus = time.isWeekend && (
      activity.name === 'Escursionismo' || 
      activity.name === 'Tour Enogastronomico' ||
      activity.name === 'Sport Acquatici'
    ) ? 10 : 0;
    
    // Calcola punteggio finale pesato
    activity.score = Math.round(
      (weatherScore * 0.5) + // Il meteo è il fattore più importante
      (timeScore * 0.2) +
      (seasonScore * 0.25) +
      weekendBonus
    );
  });
  
  // Ordina attività per punteggio
  const topActivities = [...activities]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  // Ottieni trend attuali
  const currentTrends = getTrendingActivities(date, weather, time.isWeekend);
  
  // Ottieni consiglio stagionale
  const seasonalSuggestion = getSeasonalSuggestion(date, location);
  
  // Genera consigli basati sul meteo
  let weatherBasedTip = '';
  const conditionLower = weather.condition.toLowerCase();
  
  if (conditionLower.includes('rain')) {
    weatherBasedTip = `Con la pioggia prevista oggi a ${location}, considera attività al coperto come musei, centri commerciali o una visita a siti culturali al chiuso.`;
  } else if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    weatherBasedTip = `Approfitta del bel tempo a ${location} per attività all'aperto. La temperatura di ${weather.temperature}°C è ideale per escursioni, sport all'aria aperta o semplicemente rilassarsi in un parco.`;
  } else if (conditionLower.includes('cloud')) {
    weatherBasedTip = `Il cielo nuvoloso a ${location} offre temperature moderate di ${weather.temperature}°C, perfette per esplorare la città senza soffrire il caldo. Porta comunque con te un ombrello, nel caso il tempo cambi.`;
  } else if (conditionLower.includes('snow')) {
    weatherBasedTip = `La neve a ${location} crea un'atmosfera magica. Approfittane per attività invernali come sci o semplicemente per una passeggiata suggestiva nel paesaggio innevato.`;
  } else {
    weatherBasedTip = `Consulta le previsioni meteo aggiornate per ${location} prima di pianificare la giornata. Essere preparati è la chiave per godersi qualsiasi attività al meglio.`;
  }
  
  // Genera consigli basati sull'ora
  let timeBasedTip = '';
  
  if (time.timeOfDay === 'morning') {
    timeBasedTip = 'Le prime ore del giorno sono perfette per attività energizzanti come escursioni, jogging o una visita a un mercato locale. Approfittane prima che i luoghi turistici si affollino.';
  } else if (time.timeOfDay === 'afternoon') {
    timeBasedTip = 'Il pomeriggio è ideale per visite culturali, shopping o semplicemente rilassarsi in un caffè. La luce è perfetta anche per fotografie di qualità.';
  } else if (time.timeOfDay === 'evening') {
    timeBasedTip = 'La sera offre opportunità per esplorare la vita notturna locale, gustare la cucina tipica o partecipare a eventi culturali come concerti o spettacoli.';
  } else { // night
    timeBasedTip = 'Nelle ore notturne, considera attività come osservazione delle stelle, tour fotografici notturni o semplicemente goderti il panorama della città illuminata.';
  }
  
  return {
    topActivities,
    currentTrends,
    seasonalSuggestion,
    weatherBasedTip,
    timeBasedTip
  };
};

/**
 * Fornisce raccomandazioni di fallback in caso di errore
 */
const getFallbackRecommendations = (
  context: {
    weather: WeatherData;
    location: string;
    time: {
      hour: number;
      timeOfDay: string;
      isWeekend: boolean;
    };
    pois: POI[];
    date?: Date;
  }
): ActivityRecommendation => {
  return {
    topActivities: [
      {
        name: 'Esplorazione urbana',
        score: 75,
        category: 'mixed',
        description: 'Esplora le strade e i quartieri della città',
        idealWeather: ['clear', 'partly cloudy'],
        idealTimeOfDay: ['morning', 'afternoon'],
        seasonality: {
          spring: 8,
          summer: 7,
          autumn: 8,
          winter: 6
        },
        idealTemperatureRange: {
          min: 10,
          max: 30
        },
        weatherSensitivity: 5,
        popularityTrend: 'stable',
        icon: '🏙️',
        tags: ['urban', 'culture', 'walking']
      },
      {
        name: 'Cultura locale',
        score: 70,
        category: 'indoor',
        description: 'Musei, gallerie e siti culturali',
        idealWeather: ['rain', 'cloudy'],
        idealTimeOfDay: ['morning', 'afternoon', 'evening'],
        seasonality: {
          spring: 7,
          summer: 7,
          autumn: 7,
          winter: 8
        },
        idealTemperatureRange: {
          min: 0,
          max: 35
        },
        weatherSensitivity: 3,
        popularityTrend: 'stable',
        icon: '🏛️',
        tags: ['culture', 'art', 'history']
      }
    ],
    currentTrends: [
      {
        trend: 'Attività locali',
        description: 'Esperienze autentiche con la cultura locale',
        popularity: 85
      },
      {
        trend: 'Turismo sostenibile',
        description: 'Esperienze a basso impatto ambientale',
        popularity: 80
      }
    ],
    seasonalSuggestion: `Ogni stagione a ${context.location} ha il suo fascino. Adatta le tue attività al clima attuale per un'esperienza ottimale.`,
    weatherBasedTip: 'Controlla sempre le previsioni meteo prima di pianificare le tue attività.',
    timeBasedTip: 'Distribuisci le attività durante la giornata per ottimizzare l\'esperienza in base alla luce e alle temperature.'
  };
};
