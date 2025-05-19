/**
 * Cache Service
 * 
 * Enhanced service for data caching with TTL, versioning, and error handling
 * Provides structured local storage for different data types, with automatic expiration
 */

import { ErrorType, createError, AppError, logError } from './errorService';

// Cache configuration
const DEFAULT_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const CACHE_VERSION = '1.0.0'; // Update whenever cache structure changes
const CACHE_PREFIX = 'avo_cache_';

// Cache types
export enum CacheNamespace {
  WEATHER = 'weather', // General weather namespace, if used elsewhere
  LOCATIONS = 'locations',
  SETTINGS = 'settings',
  POI = 'poi',
  AI_INSIGHTS = 'ai_insights',
  ALERTS = 'alerts',
  UI_STATE = 'ui_state',
  WEATHER_DATA = 'weather_data', // Specific for detailed weather objects
  ACTIVITIES = 'activities' // For activities with ratings and recommendations
}

// Cache item structure
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

/**
 * Get cache key
 * @param namespace The data namespace
 * @param key The cache key
 */
const getCacheKey = (namespace: CacheNamespace, key: string): string => {
  return `${CACHE_PREFIX}${namespace}_${key}`;
};

/**
 * Get namespace prefix
 * @param namespace The data namespace
 */
const getNamespacePrefix = (namespace: CacheNamespace): string => {
  return `${CACHE_PREFIX}${namespace}_`;
};

/**
 * Set a value in the cache
 * @param namespace The data namespace (weather, locations, etc)
 * @param key The cache key within the namespace
 * @param data The data to cache
 * @param ttl Time to live in milliseconds (default: 1 hour)
 */
export const setCacheItem = <T>(namespace: CacheNamespace, key: string, data: T, ttl: number): boolean => {
  try {
    const cacheKey = getCacheKey(namespace, key);
    const cacheItem: CacheItem<T> = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl,
      version: CACHE_VERSION
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    return true;
  } catch (error) {
    // Gestione più specifica dei diversi tipi di errori
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(`[CACHE] Storage quota exceeded while setting cache item ${key}:`, error);
      const appError = createError(ErrorType.STORAGE, 'Storage quota exceeded', error, 
        'La memoria locale è piena, impossibile salvare nuovi dati in cache');
      logError(appError);
    } else {
      console.error(`[CACHE] Error setting cache item ${key}:`, error);
      const appError = createError(ErrorType.CACHE, 'Error setting cache item', error);
      logError(appError);
    }
    return false;
  }
};

/**
 * Get a value from the cache
 * @param namespace The data namespace (weather, locations, etc)
 * @param key The cache key within the namespace
 */
export const getCacheItem = <T>(namespace: CacheNamespace, key: string): T | null => {
  try {
    const cacheKey = getCacheKey(namespace, key);
    const cachedItem = localStorage.getItem(cacheKey);
    
    if (!cachedItem) {
      return null;
    }
    
    // Parsing con gestione errori migliorata
    let parsedItem: CacheItem<T>;
    try {
      parsedItem = JSON.parse(cachedItem);
    } catch (parseError) {
      console.error(`[CACHE] JSON parsing error for ${key}:`, parseError);
      localStorage.removeItem(cacheKey); // Rimuove i dati corrotti
      const appError = createError(ErrorType.CACHE, 'Cache corruption detected', parseError, 
        'Dati cache corrotti rimossi automaticamente');
      logError(appError);
      return null;
    }
    
    // Check if the cache item has expired
    if (Date.now() - parsedItem.timestamp > parsedItem.ttl) {
      // Remove expired item
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsedItem.data;
  } catch (error) {
    console.error(`[CACHE] Error getting cache item ${key}:`, error);
    const appError = createError(ErrorType.CACHE, 'Error retrieving cache item', error);
    logError(appError);
    return null;
  }
};

/**
 * Check if a cache item exists and is valid
 * @param namespace The data namespace
 * @param key The cache key
 */
export const hasCacheItem = (namespace: CacheNamespace, key: string): boolean => {
  try {
    const cacheKey = getCacheKey(namespace, key);
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return false;
    }
    
    const cacheItem = JSON.parse(cachedData);
    
    // Check cache version
    if (cacheItem.version !== CACHE_VERSION) {
      removeCacheItem(namespace, key);
      return false;
    }
    
    // Check expiration
    if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`[CACHE] Error checking cache item ${namespace}.${key}:`, error);
    return false;
  }
};

/**
 * Get cache item age in milliseconds
 * @param namespace The data namespace
 * @param key The cache key
 */
export const getCacheItemAge = (namespace: CacheNamespace, key: string): number | null => {
  try {
    const cacheKey = getCacheKey(namespace, key);
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    const cacheItem = JSON.parse(cachedData);
    return Date.now() - cacheItem.timestamp;
  } catch (error) {
    console.error(`[CACHE] Error getting cache item age ${namespace}.${key}:`, error);
    return null;
  }
};

/**
 * Remove a cache item
 * @param namespace The data namespace
 * @param key The cache key
 */
export const removeCacheItem = (namespace: CacheNamespace, key: string): boolean => {
  try {
    const cacheKey = getCacheKey(namespace, key);
    localStorage.removeItem(cacheKey);
    return true;
  } catch (error) {
    console.error(`[CACHE] Error removing cache item ${namespace}.${key}:`, error);
    return false;
  }
};

/**
 * Remove all cache items in a namespace
 * @param namespace The data namespace to clear
 */
export const clearNamespace = (namespace: CacheNamespace): boolean => {
  try {
    const prefix = getNamespacePrefix(namespace);
    const keysToRemove: string[] = [];
    
    // Find all keys in this namespace
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all found keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return true;
  } catch (error) {
    console.error(`[CACHE] Error clearing namespace ${namespace}:`, error);
    return false;
  }
};

/**
 * Get all keys in a namespace
 * @param namespace The data namespace
 * @returns List of keys in the namespace
 */
const getAllNamespaceKeys = (namespace: CacheNamespace): string[] => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_PREFIX}${namespace}_`)) {
        keys.push(key);
      }
    }
    return keys;
  } catch (error) {
    console.error(`[CACHE] Error getting all keys for namespace ${namespace}:`, error);
    const appError = createError(ErrorType.CACHE, `Error getting all keys for namespace ${namespace}`, error);
    logError(appError);
    return [];
  }
};

/**
 * Clear all cache items in a specific namespace
 * @param namespace The cache namespace to clear
 * @returns Boolean indicating success or failure
 */
export const clearCacheByNamespace = (namespace: CacheNamespace): boolean => {
  try {
    // Get all localStorage keys
    const localStorageKeys = Object.keys(localStorage);
    
    // Filter keys by namespace prefix
    const namespacePrefix = getNamespacePrefix(namespace);
    const keysToRemove = localStorageKeys.filter(key => key.startsWith(namespacePrefix));
    
    if (keysToRemove.length === 0) {
      console.log(`[CACHE] No items found for namespace ${namespace}`);
      return true; // Non ci sono elementi da rimuovere, consideriamo l'operazione un successo
    }
    
    // Remove all matching keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.warn(`[CACHE] Unable to remove key ${key}:`, removeError);
        // Continua con gli altri elementi anche se uno fallisce
      }
    });
    
    console.log(`[CACHE] Successfully cleared ${keysToRemove.length} items from namespace ${namespace}`);
    return true;
  } catch (error) {
    console.error(`[CACHE] Error clearing cache for namespace ${namespace}:`, error);
    const appError = createError(ErrorType.CACHE, `Error clearing cache for namespace ${namespace}`, error);
    logError(appError);
    return false;
  }
};

/**
 * Clear all expired cache items across all namespaces
 */
export const clearExpiredItems = (): void => {
  try {
    const keysToCheck: {namespace: CacheNamespace, key: string}[] = [];
    const prefix = CACHE_PREFIX;
    
    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(prefix)) {
        // Extract namespace and key
        const withoutPrefix = fullKey.substring(prefix.length);
        const firstUnderscore = withoutPrefix.indexOf('_');
        
        if (firstUnderscore !== -1) {
          const namespace = withoutPrefix.substring(0, firstUnderscore) as CacheNamespace;
          const key = withoutPrefix.substring(firstUnderscore + 1);
          keysToCheck.push({ namespace, key });
        }
      }
    }
    
    // Check each key for expiration
    keysToCheck.forEach(({ namespace, key }) => {
      try {
        const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          const cacheItem = JSON.parse(cachedData);
          
          // Remove if version mismatch or expired
          if (cacheItem.version !== CACHE_VERSION || 
              Date.now() - cacheItem.timestamp > cacheItem.ttl) {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        // Remove corrupted items
        console.error(`[Cache] Error processing ${namespace}.${key}, removing:`, error);
        removeCacheItem(namespace, key);
      }
    });
  } catch (error) {
    console.error(`[Cache] Error clearing expired items:`, error);
  }
};

/**
 * Get all cache items in a namespace
 * @param namespace The data namespace
 * @returns Record with cache keys and their values
 */
export const getNamespaceItems = <T>(namespace: CacheNamespace): Record<string, T> => {
  try {
    const result: Record<string, T> = {};
    const prefix = `${CACHE_PREFIX}${namespace}_`;
    
    // Find all keys in this namespace
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(prefix)) {
        try {
          const cachedData = localStorage.getItem(fullKey);
          if (cachedData) {
            const cacheItem: CacheItem<T> = JSON.parse(cachedData);
            
            // Skip expired or version mismatch items
            if (cacheItem.version !== CACHE_VERSION || 
                Date.now() - cacheItem.timestamp > cacheItem.ttl) {
              continue;
            }
            
            // Extract key without prefix
            const key = fullKey.substring(prefix.length);
            result[key] = cacheItem.data;
          }
        } catch (itemError) {
          console.error(`[Cache] Error processing item ${fullKey}:`, itemError);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`[Cache] Error getting namespace items ${namespace}:`, error);
    return {};
  }
};

/**
 * Update part of a cached object
 * @param namespace The data namespace
 * @param key The cache key
 * @param partialValue Partial object to merge with existing cached object
 */
export const updateCacheItem = <T extends Record<string, any>>(
  namespace: CacheNamespace,
  key: string,
  partialValue: Partial<T>
): boolean => {
  try {
    const currentValue = getCacheItem<T>(namespace, key);
    
    if (!currentValue) {
      return false;
    }
    
    // Merge values
    const updatedValue = { ...currentValue, ...partialValue };
    
    // Get current TTL if possible
    let ttl = DEFAULT_CACHE_TTL;
    try {
      const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const cacheItem = JSON.parse(cachedData);
        ttl = cacheItem.ttl;
      }
    } catch (ttlError) {
      console.error(`[Cache] Error getting TTL for ${namespace}.${key}:`, ttlError);
    }
    
    // Save updated value
    return setCacheItem(namespace, key, updatedValue, ttl);
  } catch (error) {
    console.error(`[Cache] Error updating cache item ${namespace}.${key}:`, error);
    return false;
  }
};

// Initialize service - clean expired items on startup
clearExpiredItems();

// Export complete service
export const cacheService = {
  setCacheItem,
  getCacheItem,
  hasCacheItem,
  getCacheItemAge,
  removeCacheItem,
  clearNamespace,
  clearExpiredItems,
  getNamespaceItems,
  updateCacheItem,
  getAllNamespaceKeys // Aggiungo questa funzione all'esportazione
};

export default cacheService;
