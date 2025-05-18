import { logError, handleApiError, ErrorType } from './errorService';

// AEMET API token
const AEMET_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmRyZWFwaWFuaS5kZXZAZ21haWwuY29tIiwianRpIjoiZTRiOGJhOWMtNmMyMS00ZmQ4LWI3ODEtMThmMTBiYzk1OTRiIiwiaXNzIjoiQUVNRVQiLCJpYXQiOjE3NDczMDUyOTksInVzZXJJZCI6ImU0YjhiYTljLTZjMjEtNGZkOC1iNzgxLTE4ZjEwYmM5NTk0YiIsInJvbGUiOiIifQ.vGLVP33tdCaeUPw0APaxiCHCSe3G9aGCxGDDqHvJUWk';

// AEMET API base URL
const AEMET_BASE_URL = 'https://opendata.aemet.es/opendata/api';

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
 * Per semplicità usiamo corsproxy.io che è sufficiente per lo sviluppo.
 */
const withCorsProxy = (url: string): string => {
  return isDevEnvironment ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url;
};

/**
 * Fetches weather alerts from AEMET API
 */
const fetchAemetAlerts = async (): Promise<WeatherAlert[]> => {
  try {
    // First API call to get the data URL
    const response = await fetch(withCorsProxy(`${AEMET_BASE_URL}/avisos_cap/?api_key=${AEMET_API_KEY}`));
    
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
    
    // Filter alerts for Canary Islands
    const canaryProvinces = ['Las Palmas', 'Santa Cruz de Tenerife', 'Tenerife', 'Gran Canaria', 'Lanzarote', 'Fuerteventura', 'La Palma', 'La Gomera', 'El Hierro'];
    const canaryAlerts = alertsData.filter(alert => 
      canaryProvinces.some(province => 
        alert.provincia.includes(province) || alert.nombreZona.includes(province)
      )
    );
    
    return normalizeAemetAlerts(canaryAlerts);
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
const fetchOpenWeatherAlerts = async (lat: number, lon: number): Promise<WeatherAlert[]> => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&exclude=current,minutely,hourly,daily`
    );
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const alerts = data.alerts || [];
    
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
    const response = await fetch(
      withCorsProxy(`${AEMET_BASE_URL}/prediccion/especifica/municipio/diaria/${municipalityId}?api_key=${AEMET_API_KEY}`)
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
 * Gets weather alerts with fallback strategy
 * First tries AEMET, then falls back to OpenWeather if AEMET fails
 */
const getWeatherAlerts = async (lat: number, lon: number): Promise<WeatherAlert[]> => {
  try {
    // Try AEMET first
    const aemetAlerts = await fetchAemetAlerts();
    
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
