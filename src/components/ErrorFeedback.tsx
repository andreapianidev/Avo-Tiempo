import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faInfoCircle, 
  faWifi,
  faRotate, 
  faTimesCircle,
  faTrash,
  faCog,
  faExclamationCircle,
  faServer,
  faSkull,
  faLightbulb,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { isOffline, listenToConnectivityChanges } from '../services/appStateService';
import { 
  AppError, 
  ErrorType, 
  ErrorSeverity,
  getUserFriendlyErrorMessage,
  getErrorRecoveryAction,
  isErrorCritical
} from '../services/errorService';

interface ErrorFeedbackProps {
  error: AppError | null;
  onRetry?: () => void; 
  onDismiss?: () => void;
  className?: string;
}

/**
 * Componente avanzado para mostrar errores y feedback al usuario
 * Gestiona el estado offline, errores con acciones de recuperación y diferentes niveles de severidad
 */
const ErrorFeedback: React.FC<ErrorFeedbackProps> = ({ 
  error, 
  onRetry, 
  onDismiss,
  className = ''
}) => {
  const [offline, setOffline] = useState(isOffline);

  // Ascolta i cambiamenti di connettività
  useEffect(() => {
    const unsubscribe = listenToConnectivityChanges((online) => {
      setOffline(!online);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Se non c'è un errore ma siamo offline, mostra avviso di connettività
  if (!error && offline) {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 ${className}`}>
        <div className="flex items-start">
          <FontAwesomeIcon 
            icon={faWifi} 
            className="text-amber-600 dark:text-amber-400 mt-1 mr-3"
          />
          <div className="flex-1">
            <p className="text-amber-800 dark:text-amber-300 font-medium">
              Modalità offline attiva
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
              Stai visualizzando dati salvati localmente. Alcune funzionalità potrebbero essere limitate.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Se non c'è un errore e siamo online, non mostrare nulla
  if (!error) return null;
  
  // Obtener la acción de recuperación recomendada para este error
  const recoveryAction = error ? getErrorRecoveryAction(error) : null;
  const isCritical = error ? isErrorCritical(error) : false;
  
  // Determinar los estilos basándose en el tipo y severidad del error
  let iconColor = 'text-red-600 dark:text-red-400';
  let bgColor = 'bg-red-50 dark:bg-red-900/30';
  let borderColor = 'border-red-200 dark:border-red-800';
  let textColor = 'text-red-800 dark:text-red-300';
  let icon = faExclamationTriangle;
  
  if (error) {
    // Determinar colores por severidad
    if (error.severity === ErrorSeverity.LOW) {
      iconColor = 'text-blue-600 dark:text-blue-400';
      bgColor = 'bg-blue-50 dark:bg-blue-900/30';
      borderColor = 'border-blue-200 dark:border-blue-800';
      textColor = 'text-blue-800 dark:text-blue-300';
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      iconColor = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-50 dark:bg-amber-900/30';
      borderColor = 'border-amber-200 dark:border-amber-800';
      textColor = 'text-amber-800 dark:text-amber-300';
    } else if (error.severity === ErrorSeverity.HIGH) {
      iconColor = 'text-red-600 dark:text-red-400';
      bgColor = 'bg-red-50 dark:bg-red-900/30';
      borderColor = 'border-red-200 dark:border-red-800';
      textColor = 'text-red-800 dark:text-red-300';
    } else if (error.severity === ErrorSeverity.FATAL) {
      iconColor = 'text-purple-600 dark:text-purple-400';
      bgColor = 'bg-purple-50 dark:bg-purple-900/30';
      borderColor = 'border-purple-200 dark:border-purple-800';
      textColor = 'text-purple-800 dark:text-purple-300';
    }
    
    // Personalizar icono según tipo de error
    switch (error.type) {
      case ErrorType.NETWORK:
      case ErrorType.CONNECTIVITY:
        icon = faWifi;
        break;
      case ErrorType.VALIDATION:
        icon = faInfoCircle;
        break;
      case ErrorType.PERMISSION:
        icon = faCog;
        break;
      case ErrorType.OFFLINE:
        icon = faWifi;
        break;
      case ErrorType.RATE_LIMIT:
        icon = faServer;
        break;
      case ErrorType.POI:
        icon = faMapMarkerAlt;
        break;
      case ErrorType.AI_SERVICE:
        icon = faLightbulb;
        break;
      case ErrorType.CACHE:
        icon = faTrash;
        break;
      case ErrorType.API:
        icon = faServer;
        break;
      case ErrorType.UNKNOWN:
        icon = isCritical ? faSkull : faExclamationCircle;
        break;
      default:
        icon = faExclamationTriangle;
        break;
    }
  }
  
  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-start">
        <FontAwesomeIcon 
          icon={icon} 
          className={`${iconColor} mt-1 mr-3`}
        />
        <div className="flex-1">
          <p className={`${textColor} font-medium`}>
            {getUserFriendlyErrorMessage(error)}
          </p>
          {error.detail && (
            <p className={`${textColor} text-sm mt-1 opacity-80`}>
              {error.detail}
            </p>
          )}
          
          {/* Botones de acción */}
          <div className="flex mt-3 space-x-2">
            {/* Acciones de recuperación recomendadas */}
            {recoveryAction && (
              <button 
                onClick={() => {
                  if (recoveryAction.actionType === 'RETRY' && onRetry) {
                    onRetry();
                  } else if (recoveryAction.actionType === 'RELOAD') {
                    window.location.reload();
                  } else if (recoveryAction.actionType === 'CLEAR_CACHE') {
                    // Clear relevant caches
                    localStorage.removeItem('avo_weather_cache');
                    if (onRetry) onRetry();
                  } else if (recoveryAction.actionType === 'CHECK_CONNECTION') {
                    // Show network settings or info
                    if (onRetry) onRetry();
                  }
                }}
                className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
                title={recoveryAction.actionDescription}
              >
                <FontAwesomeIcon 
                  icon={
                    recoveryAction.actionType === 'RETRY' ? faRotate :
                    recoveryAction.actionType === 'RELOAD' ? faRotate :
                    recoveryAction.actionType === 'CLEAR_CACHE' ? faTrash :
                    recoveryAction.actionType === 'CHECK_CONNECTION' ? faWifi :
                    recoveryAction.actionType === 'CHECK_PERMISSIONS' ? faCog :
                    faRotate
                  } 
                  className="mr-1 text-xs" 
                />
                {recoveryAction.actionLabel}
              </button>
            )}
            
            {/* Botón de reintento manual */}
            {onRetry && !recoveryAction && (
              <button 
                onClick={onRetry}
                className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
              >
                <FontAwesomeIcon icon={faRotate} className="mr-1 text-xs" />
                Reintentar
              </button>
            )}
            
            {/* Botón de cierre */}
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
              >
                <FontAwesomeIcon icon={faTimesCircle} className="mr-1 text-xs" />
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFeedback;
