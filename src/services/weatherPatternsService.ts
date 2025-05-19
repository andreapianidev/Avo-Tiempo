// Servizio per l'analisi dei pattern meteorologici e tendenze
import { WeatherData } from './weatherService';
import cacheService, { CacheNamespace } from './cacheService';
import { getAIInsight } from './aiService';
import { ErrorType, createError, logError } from './errorService';

// Interfacce per i risultati dell'analisi
export interface WeatherPatternResult {
  pattern: string;
  description: string;
  confidence: number;  // 0-100
  similarHistoricalDates?: string[];
  anomalies?: {
    type: string;
    severity: number;  // 0-10
    description: string;
  }[];
  trendDirection: 'improving' | 'deteriorating' | 'stable';
  trendDescription: string;
  trendIcon: string;
}

export interface HistoricalComparison {
  currentTemperature: number;
  historicalAverage: number;
  deviation: number;
  deviationPercentage: number;
  isUnusual: boolean;
  comparisonText: string;
  comparisonIcon: string;
}

// Periodo di validità della cache (2 ore)
const CACHE_TTL = 2 * 60 * 60 * 1000;

/**
 * Analizza i dati meteorologici per identificare pattern e tendenze
 * Confronta con dati storici e fornisce previsioni sulle tendenze future
 */
export const analyzeWeatherPatterns = async (
  weatherData: WeatherData,
  location: string,
  forecastDays: number = 7
): Promise<WeatherPatternResult> => {
  try {
    // Validazione dei dati di input
    if (!weatherData || !location) {
      throw createError(
        ErrorType.VALIDATION,
        'Dati meteo o posizione mancanti',
        null,
        'Impossibile analizzare i pattern senza dati meteo o posizione'
      );
    }
    
    // Verifica nella cache
    const cacheKey = `weather_pattern_${location}_${weatherData.temperature}_${weatherData.condition}_${forecastDays}`;
    const cachedResult = cacheService.getCacheItem<WeatherPatternResult>(CacheNamespace.AI_INSIGHTS, cacheKey);
    
    if (cachedResult) {
      console.log('[WEATHER PATTERNS] Returning cached weather pattern analysis');
      return cachedResult;
    }
    
    // In una implementazione reale, qui ci sarebbe l'elaborazione dei dati storici
    // e l'uso di algoritmi per individuare pattern ricorrenti
    // Per questa demo, generiamo risultati simulati basati sui dati disponibili
    
    const result = generatePatternAnalysis(weatherData, location, forecastDays);
    
    // Salva in cache
    cacheService.setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('[WEATHER PATTERNS] Error analyzing weather patterns:', error);
    // Utilizziamo il sistema centralizzato di gestione errori
    const appError = createError(
      ErrorType.WEATHER_DATA, 
      'Errore nell\'analisi dei pattern meteorologici',
      error,
      'Si è verificato un errore durante l\'analisi dei dati meteorologici',
      undefined,
      'PATTERN_ANALYSIS_ERROR'
    );
    logError(appError);
    
    // Fornisci un risultato di fallback in caso di errore
    return getFallbackPatternAnalysis(weatherData, location);
  }
};

/**
 * Confronta il meteo attuale con i dati storici per lo stesso periodo dell'anno
 */
export const compareWithHistoricalData = async (
  weatherData: WeatherData,
  location: string,
  date: Date = new Date()
): Promise<HistoricalComparison> => {
  try {
    // Validazione dei dati di input
    if (!weatherData || !location) {
      throw createError(
        ErrorType.VALIDATION,
        'Dati meteo o posizione mancanti',
        null,
        'Impossibile confrontare con dati storici senza dati meteo o posizione'
      );
    }
    
    // Validazione della data
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('[WEATHER PATTERNS] Data non valida, utilizzo data corrente');
      date = new Date();
    }
    
    // Verifica nella cache
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const cacheKey = `historical_comparison_${location}_${month}_${day}`;
    const cachedResult = cacheService.getCacheItem<HistoricalComparison>(CacheNamespace.AI_INSIGHTS, cacheKey);
    
    if (cachedResult) {
      console.log('[WEATHER PATTERNS] Returning cached historical comparison');
      return cachedResult;
    }
    
    // In una implementazione reale, qui ci sarebbe l'interrogazione di un database
    // con dati storici meteorologici per la localizzazione specificata
    // Per questa demo, generiamo dati storici simulati
    
    const result = generateHistoricalComparison(weatherData, location, date);
    
    // Salva in cache
    cacheService.setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error('[WEATHER PATTERNS] Error comparing with historical data:', error);
    // Utilizziamo il sistema centralizzato di gestione errori
    const appError = createError(
      ErrorType.WEATHER_DATA, 
      'Errore nel confronto con dati storici',
      error,
      'Si è verificato un errore durante il confronto con i dati meteorologici storici',
      undefined,
      'HISTORICAL_COMPARISON_ERROR'
    );
    logError(appError);
    
    // Fornisci un risultato di fallback in caso di errore
    return getFallbackHistoricalComparison(weatherData, location);
  }
};

/**
 * Genera un'analisi simulata dei pattern meteorologici
 */
const generatePatternAnalysis = (
  weatherData: WeatherData,
  location: string,
  forecastDays: number
): WeatherPatternResult => {
  const { temperature, humidity, windSpeed, condition } = weatherData;
  const conditionLower = condition.toLowerCase();
  
  // Identifica il pattern meteorologico di base
  let pattern = '';
  let description = '';
  let trendDirection: 'improving' | 'deteriorating' | 'stable' = 'stable';
  let confidence = 75 + Math.floor(Math.random() * 15); // Base confidence 75-90%
  
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    pattern = 'Sistema di bassa pressione';
    description = 'Un sistema di bassa pressione sta portando umidità sulla zona';
    trendDirection = 'improving';
    confidence -= 5; // Precipitazioni sono meno prevedibili
  } else if (conditionLower.includes('cloud')) {
    pattern = 'Strato nuvoloso persistente';
    description = 'Presenza di uno strato nuvoloso stabile associato con un fronte debole';
    trendDirection = Math.random() > 0.5 ? 'improving' : 'stable';
  } else if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    pattern = 'Alta pressione stabile';
    description = 'Sistema di alta pressione che porta tempo stabile e soleggiato';
    trendDirection = temperature > 30 ? 'deteriorating' : 'stable';
  } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
    pattern = 'Inversione termica';
    description = 'Inversione termica che intrappola l\'umidità negli strati bassi';
    trendDirection = 'improving';
    confidence -= 10; // Nebbia è difficile da prevedere
  } else if (conditionLower.includes('snow')) {
    pattern = 'Fronte freddo attivo';
    description = 'Un fronte freddo sta portando temperature basse e precipitazioni nevose';
    trendDirection = 'improving';
  } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
    pattern = 'Instabilità atmosferica intensa';
    description = 'Condizioni di forte instabilità con possibilità di temporali';
    trendDirection = 'deteriorating';
    confidence -= 15; // Temporali sono molto variabili
  } else {
    pattern = 'Condizioni miste';
    description = 'Pattern meteorologico variabile con possibili cambiamenti';
    trendDirection = 'stable';
    confidence -= 10;
  }
  
  // Aggiungi informazioni su eventuali anomalie
  const anomalies = [];
  
  if (temperature > 35) {
    anomalies.push({
      type: 'Ondata di calore',
      severity: 8,
      description: 'Temperature significativamente sopra la media stagionale'
    });
  } else if (temperature < 5 && !conditionLower.includes('snow')) {
    anomalies.push({
      type: 'Freddo anomalo',
      severity: 7,
      description: 'Temperature insolitamente basse per questo periodo'
    });
  }
  
  if (windSpeed > 50) {
    anomalies.push({
      type: 'Vento forte',
      severity: 6,
      description: 'Vento persistente con velocità superiore alla norma'
    });
  }
  
  if (humidity > 90 && !conditionLower.includes('rain')) {
    anomalies.push({
      type: 'Umidità elevata',
      severity: 4,
      description: 'Livelli di umidità significativamente alti'
    });
  }
  
  // Descrizione della tendenza
  let trendDescription = '';
  let trendIcon = '';
  
  switch (trendDirection) {
    case 'improving':
      trendDescription = 'Le condizioni stanno migliorando nelle prossime ' + forecastDays + ' giorni, con una graduale stabilizzazione';
      trendIcon = '↗️';
      break;
    case 'deteriorating':
      trendDescription = 'Si prevede un peggioramento nelle prossime ' + forecastDays + ' giorni, con possibile instabilità';
      trendIcon = '↘️';
      break;
    case 'stable':
      trendDescription = 'Condizioni generalmente stabili previste per i prossimi ' + forecastDays + ' giorni';
      trendIcon = '➡️';
      break;
  }
  
  // Simula date storiche simili
  const similarHistoricalDates = [
    '15 Maggio 2024',
    '3 Giugno 2023',
    '22 Maggio 2021'
  ];
  
  return {
    pattern,
    description,
    confidence,
    similarHistoricalDates,
    anomalies: anomalies.length > 0 ? anomalies : undefined,
    trendDirection,
    trendDescription,
    trendIcon
  };
};

/**
 * Genera un confronto simulato con dati storici
 */
const generateHistoricalComparison = (
  weatherData: WeatherData,
  location: string,
  date: Date
): HistoricalComparison => {
  const { temperature } = weatherData;
  const month = date.getMonth();
  
  // Simula temperature medie storiche in base al mese
  // Queste sarebbero normalmente recuperate da un database climatico
  const historicalAverages = [
    15, // Gennaio
    16, // Febbraio
    17, // Marzo
    19, // Aprile
    22, // Maggio
    25, // Giugno
    28, // Luglio
    28, // Agosto
    26, // Settembre
    22, // Ottobre
    18, // Novembre
    16  // Dicembre
  ];
  
  const historicalAverage = historicalAverages[month];
  const deviation = temperature - historicalAverage;
  const deviationPercentage = (deviation / historicalAverage) * 100;
  const isUnusual = Math.abs(deviation) > 5;
  
  let comparisonText = '';
  let comparisonIcon = '';
  
  if (deviation > 5) {
    comparisonText = `Oggi è notevolmente più caldo della media storica per ${location} in questo periodo. La temperatura attuale di ${temperature}°C è di ${deviation.toFixed(1)}°C sopra la media storica di ${historicalAverage}°C.`;
    comparisonIcon = '🔥';
  } else if (deviation > 2) {
    comparisonText = `Oggi è più caldo della media per ${location} in questo periodo. La temperatura attuale di ${temperature}°C è di ${deviation.toFixed(1)}°C sopra la media storica di ${historicalAverage}°C.`;
    comparisonIcon = '☀️';
  } else if (deviation < -5) {
    comparisonText = `Oggi è notevolmente più freddo della media storica per ${location} in questo periodo. La temperatura attuale di ${temperature}°C è di ${Math.abs(deviation).toFixed(1)}°C sotto la media storica di ${historicalAverage}°C.`;
    comparisonIcon = '❄️';
  } else if (deviation < -2) {
    comparisonText = `Oggi è più freddo della media per ${location} in questo periodo. La temperatura attuale di ${temperature}°C è di ${Math.abs(deviation).toFixed(1)}°C sotto la media storica di ${historicalAverage}°C.`;
    comparisonIcon = '🌡️';
  } else {
    comparisonText = `La temperatura di oggi è in linea con la media storica per ${location} in questo periodo. La temperatura attuale di ${temperature}°C è vicina alla media storica di ${historicalAverage}°C.`;
    comparisonIcon = '📊';
  }
  
  return {
    currentTemperature: temperature,
    historicalAverage,
    deviation,
    deviationPercentage,
    isUnusual,
    comparisonText,
    comparisonIcon
  };
};

/**
 * Fornisce un'analisi di fallback in caso di errore
 */
const getFallbackPatternAnalysis = (
  weatherData: WeatherData,
  location: string
): WeatherPatternResult => {
  return {
    pattern: 'Pattern non identificato',
    description: 'Non è stato possibile determinare un pattern meteorologico specifico con i dati disponibili',
    confidence: 50,
    trendDirection: 'stable',
    trendDescription: 'Previsione di tendenza non disponibile al momento',
    trendIcon: '❓'
  };
};

/**
 * Fornisce un confronto storico di fallback in caso di errore
 */
const getFallbackHistoricalComparison = (
  weatherData: WeatherData,
  location: string
): HistoricalComparison => {
  return {
    currentTemperature: weatherData.temperature,
    historicalAverage: weatherData.temperature,
    deviation: 0,
    deviationPercentage: 0,
    isUnusual: false,
    comparisonText: `Confronto con dati storici non disponibile per ${location} al momento.`,
    comparisonIcon: '❓'
  };
};
