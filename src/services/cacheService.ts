/**
 * Cache Service
 * 
 * Enhanced service for data caching with TTL, versioning, and error handling
 * Provides structured local storage for different data types, with automatic expiration
 */

import { handleCacheError, ErrorType, AppError } from './errorService';

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
  WEATHER_DATA = 'weather_data' // Specific for detailed weather objects
}

// Cache item structure
interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  version: string;
}

/**
 * Set a value in the cache
 * @param namespace The data namespace (weather, locations, etc)
 * @param key The cache key within the namespace
 * @param value The data to cache
 * @param ttl Time to live in milliseconds (default: 1 hour)
 */
export const setCacheItem = <T>(
  namespace: CacheNamespace, 
  key: string, 
  value: T, 
  ttl: number = DEFAULT_CACHE_TTL
): boolean => {
  try {
    const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
    const cacheItem: CacheItem<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      version: CACHE_VERSION
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    return true;
  } catch (error) {
    console.error(`[Cache] Error setting cache item ${namespace}.${key}:`, error);
    return false;
  }
};

/**
 * Get a value from the cache
 * @param namespace The data namespace (weather, locations, etc)
 * @param key The cache key within the namespace
 * @param defaultValue Default value to return if item is not in cache or expired
 */
export const getCacheItem = <T>(
  namespace: CacheNamespace, 
  key: string, 
  defaultValue: T | null = null
): T | null => {
  try {
    const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return defaultValue;
    }
    
    const cacheItem: CacheItem<T> = JSON.parse(cachedData);
    
    // Check cache version
    if (cacheItem.version !== CACHE_VERSION) {
      removeCacheItem(namespace, key);
      return defaultValue;
    }
    
    // Check expiration
    if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
      return defaultValue;
    }
    
    return cacheItem.value;
  } catch (error) {
    console.error(`[Cache] Error getting cache item ${namespace}.${key}:`, error);
    
    // Handle cache errors gracefully
    const appError = handleCacheError(error, `Error al recuperar datos en caché para ${namespace}.${key}`);
    
    // Remove corrupted cache item
    try {
      removeCacheItem(namespace, key);
    } catch (removeError) {
      console.error(`[Cache] Failed to remove corrupted cache item:`, removeError);
    }
    
    return defaultValue;
  }
};

/**
 * Check if a cache item exists and is valid
 * @param namespace The data namespace
 * @param key The cache key
 */
export const hasCacheItem = (namespace: CacheNamespace, key: string): boolean => {
  try {
    const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
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
    console.error(`[Cache] Error checking cache item ${namespace}.${key}:`, error);
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
    const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    const cacheItem = JSON.parse(cachedData);
    return Date.now() - cacheItem.timestamp;
  } catch (error) {
    console.error(`[Cache] Error getting cache item age ${namespace}.${key}:`, error);
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
    const cacheKey = `${CACHE_PREFIX}${namespace}_${key}`;
    localStorage.removeItem(cacheKey);
    return true;
  } catch (error) {
    console.error(`[Cache] Error removing cache item ${namespace}.${key}:`, error);
    return false;
  }
};

/**
 * Remove all cache items in a namespace
 * @param namespace The data namespace to clear
 */
export const clearNamespace = (namespace: CacheNamespace): boolean => {
  try {
    const prefix = `${CACHE_PREFIX}${namespace}_`;
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
    console.error(`[Cache] Error clearing namespace ${namespace}:`, error);
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
            result[key] = cacheItem.value;
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
  updateCacheItem
};

export default cacheService;
