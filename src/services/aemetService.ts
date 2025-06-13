import { logError, handleApiError, ErrorType } from './errorService';
import { logInfo } from '../utils/logger';

// AEMET API base URL
const AEMET_BASE_URL = 'https://opendata.aemet.es/opendata/api';

// AEMET API token
const AEMET_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmRyZWFwaWFuaS5kZXZAZ21haWwuY29tIiwianRpIjoiZTRiOGJhOWMtNmMyMS00ZmQ4LWI3ODEtMThmMTBiYzk1OTRiIiwiaXNzIjoiQUVNRVQiLCJpYXQiOjE3NDczMDUyOTksInVzZXJJZCI6ImU0YjhiYTljLTZjMjEtNGZkOC1iNzgxLTE4ZjEwYmM5NTk0YiIsInJvbGUiOiIifQ.vGLVP33tdCaeUPw0APaxiCHCSe3G9aGCxGDDqHvJUWk';

// Funzione helper per creare URL AEMET con API key
const createAemetUrl = (endpoint: string) => {
  return `${AEMET_BASE_URL}${endpoint}?api_key=${AEMET_API_KEY}`;
};

// Endpoint base per ottenere gli avvisi meteo (CORRETTO: rimosso /api duplicato)
const AEMET_ALERTS_BASE_ENDPOINT = '/avisos_cap/ultimoelaborado/area';

// Aree geografiche disponibili in AEMET
export enum AemetArea {
  CANARIAS = 'can',        // Isole Canarie
  PENINSULA = 'esp',       // Penisola Iberica
  BALEARES = 'bal',        // Isole Baleari
  ANDALUCIA = 'and',       // Andalusia
  ARAGON = 'arn',          // Aragona
  ASTURIAS = 'ast',        // Asturie
  CANTABRIA = 'coo',       // Cantabria
  CASTILLA_LEON = 'cle',   // Castiglia e León
  CASTILLA_MANCHA = 'clm', // Castiglia-La Mancia
  CATALUNA = 'cat',        // Catalogna
  VALENCIA = 'val',        // Comunità Valenciana
  EXTREMADURA = 'ext',     // Estremadura
  GALICIA = 'gal',         // Galizia
  MADRID = 'mad',          // Madrid
  MURCIA = 'mur',          // Murcia
  NAVARRA = 'nav',         // Navarra
  PAIS_VASCO = 'pva',      // Paesi Baschi
  RIOJA = 'rio'            // La Rioja
}

// Area predefinita (Canarie)
const DEFAULT_AREA = AemetArea.CANARIAS;

// OpenWeather API key (using the one from the DEVELOPERS.md)
const OPENWEATHER_KEY = 'b33c9835879f888134e97c6d58d6e4a7';

// Types for AEMET API responses
export interface AemetApiResponse {
  descripcion: string;
  estado: number;
  datos: string; // URL to fetch the actual data
  metadatos: string;
}

export interface AemetAlert {
  idAviso: string;
  idPrediction: string;
  nombreZona: string;
  provincia: string;
  descripcion: string;
  nivelAviso: string; // "amarillo", "naranja", "rojo"
  fechaInicio: string;
  fechaFin: string;
  fenomeno: {
    nombre: string;
    descripcion: string;
  };
}

// Types for OpenWeather alerts as backup
export interface OpenWeatherAlert {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

export interface WeatherAlert {
  source: 'AEMET' | 'OpenWeather';
  id: string;
  zone: string;
  province: string;
  description: string;
  level: 'yellow' | 'orange' | 'red' | 'unknown';
  startTime: Date;
  endTime: Date;
  phenomenon: string;
}

/**
 * Converts AEMET alert level to standardized format
 */
const mapAlertLevel = (level: string): 'yellow' | 'orange' | 'red' | 'unknown' => {
  switch (level.toLowerCase()) {
    case 'amarillo':
      return 'yellow';
    case 'naranja':
      return 'orange';
    case 'rojo':
      return 'red';
    default:
      return 'unknown';
  }
};

/**
 * Normalizes AEMET alerts to a standard format
 */
const normalizeAemetAlerts = (alerts: AemetAlert[]): WeatherAlert[] => {
  return alerts.map(alert => ({
    source: 'AEMET',
    id: alert.idAviso,
    zone: alert.nombreZona,
    province: alert.provincia,
    description: alert.descripcion,
    level: mapAlertLevel(alert.nivelAviso),
    startTime: new Date(alert.fechaInicio),
    endTime: new Date(alert.fechaFin),
    phenomenon: alert.fenomeno.nombre,
  }));
};

/**
 * Normalizes OpenWeather alerts to a standard format
 */
const normalizeOpenWeatherAlerts = (alerts: OpenWeatherAlert[]): WeatherAlert[] => {
  return alerts.map((alert, index) => ({
    source: 'OpenWeather',
    id: `ow-${index}-${alert.start}`,
    zone: alert.sender_name,
    province: alert.sender_name.split(' ')[0] || 'Unknown',
    description: alert.description,
    level: 'unknown',  // OpenWeather doesn't provide color-coded levels
    startTime: new Date(alert.start * 1000),
    endTime: new Date(alert.end * 1000),
    phenomenon: alert.event,
  }));
};

// Detect if we are running on localhost (development) to bypass CORS with a public proxy
const isDevEnvironment = typeof window !== 'undefined' && window.location.hostname === 'localhost';

/**
 * Aggiunge automaticamente un proxy CORS durante lo sviluppo locale. In produzione la URL rimane invariata.
 * Utilizziamo un sistema di proxy CORS con fallback multipli per maggiore resilienza.
 */
const corsProxies = [
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Indice del proxy attualmente in uso
let currentProxyIndex = 0;

// Contatore di fallimenti per proxy
const proxyFailures: Record<number, number> = {};

/**
 * Cambia proxy dopo un fallimento
 */
const rotateProxy = () => {
  currentProxyIndex = (currentProxyIndex + 1) % corsProxies.length;
  logInfo('CORS', `Rotating to CORS proxy ${currentProxyIndex + 1}/${corsProxies.length}`);
  return currentProxyIndex;
};

/**
 * Aggiunge un proxy CORS in ambiente di sviluppo
 */
const withCorsProxy = (url: string): string => {
  if (!isDevEnvironment) return url; // In produzione non usiamo proxy
  
  // In sviluppo usiamo un proxy con sistema di fallback
  return corsProxies[currentProxyIndex](url);
};

// Mappa delle province per area
const areaProvinces: Record<AemetArea, string[]> = {
  [AemetArea.CANARIAS]: ['Las Palmas', 'Santa Cruz de Tenerife', 'Tenerife', 'Gran Canaria', 'Lanzarote', 'Fuerteventura', 'La Palma', 'La Gomera', 'El Hierro'],
  [AemetArea.PENINSULA]: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante'],
  [AemetArea.BALEARES]: ['Mallorca', 'Menorca', 'Ibiza', 'Formentera', 'Palma'],
  [AemetArea.ANDALUCIA]: ['Sevilla', 'Málaga', 'Cádiz', 'Granada', 'Córdoba', 'Almería', 'Jaén', 'Huelva'],
  [AemetArea.ARAGON]: ['Zaragoza', 'Huesca', 'Teruel'],
  [AemetArea.ASTURIAS]: ['Oviedo', 'Gijón', 'Avilés'],
  [AemetArea.CANTABRIA]: ['Santander', 'Torrelavega'],
  [AemetArea.CASTILLA_LEON]: ['Valladolid', 'Burgos', 'Salamanca', 'León', 'Palencia', 'Zamora', 'Segovia', 'Soria', 'Ávila'],
  [AemetArea.CASTILLA_MANCHA]: ['Toledo', 'Ciudad Real', 'Albacete', 'Guadalajara', 'Cuenca'],
  [AemetArea.CATALUNA]: ['Barcelona', 'Tarragona', 'Lérida', 'Gerona'],
  [AemetArea.VALENCIA]: ['Valencia', 'Alicante', 'Castellón'],
  [AemetArea.EXTREMADURA]: ['Badajoz', 'Cáceres'],
  [AemetArea.GALICIA]: ['La Coruña', 'Pontevedra', 'Lugo', 'Orense'],
  [AemetArea.MADRID]: ['Madrid'],
  [AemetArea.MURCIA]: ['Murcia', 'Cartagena'],
  [AemetArea.NAVARRA]: ['Pamplona'],
  [AemetArea.PAIS_VASCO]: ['Bilbao', 'San Sebastián', 'Vitoria'],
  [AemetArea.RIOJA]: ['Logroño']
};

/**
 * Fetches weather alerts from AEMET API for a specific area
 * @param area - Area code to fetch alerts for (default: Canary Islands)
 */
const fetchAemetAlerts = async (area: AemetArea = DEFAULT_AREA): Promise<WeatherAlert[]> => {
  try {
    // First API call to get the data URL
    const alertsEndpoint = `${AEMET_ALERTS_BASE_ENDPOINT}/${area}`;
    const response = await fetch(withCorsProxy(createAemetUrl(alertsEndpoint)));
    
    if (!response.ok) {
      throw new Error(`AEMET API error: ${response.status} ${response.statusText}`);
    }
    
    const apiResponse: AemetApiResponse = await response.json();
    
    if (apiResponse.estado !== 200 || !apiResponse.datos) {
      throw new Error(`AEMET API returned error state: ${apiResponse.estado}`);
    }
    
    // Second API call to get the actual data
    const dataResponse = await fetch(withCorsProxy(apiResponse.datos));
    
    if (!dataResponse.ok) {
      throw new Error(`AEMET data fetch error: ${dataResponse.status} ${dataResponse.statusText}`);
    }
    
    const alertsData: AemetAlert[] = await dataResponse.json();
    
    // Filter alerts for the specified area using the corresponding provinces
    const provinces = areaProvinces[area];
    const filteredAlerts = alertsData.filter(alert => 
      provinces.some(province => 
        alert.provincia.includes(province) || alert.nombreZona.includes(province)
      )
    );
    
    return normalizeAemetAlerts(filteredAlerts);
  } catch (error) {
    logError({
      type: ErrorType.API,
      message: `Failed to fetch AEMET alerts: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now()
    });
    return [];
  }
};

/**
 * Fetches weather alerts from OpenWeather API as a backup
 */
/**
 * Verifica se un codice di condizione meteo OpenWeather rappresenta una condizione estrema
 * che dovrebbe generare un avviso
 */
const isExtremeCondition = (conditionCode: number): boolean => {
  // Codici di condizioni meteorologiche estreme secondo la documentazione OpenWeather
  // https://openweathermap.org/weather-conditions
  const extremeConditions = [
    // Temporali
    200, 201, 202, 210, 211, 212, 221, 230, 231, 232,
    // Pioggia intensa
    502, 503, 504, 511, 522, 531,
    // Neve intensa
    602, 622,
    // Atmosfera pericolosa
    762, 771, 781
  ];
  
  return extremeConditions.includes(conditionCode);
};

// Utilizziamo solo l'API gratuita per i dati meteo come specificato nei requisiti
const fetchOpenWeatherAlerts = async (lat: number, lon: number): Promise<WeatherAlert[]> => {
  try {
    // Utilizziamo l'API gratuita di OpenWeather
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric&lang=es`
    );
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // L'API gratuita non ha una proprietà alerts diretta, ma possiamo usare informazioni dal campo weather
    // per generare avvisi basati sulle condizioni meteo attuali
    const weatherCondition = data.weather && data.weather[0];
    const alerts: OpenWeatherAlert[] = [];
    
    if (weatherCondition && isExtremeCondition(weatherCondition.id)) {
      alerts.push({
        event: weatherCondition.main,
        description: weatherCondition.description,
        start: Date.now(),
        end: Date.now() + 3600000, // Assumiamo un'ora di durata
        sender_name: 'OpenWeather API Free',
        tags: [weatherCondition.main.toLowerCase()]
      });
    }
    
    return normalizeOpenWeatherAlerts(alerts);
  } catch (error) {
    logError({
      type: ErrorType.API,
      message: `Failed to fetch OpenWeather alerts: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now()
    });
    return [];
  }
};

/**
 * Fetches daily weather forecasts for a specific municipality
 * @param municipalityId AEMET municipality ID
 */
const fetchMunicipalityForecast = async (municipalityId: string) => {
  try {
    // First API call to get the data URL
    const forecastEndpoint = `/prediccion/especifica/municipio/diaria/${municipalityId}`;
    const response = await fetch(
      withCorsProxy(createAemetUrl(forecastEndpoint))
    );
    
    if (!response.ok) {
      throw new Error(`AEMET API error: ${response.status} ${response.statusText}`);
    }
    
    const apiResponse: AemetApiResponse = await response.json();
    
    if (apiResponse.estado !== 200 || !apiResponse.datos) {
      throw new Error(`AEMET API returned error state: ${apiResponse.estado}`);
    }
    
    // Second API call to get the actual data
    const dataResponse = await fetch(withCorsProxy(apiResponse.datos));
    
    if (!dataResponse.ok) {
      throw new Error(`AEMET data fetch error: ${dataResponse.status} ${dataResponse.statusText}`);
    }
    
    return await dataResponse.json();
  } catch (error) {
    logError({
      type: ErrorType.API,
      message: `Failed to fetch AEMET municipality forecast: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now()
    });
    return null;
  }
};

/**
 * Determina l'area AEMET appropriata in base alle coordinate geografiche
 * @param lat - Latitudine
 * @param lon - Longitudine
 */
const determineAemetArea = (lat: number, lon: number): AemetArea => {
  // Isole Canarie approssimativamente tra lat 27-29.5 e lon -18.5--13
  if (lat >= 27 && lat <= 29.5 && lon >= -18.5 && lon <= -13) {
    return AemetArea.CANARIAS;
  }
  // Isole Baleari approssimativamente tra lat 38.5-40 e lon 1-4.5
  if (lat >= 38.5 && lat <= 40 && lon >= 1 && lon <= 4.5) {
    return AemetArea.BALEARES;
  }
  // Per altre località della Spagna continentale, determina l'area in base a coordinate più precise
  // Questo è un approccio semplificato; un'implementazione completa richiederebbe un sistema di geocoding più sofisticato
  
  // Se non riusciamo a determinare un'area specifica, usiamo la penisola iberica come default
  return AemetArea.PENINSULA;
};

/**
 * Gets weather alerts with fallback strategy
 * First tries AEMET, then falls back to OpenWeather if AEMET fails
 * @param lat - Latitude of the location
 * @param lon - Longitude of the location
 * @param area - Optional AEMET area code. If not provided, will be determined from coordinates
 */
const getWeatherAlerts = async (lat: number, lon: number, area?: AemetArea): Promise<WeatherAlert[]> => {
  try {
    // Determina l'area AEMET appropriata se non specificata
    const aemetArea = area || determineAemetArea(lat, lon);
    
    // Try AEMET first
    const aemetAlerts = await fetchAemetAlerts(aemetArea);
    
    if (aemetAlerts.length > 0) {
      return aemetAlerts;
    }
    
    // If no AEMET alerts or if AEMET failed, try OpenWeather
    return await fetchOpenWeatherAlerts(lat, lon);
  } catch (error) {
    logError({
      type: ErrorType.API,
      message: `Failed to get weather alerts: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now()
    });
    return [];
  }
};

// Common municipality IDs for Canary Islands
const CANARY_MUNICIPALITY_IDS = {
  'Santa Cruz de Tenerife': '38038',
  'Las Palmas de Gran Canaria': '35016',
  'La Laguna': '38023',
  'Arrecife': '35004',
  'Puerto del Rosario': '35018',
  'San Cristóbal de La Laguna': '38023',
  'Santa Cruz de La Palma': '38037',
  'Valverde': '38048',
  'San Sebastián de La Gomera': '38036'
};

export const aemetService = {
  getWeatherAlerts,
  fetchMunicipalityForecast,
  CANARY_MUNICIPALITY_IDS
};
