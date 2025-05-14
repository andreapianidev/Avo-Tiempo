import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faInfoCircle, 
  faWifi,
  faRotate, 
  faTimesCircle 
} from '@fortawesome/free-solid-svg-icons';
import { isOffline, listenToConnectivityChanges } from '../services/appStateService';
import { AppError, ErrorType, getUserFriendlyErrorMessage } from '../services/errorService';

interface ErrorFeedbackProps {
  error: AppError | null;
  onRetry?: () => void; 
  onDismiss?: () => void;
  className?: string;
}

/**
 * Componente per visualizzare errori e feedback all'utente
 * Gestisce anche lo stato offline e altri problemi di connettività
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
  
  // Determina lo stile in base al tipo di errore
  let iconColor = 'text-red-600 dark:text-red-400';
  let bgColor = 'bg-red-50 dark:bg-red-900/30';
  let borderColor = 'border-red-200 dark:border-red-800';
  let textColor = 'text-red-800 dark:text-red-300';
  let icon = faExclamationTriangle;
  
  // Personalizza stili per diversi tipi di errori
  switch (error.type) {
    case ErrorType.NETWORK:
      iconColor = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-50 dark:bg-amber-900/30';
      borderColor = 'border-amber-200 dark:border-amber-800';
      textColor = 'text-amber-800 dark:text-amber-300';
      icon = faWifi;
      break;
    case ErrorType.VALIDATION:
      iconColor = 'text-blue-600 dark:text-blue-400';
      bgColor = 'bg-blue-50 dark:bg-blue-900/30';
      borderColor = 'border-blue-200 dark:border-blue-800';
      textColor = 'text-blue-800 dark:text-blue-300';
      icon = faInfoCircle;
      break;
    case ErrorType.API:
    case ErrorType.LOCATION:
    case ErrorType.UNKNOWN:
    default:
      // Usa i colori default (rosso)
      break;
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
          
          {/* Pulsanti di azione */}
          {(onRetry || onDismiss) && (
            <div className="flex mt-3 space-x-2">
              {onRetry && (
                <button 
                  onClick={onRetry}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 flex items-center"
                >
                  <FontAwesomeIcon icon={faRotate} className="mr-1 text-xs" />
                  Riprova
                </button>
              )}
              
              {onDismiss && (
                <button 
                  onClick={onDismiss}
                  className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 flex items-center"
                >
                  <FontAwesomeIcon icon={faTimesCircle} className="mr-1 text-xs" />
                  Chiudi
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorFeedback;
