import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

// --- patch: estensione interfaccia per supportare sia text che message
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  message?: string; // Aggiunta prop message per compatibilità con Activities.tsx
  className?: string;
}

/**
 * Componente LoadingSpinner che mostra un indicatore di caricamento rotante
 */
// --- patch: supporto per la prop message con retrocompatibilità
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  message,
  className = '',
}) => {
  // Usa message se specificato, altrimenti text, altrimenti default
  const displayText = message || text || 'Caricamento...';
  // Definizione delle dimensioni in base alla proprietà size
  const sizeClass = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center py-4 ${className}`}>
      <FontAwesomeIcon
        icon={faSpinner}
        className={`${sizeClass} text-[var(--color-primary)] animate-spin`}
      />
      {displayText && (
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{displayText}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
