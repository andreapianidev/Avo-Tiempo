import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faSpinner, faHiking } from '@fortawesome/free-solid-svg-icons';

interface AIInsightProps {
  message: string;
  isLoading?: boolean;
  streamedMessage?: string;
  onStreamUpdate?: (text: string) => void;
  className?: string;
}

interface AIInsightPropsExtended extends AIInsightProps {
  type?: string;
  location?: string;
  data?: {
    temperature?: number;
    condition?: string;
    activities?: string;
    [key: string]: any;
  };
}

const AIInsight: React.FC<AIInsightPropsExtended> = ({ 
  message, 
  isLoading = false,
  streamedMessage,
  onStreamUpdate,
  className = '',
  type,
  location,
  data
}) => {
  const [localStreamedMessage, setLocalStreamedMessage] = useState(streamedMessage || '');
  const cursorRef = useRef<HTMLSpanElement>(null);
  
  // Aggiorna il messaggio locale quando cambia quello esterno
  useEffect(() => {
    if (streamedMessage) {
      setLocalStreamedMessage(streamedMessage);
    }
  }, [streamedMessage]);
  
  // Effetto per lo scrolling automatico durante lo streaming
  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [localStreamedMessage]);
  
  // Se abbiamo type, location e data, generiamo un messaggio predefinito in base al tipo
  const getDefaultMessage = () => {
    if (!type || !location || !data) return message;
    
    switch (type) {
      case 'activities':
        return `¡Mira, mi niño! Con estos ${data.temperature}°C y ${data.condition} en ${location}, te recomiendo: ${data.activities}. ¡Vas a pasarlo pipa, cariño!`;
      default:
        return message;
    }
  };
  
  // Usa un messaggio generato in base al tipo se disponibile
  const resolvedMessage = message || getDefaultMessage();
  
  // Determina quale testo mostrare
  // Durante lo streaming, mostra solo il messaggio in streaming
  // Altrimenti, mostra il messaggio completo
  const isStreaming = isLoading && localStreamedMessage && localStreamedMessage !== 'Generazione in corso...';
  const showLoadingAnimation = isLoading && (!localStreamedMessage || localStreamedMessage === 'Generazione in corso...');
  
  // Usa il messaggio in streaming se disponibile, altrimenti usa il messaggio completo
  const displayText = isStreaming ? localStreamedMessage : resolvedMessage;
  
  // Determina l'icona da mostrare in base al tipo
  const getIcon = () => {
    if (showLoadingAnimation) return faSpinner;
    if (type === 'activities') return faHiking;
    return faRobot;
  };

  return (
    <div className={`bg-[var(--color-ai-box-bg)] rounded-xl p-4 shadow-sm my-4 ${className}`}>
      <div className="flex items-center mb-2">
        <FontAwesomeIcon 
          icon={getIcon()} 
          className={`text-[var(--color-highlight)] mr-2 ${showLoadingAnimation ? 'animate-spin' : ''}`} 
        />
        <h3 className="font-medium text-[var(--color-text-primary)]">AI Canaria</h3>
      </div>
      
      {showLoadingAnimation ? (
        <div className="animate-pulse flex flex-col gap-2">
          <div className="h-4 bg-[var(--color-border)] bg-opacity-50 rounded w-3/4"></div>
          <div className="h-4 bg-[var(--color-border)] bg-opacity-50 rounded w-5/6"></div>
          <div className="h-4 bg-[var(--color-border)] bg-opacity-50 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="text-[var(--color-text-primary)] text-base leading-relaxed">
          {displayText}
          {isStreaming && (
            <span ref={cursorRef} className="inline-block w-2 h-4 bg-[var(--color-highlight)] ml-1 animate-pulse"></span>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsight;
