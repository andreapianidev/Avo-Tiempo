import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHiking, faBicycle, faUmbrellaBeach, faUtensils, faChild, faMuseum,
  faWineGlass, faStar, faShoppingBasket, faMapMarkedAlt, faInfoCircle, 
  faChevronDown, faChevronUp, faTemperatureHigh, faUmbrella
} from '@fortawesome/free-solid-svg-icons';
import { RatedActivity } from '../types/activities';
import { getActivityAIMessage } from '../services/activitiesService';
import { WeatherData } from '../services/weatherService';

// Mappatura delle icone per attività
const activityIcons: {[key: string]: any} = {
  'hiking': faHiking,
  'beach': faUmbrellaBeach,
  'cycling': faBicycle,
  'museum': faMuseum,
  'gastronomy': faUtensils,
  'family-park': faChild,
  'playground': faChild,
  'stargazing': faStar,
  'local-markets': faShoppingBasket,
  'vineyard-tour': faWineGlass
};

// Definizione del tipo per le azioni extra
interface ExtraAction {
  icon: any;
  label: string;
  action: () => void;
}

interface ActivityCardProps {
  activity: RatedActivity;
  weather: WeatherData;
  showMap?: (activity: RatedActivity) => void;
  className?: string;
  extraActions?: ExtraAction[];
}

const ActivityCard: React.FC<ActivityCardProps> = ({ 
  activity, 
  weather, 
  showMap,
  className = '',
  extraActions = [] 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (expanded && !aiMessage && !isLoading) {
      setIsLoading(true);
      getActivityAIMessage(activity, weather)
        .then(message => {
          setAiMessage(message);
        })
        .catch(err => {
          console.error("Errore nel caricamento del messaggio AI", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [expanded, activity, weather, aiMessage, isLoading]);

  // Determina il colore di sfondo in base al punteggio
  const getBackgroundColor = () => {
    if (activity.score >= 80) return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200';
    if (activity.score >= 60) return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200';
    if (activity.score >= 40) return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200';
    return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200';
  };

  // Determina il colore del punteggio
  const getScoreColor = () => {
    if (activity.score >= 80) return 'bg-green-500';
    if (activity.score >= 60) return 'bg-blue-500';
    if (activity.score >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const toggleExpand = () => setExpanded(!expanded);

  // Icona da utilizzare
  const icon = activityIcons[activity.id] || faInfoCircle;

  return (
    <div className={`rounded-xl shadow-sm border ${getBackgroundColor()} overflow-hidden ${className}`}>
      <div className="p-4">
        {/* Intestazione con punteggio */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex justify-center items-center text-white ${getScoreColor()}`}>
              <span className="font-bold">{activity.score}</span>
            </div>
            <h3 className="text-lg font-semibold ml-3">{activity.name}</h3>
          </div>
          <FontAwesomeIcon 
            icon={icon} 
            className="text-[var(--color-highlight)] text-xl" 
          />
        </div>
        
        {/* Descrizione */}
        <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
        
        {/* Raccomandazione */}
        <div className="text-sm font-medium mb-2">
          {activity.recommendation}
        </div>
        
        {/* Condizioni favorevoli */}
        <div className="flex flex-wrap gap-2 text-xs mb-3">
          <div className="px-2 py-1 bg-white bg-opacity-70 rounded-full flex items-center">
            <FontAwesomeIcon icon={faTemperatureHigh} className="mr-1 text-amber-500" />
            <span>{activity.temperatureRange.min}-{activity.temperatureRange.max}°C</span>
          </div>
          
          {activity.weatherConditions.ideal.length > 0 && (
            <div className="px-2 py-1 bg-white bg-opacity-70 rounded-full flex items-center">
              <FontAwesomeIcon icon={faUmbrella} className="mr-1 text-blue-500" />
              <span>{activity.weatherConditions.ideal.join(', ')}</span>
            </div>
          )}
        </div>
        
        {/* Mostra espandi/nascondi */}
        <button 
          onClick={toggleExpand}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700"
        >
          {expanded ? 'Nascondi dettagli' : 'Mostra dettagli'}
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="ml-1" />
        </button>
      </div>
      
      {/* Contenuto espanso */}
      {expanded && (
        <div className="p-4 pt-0">
          {/* Messaggio AI */}
          {isLoading ? (
            <div className="h-16 bg-gray-100 rounded-lg animate-pulse mt-3 mb-4"></div>
          ) : aiMessage ? (
            <div className="bg-white bg-opacity-70 p-3 rounded-lg mt-3 mb-4 italic text-sm">
              "{aiMessage}"
            </div>
          ) : null}
          
          {/* Punti di interesse */}
          {showMap && (
            <button 
              onClick={() => showMap(activity)}
              className="w-full py-2 px-4 bg-[var(--color-highlight)] text-white rounded-lg text-sm flex items-center justify-center mt-2"
            >
              <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2" />
              Trova punti di interesse
            </button>
          )}
          
          {/* Azioni Extra */}
          {extraActions.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {extraActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="py-2 px-1 bg-white bg-opacity-70 text-[var(--color-primary)] rounded-lg text-xs flex flex-col items-center justify-center hover:bg-opacity-100 transition-all"
                >
                  <FontAwesomeIcon icon={action.icon} className="mb-1" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
          
          {/* Tag */}
          <div className="flex flex-wrap gap-1 mt-3">
            {activity.tags.map((tag, idx) => (
              <span key={idx} className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          {/* Dati aggiuntivi */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
            <div>Durata: ~{activity.estimatedDuration} ore</div>
            <div>Difficoltà: {Array(activity.difficulty).fill('●').join('')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
