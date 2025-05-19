import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRedo } from '@fortawesome/free-solid-svg-icons';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
  isCompact?: boolean;
}

/**
 * Componente per mostrare messaggi di errore con opzione di retry
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  className = '',
  isCompact = false
}) => {
  if (isCompact) {
    return (
      <div className={`flex items-center text-red-500 text-sm p-2 ${className}`}>
        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
        <span>{message}</span>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="ml-2 text-xs bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded transition-colors"
          >
            <FontAwesomeIcon icon={faRedo} className="mr-1" />
            Tentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 my-3 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-xl" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Se ha producido un error</h3>
          <div className="mt-1">
            <p className="text-sm text-red-700">{message}</p>
          </div>
          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FontAwesomeIcon icon={faRedo} className="mr-1" />
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
