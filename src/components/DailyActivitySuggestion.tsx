import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarDay, 
  faSpinner, 
  faLightbulb, 
  faClock, 
  faCloudRain, 
  faSun, 
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { osmService, POI } from '../services/osmService';
import { generateDailyActivitySuggestion } from '../services/aiService';
import { WeatherData } from '../services/weatherService';
// Funzione temporanea fino a che dateUtils.ts non viene correttamente importato
const getTimeOfDay = (hour: number): string => {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else if (hour >= 18 && hour < 22) {
    return 'evening';
  } else {
    return 'night';
  }
};

interface DailyActivitySuggestionProps {
  weatherData: WeatherData;
  className?: string;
  radius?: number; // raggio in metri per la ricerca POI
}

interface SuggestionData {
  title: string;
  description: string;
  poiSuggestions: string[];
  poiDetails?: {
    name: string;
    category: string;
    description: string;
    distance: number;
    bestTimeToVisit?: string;
  }[];
  weatherTip?: string;
  activityDuration?: string;
  alternativeActivity?: string;
  icon: string;
  timestamp: number;
}

const DailyActivitySuggestion: React.FC<DailyActivitySuggestionProps> = ({ 
  weatherData, 
  className = '', 
  radius = 10000 
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [nearbyPOIs, setNearbyPOIs] = useState<POI[]>([]);

  // Recupera ora locale e momento della giornata
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = getTimeOfDay(hour);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!weatherData) return;

      setIsLoading(true);
      setError(null);

      // Crea una chiave cache basata su posizione, meteo e ora
      const cacheKey = `daily_suggestion_${weatherData.lat.toFixed(2)}_${weatherData.lon.toFixed(2)}_${weatherData.condition}_${timeOfDay}`;
      
      // Controlla se esiste una versione in cache valida (meno di 1 ora)
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          // Se la cache è recente (meno di 1 ora)
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            setSuggestion(data);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Error parsing cached suggestion', e);
      }

      try {
        // Recupera POI vicini
        const pois = await osmService.getPOIs(weatherData.lat, weatherData.lon, radius);
        setNearbyPOIs(pois);
        
        // Prepara il contesto per la generazione AI
        const context = {
          weather: {
            condition: weatherData.condition,
            temperature: weatherData.temperature,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            feelsLike: weatherData.feelsLike
          },
          location: weatherData.location,
          time: {
            hour,
            timeOfDay,
            isWeekend: [0, 6].includes(now.getDay())
          },
          availablePOIs: pois.slice(0, 20).map(poi => ({
            name: poi.name,
            category: poi.category,
            distance: poi.distance,
            type: poi.type
          }))
        };

        // Genera suggerimento con AI
        const aiResponse = await generateDailyActivitySuggestion(context);
        
        // Formatta risposta
        const suggestionData: SuggestionData = {
          title: aiResponse.title || "Cosa fare oggi",
          description: aiResponse.description,
          poiSuggestions: aiResponse.poiSuggestions || [],
          icon: getIconForTimeOfDay(hour),
          timestamp: Date.now()
        };
        
        // Salva in cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: suggestionData,
          timestamp: Date.now()
        }));
        
        setSuggestion(suggestionData);
      } catch (err) {
        console.error('Error fetching activity suggestion:', err);
        setError('Non è stato possibile generare un suggerimento per oggi');
        
        // Fallback con suggerimento generico basato sul meteo e orario
        const fallbackSuggestion = generateFallbackSuggestion(weatherData, hour);
        setSuggestion(fallbackSuggestion);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestion();
  }, [weatherData, radius, timeOfDay]);

  // Genera un'icona in base all'ora del giorno
  const getIconForTimeOfDay = (hour: number): string => {
    if (hour >= 6 && hour < 12) return '🌅'; // mattina
    if (hour >= 12 && hour < 18) return '☀️'; // pomeriggio
    if (hour >= 18 && hour < 22) return '🌇'; // sera
    return '🌙'; // notte
  };

  // Genera un suggerimento di fallback quando l'API non è disponibile
  const generateFallbackSuggestion = (weather: WeatherData, hour: number): SuggestionData => {
    let title = "Idea per oggi";
    let description = "";
    
    // Suggerimenti basati sul tempo
    if (weather.condition.includes('clear') || weather.condition.includes('sunny')) {
      if (hour >= 8 && hour < 11) {
        description = "Mattinata perfetta per una colazione all'aperto e una bella passeggiata al mare.";
      } else if (hour >= 11 && hour < 15) {
        description = "Con questo sole, un pranzo in un bel chiringuito in spiaggia sarebbe fantastico!";
      } else if (hour >= 15 && hour < 20) {
        description = "Pomeriggio ideale per una visita a qualche attrazione all'aperto o un aperitivo con vista.";
      } else {
        description = "Serata perfetta per una cena in terrazza sotto le stelle.";
      }
    } else if (weather.condition.includes('cloud')) {
      description = "Con questo cielo nuvoloso, potresti visitare un museo o goderti un po' di shopping.";
    } else if (weather.condition.includes('rain')) {
      description = "Giornata piovosa! Perfetta per scoprire la cucina locale in un ristorante tipico.";
    } else {
      description = "Oggi potresti esplorare qualche gemma nascosta dell'isola!";
    }
    
    return {
      title,
      description,
      poiSuggestions: [],
      icon: getIconForTimeOfDay(hour),
      timestamp: Date.now()
    };
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="font-medium text-[var(--color-text-primary)] mb-2 flex items-center">
        <FontAwesomeIcon icon={faCalendarDay} className="mr-2 text-[var(--color-highlight)]" />
        Cosa faccio oggi?
        <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
          <FontAwesomeIcon icon={faClock} className="mr-1" />
          {now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </h3>
      
      <div className="min-h-[120px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-[var(--color-highlight)]" />
          </div>
        ) : error && !suggestion ? (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        ) : suggestion ? (
          <div className="animate-fadeIn">
            <div className="flex items-start mb-3">
              <div className="text-4xl mr-3">{suggestion.icon}</div>
              <div>
                <h4 className="font-medium text-[var(--color-text-primary)]">{suggestion.title}</h4>
                <p className="text-sm text-[var(--color-text-primary)]">{suggestion.description}</p>
              </div>
            </div>
            
            {suggestion.weatherTip && (
              <div className="mt-2 p-2 bg-[var(--color-bg-main)] rounded-lg">
                <p className="text-xs text-[var(--color-text-secondary)] italic">
                  <FontAwesomeIcon icon={weatherData.condition.includes('rain') ? faCloudRain : faSun} className="mr-1 text-[var(--color-highlight)]" />
                  <strong>Consiglio meteo:</strong> {suggestion.weatherTip}
                </p>
              </div>
            )}
            
            {suggestion.poiSuggestions && suggestion.poiSuggestions.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium flex items-center">
                  <FontAwesomeIcon icon={faLightbulb} className="mr-2 text-[var(--color-highlight)]" />
                  Luoghi consigliati:
                </h5>
                
                {suggestion.poiDetails && suggestion.poiDetails.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {suggestion.poiDetails.map((poi, index) => (
                      <div key={index} className="p-2 bg-[var(--color-bg-main)] rounded-lg">
                        <div className="flex justify-between items-center">
                          <h6 className="text-sm font-medium text-[var(--color-text-primary)]">
                            {poi.name}
                          </h6>
                          <span className="text-xs bg-[var(--color-highlight)] bg-opacity-20 text-[var(--color-highlight)] px-2 py-0.5 rounded-full">
                            {poi.category}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          {poi.description}
                        </p>
                        <div className="flex justify-between mt-1 text-xs text-[var(--color-text-secondary)]">
                          <span>
                            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                            {poi.distance.toFixed(1)} km
                          </span>
                          {poi.bestTimeToVisit && (
                            <span>
                              <FontAwesomeIcon icon={faClock} className="mr-1" />
                              Orario ideale: {poi.bestTimeToVisit}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {suggestion.poiSuggestions.map((poi, index) => (
                      <li key={index} className="text-xs text-[var(--color-text-secondary)] p-1 border-l-2 border-[var(--color-highlight)] pl-2">
                        {poi}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            
            {suggestion.activityDuration && (
              <div className="mt-3 flex items-center text-xs text-[var(--color-text-secondary)]">
                <FontAwesomeIcon icon={faClock} className="mr-1 text-[var(--color-highlight)]" />
                <span><strong>Durata consigliata:</strong> {suggestion.activityDuration}</span>
              </div>
            )}
            
            {suggestion.alternativeActivity && (
              <div className="mt-2 p-2 bg-[var(--color-bg-main)] rounded-lg">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faLightbulb} className="mr-1 text-[var(--color-highlight)]" />
                  <strong>Alternativa:</strong> {suggestion.alternativeActivity}
                </p>
              </div>
            )}
            
            {/* Nota a piè di pagina */}
            <p className="mt-3 text-xs text-right text-[var(--color-text-secondary)] italic">
              Suggerimento basato su meteo, ora e luoghi disponibili
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DailyActivitySuggestion;
