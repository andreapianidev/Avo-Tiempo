/**
 * Connectivity Service
 * 
 * Enhanced service for managing connectivity state, offline detection, 
 * and providing network-related utilities throughout the application
 */

import { handleOfflineError, handleNetworkError, ErrorType, AppError } from './errorService';

// Configuration
const CONNECTIVITY_CHECK_INTERVAL = 30000; // 30 seconds
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 2000; // 2 seconds base delay (will be multiplied by attempt number)
const CONNECTIVITY_CHECK_URL = 'https://www.google.com/generate_204';
const CONNECTIVITY_STORAGE_KEY = 'avo_connectivity_state';

// Current state
let isOnline: boolean = navigator.onLine;
let lastConnectivityCheck: number = 0;
let connectivityListeners: Array<(online: boolean) => void> = [];

/**
 * Initialize connectivity listeners
 */
const initConnectivityListeners = (): void => {
  // Browser online/offline events
  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners();
    storeConnectivityState();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners();
    storeConnectivityState();
  });
  
  // Restore state from localStorage if available
  restoreConnectivityState();
  
  // Start polling for connectivity if needed
  if (typeof navigator.onLine === 'undefined') {
    setInterval(checkConnectivity, CONNECTIVITY_CHECK_INTERVAL);
  }
};

/**
 * Store current connectivity state in localStorage
 */
const storeConnectivityState = (): void => {
  try {
    localStorage.setItem(CONNECTIVITY_STORAGE_KEY, JSON.stringify({
      online: isOnline,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to store connectivity state:', e);
  }
};

/**
 * Restore connectivity state from localStorage
 */
const restoreConnectivityState = (): void => {
  try {
    const stateJson = localStorage.getItem(CONNECTIVITY_STORAGE_KEY);
    if (stateJson) {
      const state = JSON.parse(stateJson);
      // Only use stored state if it's recent (last 5 minutes)
      if (Date.now() - state.timestamp < 5 * 60 * 1000) {
        isOnline = state.online;
      }
    }
  } catch (e) {
    console.error('Failed to restore connectivity state:', e);
  }
};

/**
 * Notify all listeners of connectivity changes
 */
const notifyListeners = (): void => {
  connectivityListeners.forEach(listener => {
    try {
      listener(isOnline);
    } catch (e) {
      console.error('Error in connectivity listener:', e);
    }
  });
};

/**
 * Actively check connectivity by making a small request
 */
const checkConnectivity = async (): Promise<boolean> => {
  // Don't check too often
  if (Date.now() - lastConnectivityCheck < CONNECTIVITY_CHECK_INTERVAL) {
    return isOnline;
  }
  
  lastConnectivityCheck = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(CONNECTIVITY_CHECK_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const wasOnline = isOnline;
    isOnline = response.ok;
    
    // If state changed, notify listeners
    if (wasOnline !== isOnline) {
      notifyListeners();
      storeConnectivityState();
    }
    
    return isOnline;
  } catch (e) {
    const wasOnline = isOnline;
    isOnline = false;
    
    // If state changed, notify listeners
    if (wasOnline !== isOnline) {
      notifyListeners();
      storeConnectivityState();
    }
    
    return false;
  }
};

/**
 * Register a listener for connectivity changes
 * @returns Unsubscribe function
 */
const listenToConnectivityChanges = (callback: (online: boolean) => void): () => void => {
  connectivityListeners.push(callback);
  
  // Immediately call with current state
  setTimeout(() => callback(isOnline), 0);
  
  // Return unsubscribe function
  return () => {
    connectivityListeners = connectivityListeners.filter(cb => cb !== callback);
  };
};

/**
 * Check if device is currently offline
 */
const isOffline = (): boolean => {
  return !isOnline;
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxAttempts Maximum number of attempts (default: 3)
 * @param baseDelay Base delay in ms (default: 2000)
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>, 
  maxAttempts: number = RETRY_MAX_ATTEMPTS,
  baseDelay: number = RETRY_DELAY_BASE
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check connectivity before attempting
      if (attempt > 1 && isOffline()) {
        throw handleOfflineError(new Error('Device is offline'));
      }
      
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if we're offline or it's not a network error
      if (isOffline() || 
          (error as AppError)?.type !== ErrorType.NETWORK && 
          (error as AppError)?.type !== ErrorType.API) {
        throw error;
      }
      
      // If this is the last attempt, don't wait, just throw
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Wait with exponential backoff before retrying
      const delay = baseDelay * attempt;
      console.log(`Retry attempt ${attempt}/${maxAttempts} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should not be reached, but TypeScript requires a return
  throw lastError;
};

/**
 * Make a fetch request with retry, offline detection, and error handling
 */
const fetchWithRetry = async (
  url: string, 
  options?: RequestInit, 
  maxAttempts: number = RETRY_MAX_ATTEMPTS
): Promise<Response> => {
  return retryWithBackoff(async () => {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw handleNetworkError(
          new Error(`HTTP error ${response.status}: ${response.statusText}`), 
          `Error ${response.status}: ${response.statusText}`
        );
      }
      
      return response;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw handleNetworkError(error, 'Error de conexión al servidor');
      }
      
      // Handle abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw handleNetworkError(error, 'La solicitud ha sido cancelada por tiempo de espera');
      }
      
      // Re-throw other errors
      throw error;
    }
  }, maxAttempts);
};

// Initialize connectivity listeners
initConnectivityListeners();

export const connectivityService = {
  listenToConnectivityChanges,
  isOffline,
  checkConnectivity,
  retryWithBackoff,
  fetchWithRetry
};

export default connectivityService;
