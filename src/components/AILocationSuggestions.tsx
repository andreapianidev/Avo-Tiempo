import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faSpinner, faLocationDot, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { getAIInsight } from '../services/aiService';
import { ErrorSeverity, createError, AppError, ErrorType } from '../services/errorService';
import ErrorFeedback from './ErrorFeedback';

interface AILocationSuggestionsProps {
  userInterests?: string[];
  weatherPreference?: 'sunny' | 'mild' | 'cool' | 'any';
  onSelectLocation: (location: string) => void;
}

/**
 * Componente che utilizza l'AI per suggerire località in base agli interessi dell'utente
 * e alle preferenze meteo.
 */
const AILocationSuggestions: React.FC<AILocationSuggestionsProps> = ({ 
  userInterests = [], 
  weatherPreference = 'any',
  onSelectLocation
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [streamedResponse, setStreamedResponse] = useState('');

  // Genera il prompt per l'AI
  const generatePrompt = () => {
    const interestsText = userInterests.length > 0 
      ? `Interessi dell'utente: ${userInterests.join(', ')}.` 
      : 'Utente senza interessi specifici.';
    
    const weatherText = weatherPreference !== 'any' 
      ? `Preferisce clima ${weatherPreference === 'sunny' ? 'soleggiato' : weatherPreference === 'mild' ? 'mite' : 'fresco'}.` 
      : 'Nessuna preferenza climatica.';
    
    return `Suggerisci 5 località nelle Isole Canarie per questo utente. ${interestsText} ${weatherText} Non dare spiegazioni, elenca solo le località in forma di lista con emoji. Usa il tono canarino tipico, umoristico e diretto.`;
  };

  // Fetch dei suggerimenti AI
  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setStreamedResponse('');
    
    try {
      const insight = await getAIInsight(
        'Isole Canarie',
        'sunny',
        25,
        [],
        [],
        (text) => setStreamedResponse(text)
      );
      
      // Estrai le località dal testo dell'insight
      // Cerca linee che iniziano con bullet, numeri o simboli, tipiche di una lista
      const locationLines = insight
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.startsWith('•') || 
                 trimmed.startsWith('-') || 
                 /^\d/.test(trimmed) || 
                 /^[^a-zA-Z0-9\s]/.test(trimmed);
        })
        .map(line => {
          // Rimuovi caratteri non alfanumerici e spazi all'inizio
          const trimmed = line.trim();
          return trimmed.replace(/^[^a-zA-Z0-9]+\s*/, '');
        });
      
      setSuggestions(locationLines.length > 0 ? locationLines : extractLocationsFromText(insight));
      
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setError(createError(
        ErrorType.API,
        'Error al obtener sugerencias de IA',
        err instanceof Error ? err : new Error(String(err)),
        'No se pudieron generar sugerencias en este momento',
        ErrorSeverity.LOW
      ));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Estrai località da testo non strutturato
  const extractLocationsFromText = (text: string): string[] => {
    // Lista di località conosciute nelle Canarie
    const knownLocations = [
      'Santa Cruz de Tenerife', 'Las Palmas', 'Adeje', 'Puerto de la Cruz', 
      'Maspalomas', 'Playa del Inglés', 'Costa Adeje', 'Los Cristianos',
      'Corralejo', 'La Orotava', 'Teide', 'Anaga', 'Garachico', 'San Cristóbal de La Laguna'
    ];
    
    // Cerca queste località nel testo
    return knownLocations.filter(location => 
      text.toLowerCase().includes(location.toLowerCase())
    );
  };

  useEffect(() => {
    fetchSuggestions();
  }, [userInterests, weatherPreference]);

  return (
    <div className="bg-amber-50 p-4 rounded-lg shadow-sm mb-6">
      <div className="flex items-center mb-3">
        <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 mr-2" />
        <h3 className="text-lg font-semibold text-amber-800">Località consigliate per te</h3>
      </div>
      
      {error && (
        <ErrorFeedback 
          error={error}
          onRetry={fetchSuggestions}
          className="mb-3"
        />
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center py-4">
          <FontAwesomeIcon icon={faSpinner} spin className="text-amber-500 text-2xl mb-2" />
          <p className="text-amber-700 text-sm animate-pulse">{streamedResponse || 'Generando sugerencias...'}</p>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => onSelectLocation(location)}
              className="flex items-center p-3 bg-white rounded-md hover:bg-amber-100 transition-colors text-left"
            >
              <FontAwesomeIcon icon={faLocationDot} className="text-amber-500 mr-2" />
              <span className="text-gray-800">{location}</span>
            </button>
          ))}
        </div>
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center p-4 bg-white rounded-md">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400 mr-2" />
          <p className="text-gray-600">No hay sugerencias disponibles</p>
        </div>
      ) : null}
      
      <button 
        onClick={fetchSuggestions} 
        className="mt-3 w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors flex justify-center items-center"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
            Generando...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
            Regenerar sugerencias
          </>
        )}
      </button>
    </div>
  );
};

export default AILocationSuggestions;
