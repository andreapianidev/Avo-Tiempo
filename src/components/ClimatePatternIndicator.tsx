import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeaf, faSun, faSnowflake, faCloudRain, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface ClimatePatternIndicatorProps {
  location: string;
  currentPattern: string;
  normalPattern: string;
  deviation: number; // percentuale di deviazione dal normale, positiva o negativa
  confidence: number; // livello di confidenza dell'analisi (0-100)
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  className?: string;
}

const ClimatePatternIndicator: React.FC<ClimatePatternIndicatorProps> = ({
  location,
  currentPattern,
  normalPattern,
  deviation,
  confidence,
  season,
  className = ''
}) => {
  // Determina l'icona della stagione
  const getSeasonIcon = () => {
    switch (season) {
      case 'winter': return faSnowflake;
      case 'spring': return faLeaf;
      case 'summer': return faSun;
      case 'autumn': return faLeaf;
      default: return faSun;
    }
  };

  // Determina il colore e la classe in base alla deviazione
  const getDeviationClass = () => {
    if (Math.abs(deviation) < 5) return 'text-green-500';
    if (Math.abs(deviation) < 15) return deviation > 0 ? 'text-orange-500' : 'text-blue-500';
    return deviation > 0 ? 'text-red-500' : 'text-blue-700';
  };

  // Determina il messaggio sulla deviazione
  const getDeviationMessage = () => {
    if (Math.abs(deviation) < 5) {
      return 'Pattern climatico nella norma stagionale';
    }
    if (deviation > 0) {
      return `Pattern ${Math.abs(deviation)}% più caldo del normale`;
    }
    return `Pattern ${Math.abs(deviation)}% più fresco del normale`;
  };

  // Determina se mostrare l'avviso di confidenza bassa
  const showConfidenceWarning = confidence < 70;

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="text-base font-medium mb-3 flex items-center">
        <FontAwesomeIcon icon={getSeasonIcon()} className="mr-2 text-[var(--color-highlight)]" />
        Pattern Climatico Stagionale
      </h3>

      {showConfidenceWarning && (
        <div className="mb-3 bg-amber-50 p-2 rounded-lg flex items-start">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 mt-0.5 mr-2" />
          <p className="text-xs text-amber-700">
            Analisi con confidenza limitata ({confidence}%). I pattern potrebbero essere soggetti a variazioni.
          </p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Pattern attuale:</span>
          <span className="text-sm font-medium">{currentPattern}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Pattern normale:</span>
          <span className="text-sm">{normalPattern}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
          <div 
            className={`h-full ${Math.abs(deviation) < 5 ? 'bg-green-500' : (deviation > 0 ? 'bg-orange-500' : 'bg-blue-500')}`}
            style={{ width: `${Math.min(100, 50 + deviation/2)}%` }} 
          />
        </div>
      </div>

      <div className="mt-3">
        <p className={`text-sm ${getDeviationClass()}`}>
          {getDeviationMessage()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Basato sull'analisi climatica storica per {location} durante questa stagione.
        </p>
      </div>
    </div>
  );
};

export default ClimatePatternIndicator;
