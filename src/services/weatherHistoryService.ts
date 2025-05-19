import { cacheService, CacheNamespace } from './cacheService';
import { WeatherData } from './weatherService';
import { createError, ErrorType } from './errorService';

const CACHE_TTL = 60 * 60 * 24 * 365; // 1 anno (vogliamo conservare lo storico a lungo)
const MAX_SNAPSHOTS = 50; // Limite massimo di snapshot memorizzabili

export interface WeatherSnapshot {
  id: string;
  timestamp: number;
  weatherData: WeatherData;
  note?: string;
  tags?: string[];
}

/**
 * Salva uno snapshot delle condizioni meteo correnti
 */
export const saveWeatherSnapshot = async (
  weatherData: WeatherData,
  note?: string,
  tags?: string[]
): Promise<WeatherSnapshot> => {
  try {
    // Recupera snapshots esistenti
    const snapshots = await getWeatherSnapshots();
    
    // Crea nuovo snapshot
    const snapshot: WeatherSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      weatherData,
      note,
      tags
    };
    
    // Aggiungi nuovo snapshot all'inizio dell'array
    const updatedSnapshots = [snapshot, ...snapshots];
    
    // Mantieni solo i più recenti se oltre il limite
    const trimmedSnapshots = updatedSnapshots.slice(0, MAX_SNAPSHOTS);
    
    // Salva nella cache
    cacheService.setCacheItem(CacheNamespace.WEATHER_DATA, 'snapshots', trimmedSnapshots, CACHE_TTL);
    
    console.log(`[WeatherHistory] Salvato nuovo snapshot ID: ${snapshot.id}`);
    
    return snapshot;
  } catch (error) {
    console.error('Error saving weather snapshot:', error);
    throw createError(ErrorType.CACHE, 'Errore nel salvataggio dello snapshot meteo');
  }
};

/**
 * Recupera tutti gli snapshot salvati
 */
export const getWeatherSnapshots = async (): Promise<WeatherSnapshot[]> => {
  try {
    const snapshots = cacheService.getCacheItem<WeatherSnapshot[]>(CacheNamespace.WEATHER_DATA, 'snapshots');
    return snapshots || [];
  } catch (error) {
    console.error('Error retrieving weather snapshots:', error);
    return [];
  }
};

/**
 * Recupera uno snapshot specifico tramite ID
 */
export const getWeatherSnapshotById = async (id: string): Promise<WeatherSnapshot | null> => {
  try {
    const snapshots = await getWeatherSnapshots();
    return snapshots.find(snapshot => snapshot.id === id) || null;
  } catch (error) {
    console.error('Error retrieving weather snapshot by ID:', error);
    return null;
  }
};

/**
 * Elimina uno snapshot tramite ID
 */
export const deleteWeatherSnapshot = async (id: string): Promise<boolean> => {
  try {
    const snapshots = await getWeatherSnapshots();
    const updatedSnapshots = snapshots.filter(snapshot => snapshot.id !== id);
    
    // Se la lunghezza è uguale, lo snapshot non esisteva
    if (updatedSnapshots.length === snapshots.length) {
      return false;
    }
    
    // Salva nella cache
    cacheService.setCacheItem(CacheNamespace.WEATHER_DATA, 'snapshots', updatedSnapshots, CACHE_TTL);
    console.log(`[WeatherHistory] Eliminato snapshot ID: ${id}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting weather snapshot:', error);
    return false;
  }
};

/**
 * Aggiorna le informazioni di uno snapshot esistente
 */
export const updateWeatherSnapshot = async (
  id: string,
  updates: { note?: string; tags?: string[] }
): Promise<WeatherSnapshot | null> => {
  try {
    const snapshots = await getWeatherSnapshots();
    const index = snapshots.findIndex(snapshot => snapshot.id === id);
    
    if (index === -1) {
      return null;
    }
    
    // Aggiorna lo snapshot
    const updatedSnapshot = {
      ...snapshots[index],
      ...updates
    };
    
    snapshots[index] = updatedSnapshot;
    
    // Salva nella cache
    cacheService.setCacheItem(CacheNamespace.WEATHER_DATA, 'snapshots', snapshots, CACHE_TTL);
    console.log(`[WeatherHistory] Aggiornato snapshot ID: ${id}`);
    
    return updatedSnapshot;
  } catch (error) {
    console.error('Error updating weather snapshot:', error);
    return null;
  }
};

/**
 * Cerca snapshot per tag o note
 */
export const searchWeatherSnapshots = async (query: string): Promise<WeatherSnapshot[]> => {
  try {
    const snapshots = await getWeatherSnapshots();
    const lowerQuery = query.toLowerCase();
    
    return snapshots.filter(snapshot => {
      // Cerca nei tag
      if (snapshot.tags && snapshot.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        return true;
      }
      
      // Cerca nelle note
      if (snapshot.note && snapshot.note.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Cerca nella località
      if (snapshot.weatherData.location.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Cerca nella condizione
      if (snapshot.weatherData.condition.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      return false;
    });
  } catch (error) {
    console.error('Error searching weather snapshots:', error);
    return [];
  }
};

/**
 * Recupera snapshot filtrati per data
 */
export const getWeatherSnapshotsByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<WeatherSnapshot[]> => {
  try {
    const snapshots = await getWeatherSnapshots();
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    return snapshots.filter(snapshot => {
      return snapshot.timestamp >= startTimestamp && snapshot.timestamp <= endTimestamp;
    });
  } catch (error) {
    console.error('Error retrieving weather snapshots by date range:', error);
    return [];
  }
};
