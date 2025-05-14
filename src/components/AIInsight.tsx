import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faSpinner } from '@fortawesome/free-solid-svg-icons';

interface AIInsightProps {
  message: string;
  isLoading?: boolean;
  streamedMessage?: string;
  onStreamUpdate?: (text: string) => void;
}

const AIInsight: React.FC<AIInsightProps> = ({ 
  message, 
  isLoading = false,
  streamedMessage,
  onStreamUpdate
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
  
  // Determina quale testo mostrare
  // Durante lo streaming, mostra solo il messaggio in streaming
  // Altrimenti, mostra il messaggio completo
  const isStreaming = isLoading && localStreamedMessage && localStreamedMessage !== 'Generazione in corso...';
  const showLoadingAnimation = isLoading && (!localStreamedMessage || localStreamedMessage === 'Generazione in corso...');
  
  // Usa il messaggio in streaming se disponibile, altrimenti usa il messaggio completo
  const displayText = isStreaming ? localStreamedMessage : message;

  return (
    <div className="bg-[var(--color-ai-box-bg)] rounded-xl p-4 shadow-sm my-4">
      <div className="flex items-center mb-2">
        <FontAwesomeIcon 
          icon={showLoadingAnimation ? faSpinner : faRobot} 
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
