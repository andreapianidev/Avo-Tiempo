import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHiking, faPersonSwimming, faBiking, faRunning, 
  faUmbrella, faCheck, faTimes, faInfoCircle 
} from '@fortawesome/free-solid-svg-icons';

interface ActivityScore {
  name: string;
  icon: typeof faHiking;
  score: number; // 0-100
  recommendation: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'all';
}

interface OutdoorActivityIndicatorProps {
  location: string;
  weatherCondition: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  activities: ActivityScore[];
  className?: string;
}

const OutdoorActivityIndicator: React.FC<OutdoorActivityIndicatorProps> = ({
  location,
  weatherCondition,
  temperature,
  humidity,
  windSpeed,
  uvIndex,
  activities,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Filtra le attività per mostrare prima quelle con punteggio più alto
  const sortedActivities = [...activities].sort((a, b) => b.score - a.score);

  // Determina la classe di colore per un punteggio
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-green-300';
    if (score >= 40) return 'bg-yellow-400';
    if (score >= 20) return 'bg-orange-400';
    return 'bg-red-500';
  };

  // Ottieni i dettagli dell'attività selezionata
  const getSelectedActivity = () => {
    return activities.find(activity => activity.name === selectedActivity);
  };

  // Funzione per generare una frase in stile canaro
  const getCanaryStylePhrase = (activity: ActivityScore) => {
    if (activity.score >= 80) {
      return `¡Atrévete a ${activity.name} hoy, mi niño! Las condiciones están perfectas y el tiempo te acompaña.`;
    } else if (activity.score >= 60) {
      return `Bueno para ${activity.name}, mi niño, pero no te confíes mucho. ${activity.recommendation}`;
    } else if (activity.score >= 40) {
      return `Regular pa' ${activity.name}, mi niño. ${activity.recommendation} ¡Cuidadito!`;
    } else {
      return `¡Qué va, mi niño! Hoy no es día para ${activity.name}. Mejor quédate en casita o busca otra actividad.`;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="text-base font-medium mb-3 flex items-center">
        <FontAwesomeIcon icon={faHiking} className="mr-2 text-[var(--color-highlight)]" />
        Idoneità Attività Outdoor
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {sortedActivities.slice(0, 4).map((activity, index) => (
          <div 
            key={index}
            onClick={() => setSelectedActivity(activity.name)}
            className={`p-2 rounded-lg border cursor-pointer transition-colors ${
              selectedActivity === activity.name 
                ? 'border-[var(--color-highlight)] bg-[var(--color-highlight-light)]' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FontAwesomeIcon icon={activity.icon} className="mr-2 text-[var(--color-highlight)]" />
                <span className="text-sm">{activity.name}</span>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  backgroundColor: `rgba(${activity.score > 60 ? '74, 222, 128' : activity.score > 30 ? '250, 204, 21' : '248, 113, 113'}, ${activity.score/100})`
                }}
              >
                {activity.score}
              </div>
            </div>
            <div className="h-1 w-full bg-gray-200 rounded-full mt-2">
              <div 
                className={`h-1 rounded-full ${getScoreColorClass(activity.score)}`}
                style={{ width: `${activity.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {selectedActivity && getSelectedActivity() && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm flex items-center">
            <FontAwesomeIcon icon={getSelectedActivity()?.icon || faInfoCircle} className="mr-2 text-[var(--color-highlight)]" />
            {selectedActivity}
          </h4>
          <div className="mt-2">
            <p className="text-sm italic">"{getCanaryStylePhrase(getSelectedActivity()!)}"</p>
            
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="flex items-center">
                <span className="text-gray-600 mr-1">Orario migliore:</span>
                <span className="font-medium">
                  {getSelectedActivity()?.timeOfDay === 'all' 
                    ? 'Tutto il giorno' 
                    : getSelectedActivity()?.timeOfDay === 'morning' 
                    ? 'Mattina' 
                    : getSelectedActivity()?.timeOfDay === 'afternoon' 
                    ? 'Pomeriggio' 
                    : 'Sera'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 mr-1">UV:</span>
                <span className={uvIndex > 7 ? 'text-red-500 font-medium' : 'font-medium'}>
                  {uvIndex > 7 ? 'Protezione necessaria' : 'Nella norma'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 mr-1">Umidità:</span>
                <span className={humidity > 80 ? 'text-orange-500 font-medium' : 'font-medium'}>
                  {humidity > 80 ? 'Alta' : humidity < 30 ? 'Bassa' : 'Nella norma'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 mr-1">Vento:</span>
                <span className={windSpeed > 20 ? 'text-orange-500 font-medium' : 'font-medium'}>
                  {windSpeed > 20 ? 'Forte' : 'Nella norma'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={() => setShowDetails(!showDetails)}
        className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center"
      >
        {showDetails ? 'Meno dettagli' : 'Più dettagli'}
      </button>

      {showDetails && (
        <div className="mt-3 text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-1 text-left">Attività</th>
                <th className="py-1 text-center">Score</th>
                <th className="py-1 text-right">Momento migliore</th>
              </tr>
            </thead>
            <tbody>
              {sortedActivities.map((activity, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-1 flex items-center">
                    <FontAwesomeIcon icon={activity.icon} className="mr-1 text-[var(--color-highlight)]" />
                    {activity.name}
                  </td>
                  <td className="py-1 text-center">
                    <span className={`inline-block w-6 h-6 rounded-full ${getScoreColorClass(activity.score)} text-white text-[10px] flex items-center justify-center`}>
                      {activity.score}
                    </span>
                  </td>
                  <td className="py-1 text-right">
                    {activity.timeOfDay === 'all' 
                      ? 'Tutto il giorno' 
                      : activity.timeOfDay === 'morning' 
                      ? 'Mattina' 
                      : activity.timeOfDay === 'afternoon' 
                      ? 'Pomeriggio' 
                      : 'Sera'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-gray-500">
            Punteggi basati su temperatura, umidità, vento, indice UV e previsioni delle prossime 8 ore.
          </p>
        </div>
      )}
    </div>
  );
};

export default OutdoorActivityIndicator;
