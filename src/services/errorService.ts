/**
 * Error types for the application
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  LOCATION = 'LOCATION_ERROR',
  STORAGE = 'STORAGE_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Application error interface
 */
export interface AppError {
  type: ErrorType;
  message: string;
  detail?: string; // Campo per dettagli aggiuntivi sull'errore
  originalError?: any;
  timestamp: number;
}

/**
 * Create a standardized application error
 * @param type - Type of error from ErrorType enum
 * @param message - Primary error message
 * @param originalError - Original error object or additional data
 * @param detail - Optional detailed message to provide more context
 */
export const createError = (
  type: ErrorType, 
  message: string, 
  originalError?: any,
  detail?: string
): AppError => {
  return {
    type,
    message,
    detail,
    originalError,
    timestamp: Date.now()
  };
};

// Storage key for errors
const ERROR_STORAGE_KEY = 'avo_weather_errors';
const MAX_STORED_ERRORS = 50;

/**
 * Log an error to console and optionally store it for analytics
 */
export const logError = (error: AppError, storeError: boolean = true): void => {
  console.error(`[${error.type}] ${error.message}`, error.originalError || '');
  
  if (storeError) {
    try {
      // Get existing errors
      const errorsJson = localStorage.getItem(ERROR_STORAGE_KEY);
      const errors = errorsJson ? JSON.parse(errorsJson) : [];
      
      // Add new error
      errors.push(error);
      
      // Keep only the most recent errors
      const recentErrors = errors.slice(-MAX_STORED_ERRORS);
      
      // Save to localStorage
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(recentErrors));
    } catch (e) {
      // If we can't store the error, just log it
      console.error('Failed to store error:', e);
    }
  }
};

/**
 * Handle network errors
 */
export const handleNetworkError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Network error. Please check your internet connection.';
  const appError = createError(ErrorType.NETWORK, message, error);
  logError(appError);
  return appError;
};

/**
 * Handle API errors
 */
export const handleApiError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error communicating with weather service.';
  const appError = createError(ErrorType.API, message, error);
  logError(appError);
  return appError;
};

/**
 * Handle location errors
 */
export const handleLocationError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error processing location data.';
  const appError = createError(ErrorType.LOCATION, message, error);
  logError(appError);
  return appError;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'No se pudo conectar al servidor. Por favor, comprueba tu conexión a internet.';
      
    case ErrorType.API:
      return 'No se pudieron obtener los datos meteorológicos. Inténtalo de nuevo más tarde.';
      
    case ErrorType.LOCATION:
      // Check for specific location errors
      if (error.message.includes('already exists')) {
        return 'Esta ubicación ya está guardada.';
      }
      if (error.message.includes('not found')) {
        return 'No se pudo encontrar esta ubicación. Comprueba el nombre e inténtalo de nuevo.';
      }
      return 'Error al procesar la ubicación. Inténtalo de nuevo.';
      
    case ErrorType.STORAGE:
      return 'Error al guardar los datos. Es posible que algunas funciones no estén disponibles.';
      
    case ErrorType.VALIDATION:
      return error.message || 'Por favor, comprueba los datos introducidos e inténtalo de nuevo.';
      
    default:
      return 'Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.';
  }
};
