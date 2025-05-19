/**
 * Error types for the application
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  API = 'API_ERROR',
  LOCATION = 'LOCATION_ERROR',
  STORAGE = 'STORAGE_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  OFFLINE = 'OFFLINE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  CONNECTIVITY = 'CONNECTIVITY_ERROR',
  POI = 'POI_ERROR',
  AI_SERVICE = 'AI_SERVICE_ERROR',
  WEATHER_DATA = 'WEATHER_DATA_ERROR',
  CACHE = 'CACHE_ERROR',
  CAPACITOR = 'CAPACITOR_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',      // Non-critical errors that don't affect core functionality
  MEDIUM = 'MEDIUM', // Errors that affect some features but the app can still function
  HIGH = 'HIGH',    // Critical errors that significantly impact the app's functionality
  FATAL = 'FATAL'   // Errors that prevent the app from functioning at all
}

/**
 * Error recovery suggestions
 */
export interface ErrorRecovery {
  actionType: 'RETRY' | 'RELOAD' | 'CLEAR_CACHE' | 'CHECK_CONNECTION' | 'CHECK_PERMISSIONS' | 'CONTACT_SUPPORT' | 'NONE';
  actionLabel: string;
  actionDescription: string;
}

/**
 * Application error interface
 */
export interface AppError {
  type: ErrorType;
  message: string;
  detail?: string; // Additional details about the error
  originalError?: any;
  timestamp: number;
  severity?: ErrorSeverity;
  code?: string;
  recovery?: ErrorRecovery;
  context?: Record<string, any>; // Additional context about when the error occurred
  isUserVisible?: boolean; // Whether this error should be shown to the user
}

/**
 * Create a standardized application error
 * @param type - Type of error from ErrorType enum
 * @param message - Primary error message
 * @param originalError - Original error object or additional data
 * @param detail - Optional detailed message to provide more context
 * @param severity - Error severity level
 * @param code - Error code for easier tracking
 * @param recovery - Recovery suggestion
 * @param context - Additional context about when the error occurred
 * @param isUserVisible - Whether this error should be shown to the user
 */
export const createError = (
  type: ErrorType, 
  message: string, 
  originalError?: any,
  detail?: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  code?: string,
  recovery?: ErrorRecovery,
  context?: Record<string, any>,
  isUserVisible: boolean = true
): AppError => {
  return {
    type,
    message,
    detail,
    originalError,
    timestamp: Date.now(),
    severity,
    code,
    recovery,
    context,
    isUserVisible
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
  const message = customMessage || 'Error de red. Por favor, comprueba tu conexión a internet.';
  const recovery: ErrorRecovery = {
    actionType: 'CHECK_CONNECTION',
    actionLabel: 'Verificar conexión',
    actionDescription: 'Verifica tu conexión a internet e inténtalo de nuevo'
  };
  const appError = createError(
    ErrorType.NETWORK, 
    message, 
    error, 
    'Se produjo un error de red al intentar comunicarse con el servidor',
    ErrorSeverity.MEDIUM,
    'NET_ERR_01',
    recovery
  );
  logError(appError);
  return appError;
};

/**
 * Handle API errors
 */
export const handleApiError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error al comunicarse con el servicio meteorológico.';
  const recovery: ErrorRecovery = {
    actionType: 'RETRY',
    actionLabel: 'Reintentar',
    actionDescription: 'Intenta de nuevo en unos momentos'
  };
  const appError = createError(
    ErrorType.API, 
    message, 
    error, 
    'Error en la respuesta de la API',
    ErrorSeverity.MEDIUM,
    'API_ERR_01',
    recovery
  );
  logError(appError);
  return appError;
};

/**
 * Handle location errors
 */
export const handleLocationError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error al procesar datos de ubicación.';
  const recovery: ErrorRecovery = {
    actionType: 'RETRY',
    actionLabel: 'Reintentar',
    actionDescription: 'Intenta buscar la ubicación nuevamente'
  };
  const appError = createError(
    ErrorType.LOCATION, 
    message, 
    error, 
    'Error al procesar o encontrar la ubicación solicitada',
    ErrorSeverity.MEDIUM,
    'LOC_ERR_01',
    recovery
  );
  logError(appError);
  return appError;
};

/**
 * Handle permission errors
 */
export const handlePermissionError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Permiso denegado. La aplicación necesita permisos para funcionar correctamente.';
  const recovery: ErrorRecovery = {
    actionType: 'CHECK_PERMISSIONS',
    actionLabel: 'Verificar permisos',
    actionDescription: 'Verifica los permisos de la aplicación en la configuración del dispositivo'
  };
  const appError = createError(
    ErrorType.PERMISSION, 
    message, 
    error, 
    'Se requieren permisos para acceder a esta funcionalidad',
    ErrorSeverity.HIGH,
    'PERM_ERR_01',
    recovery
  );
  logError(appError);
  return appError;
};

/**
 * Handle offline errors
 */
export const handleOfflineError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Estás desconectado. Algunas funciones no están disponibles sin conexión.';
  const recovery: ErrorRecovery = {
    actionType: 'CHECK_CONNECTION',
    actionLabel: 'Verificar conexión',
    actionDescription: 'Conéctate a internet para acceder a todas las funciones'
  };
  const appError = createError(
    ErrorType.OFFLINE, 
    message, 
    error, 
    'La aplicación está en modo sin conexión',
    ErrorSeverity.MEDIUM,
    'OFF_ERR_01',
    recovery,
    undefined,
    true
  );
  logError(appError);
  return appError;
};

/**
 * Handle rate limit errors
 */
export const handleRateLimitError = (error: any, customMessage?: string, retryAfterSeconds?: number): AppError => {
  const message = customMessage || `Demasiadas solicitudes. Por favor, espera ${retryAfterSeconds || 30} segundos.`;
  const recovery: ErrorRecovery = {
    actionType: 'RETRY',
    actionLabel: 'Reintentar más tarde',
    actionDescription: `Intenta de nuevo después de ${retryAfterSeconds || 30} segundos`
  };
  const appError = createError(
    ErrorType.RATE_LIMIT, 
    message, 
    error, 
    'Se ha alcanzado el límite de solicitudes al servidor',
    ErrorSeverity.MEDIUM,
    'RATE_ERR_01',
    recovery,
    { retryAfterSeconds }
  );
  logError(appError);
  return appError;
};

/**
 * Handle POI errors
 */
export const handlePOIError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error al obtener lugares cercanos.';
  const recovery: ErrorRecovery = {
    actionType: 'RETRY',
    actionLabel: 'Reintentar',
    actionDescription: 'Intenta buscar lugares cercanos nuevamente'
  };
  const appError = createError(
    ErrorType.POI, 
    message, 
    error, 
    'Error al procesar datos de puntos de interés',
    ErrorSeverity.LOW,
    'POI_ERR_01',
    recovery
  );
  logError(appError);
  return appError;
};

/**
 * Handle AI service errors
 */
export const handleAIServiceError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error al generar recomendaciones inteligentes.';
  const recovery: ErrorRecovery = {
    actionType: 'RETRY',
    actionLabel: 'Reintentar',
    actionDescription: 'Intenta generar recomendaciones nuevamente'
  };
  const appError = createError(
    ErrorType.AI_SERVICE, 
    message, 
    error, 
    'Error al procesar la solicitud al servicio de IA',
    ErrorSeverity.LOW,
    'AI_ERR_01',
    recovery
  );
  logError(appError, true);
  return appError;
};

/**
 * Handle cache errors
 */
export const handleCacheError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error al acceder a datos almacenados localmente.';
  const recovery: ErrorRecovery = {
    actionType: 'CLEAR_CACHE',
    actionLabel: 'Limpiar caché',
    actionDescription: 'Limpiar datos almacenados e intentar de nuevo'
  };
  const appError = createError(
    ErrorType.CACHE, 
    message, 
    error, 
    'Error al leer o escribir datos en el almacenamiento local',
    ErrorSeverity.MEDIUM,
    'CACHE_ERR_01',
    recovery
  );
  logError(appError, true);
  return appError;
};

/**
 * Handle weather data errors
 */
export const handleWeatherDataError = (error: any, customMessage?: string): AppError => {
  const message = customMessage || 'Error al procesar datos meteorológicos.';
  const recovery: ErrorRecovery = {
    actionType: 'RETRY',
    actionLabel: 'Actualizar',
    actionDescription: 'Intentar obtener datos actualizados'
  };
  const appError = createError(
    ErrorType.WEATHER_DATA, 
    message, 
    error, 
    'Error al procesar o interpretar los datos meteorológicos recibidos',
    ErrorSeverity.MEDIUM,
    'WEATHER_ERR_01',
    recovery
  );
  logError(appError, true);
  return appError;
};

/**
 * Get user-friendly error message with potential recovery action
 */
export const getUserFriendlyErrorMessage = (error: AppError): string => {
  // If the error has a detailed message, use it directly
  if (error.detail && error.isUserVisible !== false) {
    return error.message;
  }
  
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
      
    case ErrorType.PERMISSION:
      return 'Necesitamos tu permiso para acceder a esta función. Por favor, revisa la configuración.';
    
    case ErrorType.OFFLINE:
      return 'Estás actualmente sin conexión. Algunas funciones pueden no estar disponibles.';
    
    case ErrorType.RATE_LIMIT:
      const retryAfter = error.context?.retryAfterSeconds || 30;
      return `Demasiadas solicitudes. Por favor, espera ${retryAfter} segundos antes de intentarlo de nuevo.`;
    
    case ErrorType.TIMEOUT:
      return 'La solicitud ha tardado demasiado tiempo. Por favor, inténtalo de nuevo más tarde.';
    
    case ErrorType.CONNECTIVITY:
      return 'Hay problemas de conectividad. Verifica tu conexión a internet e inténtalo de nuevo.';
    
    case ErrorType.POI:
      return 'No se pudieron obtener los lugares cercanos. Inténtalo de nuevo más tarde.';
    
    case ErrorType.AI_SERVICE:
      return 'No se pudieron generar recomendaciones inteligentes en este momento.';
    
    case ErrorType.WEATHER_DATA:
      return 'Error al obtener datos meteorológicos actualizados. Mostrando información que podría no estar actualizada.';
    
    case ErrorType.CACHE:
      return 'Error al acceder a datos guardados. Algunas configuraciones podrían haberse restablecido.';
      
    default:
      return 'Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.';
  }
};

/**
 * Get recovery action for an error
 */
export const getErrorRecoveryAction = (error: AppError): ErrorRecovery | null => {
  if (error.recovery) {
    return error.recovery;
  }
  
  // Default recovery actions based on error type
  switch (error.type) {
    case ErrorType.NETWORK:
    case ErrorType.CONNECTIVITY:
      return {
        actionType: 'CHECK_CONNECTION',
        actionLabel: 'Verificar conexión',
        actionDescription: 'Verifica tu conexión a internet e inténtalo de nuevo'
      };
    
    case ErrorType.API:
    case ErrorType.TIMEOUT:
    case ErrorType.POI:
    case ErrorType.AI_SERVICE:
      return {
        actionType: 'RETRY',
        actionLabel: 'Reintentar',
        actionDescription: 'Intenta de nuevo'
      };
    
    case ErrorType.CACHE:
      return {
        actionType: 'CLEAR_CACHE',
        actionLabel: 'Limpiar caché',
        actionDescription: 'Limpiar datos guardados e intentar de nuevo'
      };
    
    case ErrorType.PERMISSION:
      return {
        actionType: 'CHECK_PERMISSIONS',
        actionLabel: 'Revisar permisos',
        actionDescription: 'Revisar los permisos de la aplicación'
      };
      
    default:
      return null;
  }
};

/**
 * Check if an error is critical and requires immediate attention
 */
export const isErrorCritical = (error: AppError): boolean => {
  return error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.FATAL;
};

/**
 * Get all stored errors for debugging and analytics
 */
export const getStoredErrors = (): AppError[] => {
  try {
    const errorsJson = localStorage.getItem(ERROR_STORAGE_KEY);
    return errorsJson ? JSON.parse(errorsJson) : [];
  } catch (e) {
    console.error('Failed to retrieve stored errors:', e);
    return [];
  }
};

/**
 * Clear stored errors
 */
export const clearStoredErrors = (): boolean => {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('Failed to clear stored errors:', e);
    return false;
  }
};
