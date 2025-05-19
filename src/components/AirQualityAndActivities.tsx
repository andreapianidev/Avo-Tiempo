import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLeaf, 
  faHiking, 
  faUmbrellaBeach, 
  faBicycle, 
  faLungs, 
  faWind, 
  faRunning,
  faSeedling,
  faCloud,
  faCheckCircle,
  faExclamationCircle,
  faTimesCircle,
  faQuestion
} from '@fortawesome/free-solid-svg-icons';
import { WeatherTrend } from '../services/trendService';

interface AirQualityAndActivitiesProps {
  trendData: WeatherTrend[];
  className?: string;
}

// Indice di qualità dell'aria, simulata in base ai dati meteo disponibili
const calculateAirQuality = (trends: WeatherTrend[]): number => {
  if (!trends || trends.length === 0) return 50; // Valore di default
  
  // Simuliamo un indice qualità dell'aria in base al meteo
  // Nella realtà, questo dovrebbe utilizzare dati da un'API dedicata
  const conditions = trends.map(day => day.condition);
  const hasRain = conditions.some(c => c === 'rain' || c === 'drizzle');
  const mostlyClear = conditions.filter(c => c === 'clear' || c === 'sunny').length > (trends.length / 2);
  const avgWind = trends.reduce((sum, day) => sum + (day.windSpeed || 10), 0) / trends.length;
  
  if (hasRain) return Math.min(40 + Math.random() * 10, 50); // Pioggia migliora la qualità dell'aria
  if (mostlyClear && avgWind > 15) return Math.min(50 + Math.random() * 15, 65); // Giornate ventose e soleggiate
  if (mostlyClear && avgWind < 10) return Math.min(65 + Math.random() * 20, 85); // Soleggiato e poco vento, possibile accumulo inquinanti
  
  return Math.min(50 + Math.random() * 15, 65); // Valore medio per altri casi
};

// Qualità attività all'aperto in base al meteo previsto
const calculateActivityQuality = (
  activity: 'hiking' | 'beach' | 'cycling' | 'running' | 'gardening',
  trends: WeatherTrend[]
): { score: number; description: string } => {
  if (!trends || trends.length === 0) {
    return { score: 50, description: 'Dati insufficienti per fare previsioni accurate.' };
  }
  
  // Prendiamo i dati dei prossimi giorni
  const nextDays = trends.slice(0, 3);
  
  // Valutazione base:
  // - Pioggia: negativa per tutte le attività
  // - Vento: negativo per ciclismo, spiaggia e giardinaggio, meno per escursioni e corsa
  // - Temperature estreme: negative per tutte le attività
  // - UV alto: negativo per attività lunghe all'aperto come escursioni e spiaggia
  
  let score = 70; // Partiamo da un punteggio base
  let reasons = [];
  
  // Controlliamo condizioni meteo avverse
  const rainyDays = nextDays.filter(day => 
    day.condition === 'rain' || day.condition === 'drizzle' || day.condition === 'thunderstorm'
  ).length;
  
  const windyDays = nextDays.filter(day => (day.windSpeed || 0) > 20).length;
  const hotDays = nextDays.filter(day => day.maxTemp > 30).length;
  const coldDays = nextDays.filter(day => day.maxTemp < 15).length;
  
  // Valutazione per tipo di attività
  switch (activity) {
    case 'hiking':
      if (rainyDays > 0) {
        score -= rainyDays * 15;
        reasons.push('Pioggia prevista');
      }
      if (windyDays > 0) {
        score -= windyDays * 5;
        reasons.push('Giornate ventose');
      }
      if (hotDays > 0) {
        score -= hotDays * 10;
        reasons.push('Temperature elevate');
      }
      if (coldDays > 0) {
        score -= coldDays * 8;
        reasons.push('Temperature fresche');
      }
      break;
      
    case 'beach':
      if (rainyDays > 0) {
        score -= rainyDays * 25;
        reasons.push('Pioggia prevista');
      }
      if (windyDays > 0) {
        score -= windyDays * 15;
        reasons.push('Vento forte');
      }
      if (coldDays > 0) {
        score -= coldDays * 20;
        reasons.push('Temperature troppo fresche');
      }
      break;
      
    case 'cycling':
      if (rainyDays > 0) {
        score -= rainyDays * 20;
        reasons.push('Pioggia prevista');
      }
      if (windyDays > 0) {
        score -= windyDays * 15;
        reasons.push('Vento forte');
      }
      if (hotDays > 0) {
        score -= hotDays * 7;
        reasons.push('Temperature elevate');
      }
      break;
      
    case 'running':
      if (rainyDays > 0) {
        score -= rainyDays * 10; // Corsa sotto leggera pioggia può essere ok
        reasons.push('Pioggia prevista');
      }
      if (hotDays > 0) {
        score -= hotDays * 15;
        reasons.push('Temperature elevate');
      }
      break;
      
    case 'gardening':
      if (rainyDays > 0) {
        score -= rainyDays * 15;
        reasons.push('Pioggia prevista');
      }
      if (windyDays > 0) {
        score -= windyDays * 10;
        reasons.push('Vento forte');
      }
      if (coldDays > 0) {
        score -= coldDays * 5;
        reasons.push('Temperature fresche');
      }
      break;
  }
  
  // Normalizzazione punteggio
  score = Math.max(10, Math.min(score, 100));
  
  // Generazione descrizione
  let description = '';
  if (score >= 80) {
    description = 'Condizioni ideali per questa attività!';
  } else if (score >= 60) {
    description = 'Condizioni buone, con qualche limitazione.';
  } else if (score >= 40) {
    description = `Condizioni discrete. ${reasons.length > 0 ? reasons[0] + '.' : ''}`;
  } else {
    description = `Condizioni non favorevoli. ${reasons.length > 0 ? reasons.slice(0, 2).join('. ') + '.' : ''}`;
  }
  
  return { score, description };
};

// Componente per visualizzare un indicatore di qualità
const QualityIndicator: React.FC<{ score: number; label: string; icon: any; color?: string }> = ({ 
  score, 
  label, 
  icon, 
  color 
}) => {
  // Determiniamo il colore in base al punteggio
  let indicatorColor = color || '';
  let statusIcon: any = faQuestion;
  
  if (!color) {
    if (score >= 80) {
      indicatorColor = 'text-green-500';
      statusIcon = faCheckCircle;
    } else if (score >= 60) {
      indicatorColor = 'text-yellow-500';
      statusIcon = faCheckCircle;
    } else if (score >= 40) {
      indicatorColor = 'text-orange-400';
      statusIcon = faExclamationCircle;
    } else {
      indicatorColor = 'text-red-500';
      statusIcon = faTimesCircle;
    }
  }
  
  return (
    <div className="flex items-center space-x-3 mb-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${indicatorColor.replace('text-', 'bg-').replace('500', '100').replace('400', '100')}`}>
        <FontAwesomeIcon icon={icon} className={indicatorColor} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <span className="font-medium">{label}</span>
          <span className="text-sm flex items-center">
            <FontAwesomeIcon icon={statusIcon} className={`${indicatorColor} mr-1`} />
            {score}/100
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
          <div 
            className={`h-full rounded-full ${
              score >= 80 ? 'bg-green-500' : 
              score >= 60 ? 'bg-yellow-500' : 
              score >= 40 ? 'bg-orange-400' : 
              'bg-red-500'
            }`} 
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const AirQualityAndActivities: React.FC<AirQualityAndActivitiesProps> = ({ 
  trendData,
  className = ''
}) => {
  // Calcolo dell'indice di qualità dell'aria
  const airQualityIndex = calculateAirQuality(trendData);
  
  // Calcolo della qualità delle attività
  const hikingQuality = calculateActivityQuality('hiking', trendData);
  const beachQuality = calculateActivityQuality('beach', trendData);
  const cyclingQuality = calculateActivityQuality('cycling', trendData);
  const runningQuality = calculateActivityQuality('running', trendData);
  const gardeningQuality = calculateActivityQuality('gardening', trendData);
  
  // Determiniamo il livello di qualità dell'aria
  const getAirQualityLevel = (index: number) => {
    if (index < 50) return { level: 'Ottima', color: 'text-green-500' };
    if (index < 70) return { level: 'Buona', color: 'text-yellow-500' };
    if (index < 90) return { level: 'Moderata', color: 'text-orange-500' };
    return { level: 'Scarsa', color: 'text-red-500' };
  };
  
  const airQuality = getAirQualityLevel(airQualityIndex);
  
  return (
    <div className={`air-quality-activities ${className}`}>
      <div className="mb-5 p-4 bg-white rounded-lg shadow-sm">
        <h3 className="text-base font-medium mb-4 flex items-center">
          <FontAwesomeIcon icon={faLungs} className="text-green-500 mr-2" />
          Qualità dell'Aria
        </h3>
        
        <div className="flex items-center mb-4">
          <div className={`text-3xl font-bold ${airQuality.color}`}>
            {Math.round(airQualityIndex)}
          </div>
          <div className="ml-3">
            <div className={`font-medium ${airQuality.color}`}>
              {airQuality.level}
            </div>
            <div className="text-xs text-gray-500">
              Indice qualità (0-100)
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap -mx-1">
          <div className="w-1/2 px-1 mb-2">
            <div className="flex items-center bg-blue-50 p-2 rounded">
              <FontAwesomeIcon icon={faWind} className="text-blue-500 mr-2" />
              <span className="text-xs">
                Vento: {Math.round(trendData[0]?.windSpeed || 0)} km/h
              </span>
            </div>
          </div>
          <div className="w-1/2 px-1 mb-2">
            <div className="flex items-center bg-green-50 p-2 rounded">
              <FontAwesomeIcon icon={faLeaf} className="text-green-500 mr-2" />
              <span className="text-xs">
                Polline: {airQualityIndex < 60 ? 'Basso' : 'Moderato'}
              </span>
            </div>
          </div>
          <div className="w-1/2 px-1">
            <div className="flex items-center bg-gray-50 p-2 rounded">
              <FontAwesomeIcon icon={faCloud} className="text-gray-500 mr-2" />
              <span className="text-xs">
                PM2.5: {Math.round(airQualityIndex * 0.4)}μg/m³
              </span>
            </div>
          </div>
          <div className="w-1/2 px-1">
            <div className="flex items-center bg-yellow-50 p-2 rounded">
              <FontAwesomeIcon icon={faSeedling} className="text-yellow-500 mr-2" />
              <span className="text-xs">
                Allergeni: {airQualityIndex < 70 ? 'Bassi' : 'Moderati'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <h3 className="text-base font-medium mb-4 flex items-center">
          <FontAwesomeIcon icon={faHiking} className="text-amber-500 mr-2" />
          Attività Consigliate
        </h3>
        
        <QualityIndicator 
          score={hikingQuality.score} 
          label="Escursionismo" 
          icon={faHiking} 
        />
        
        <QualityIndicator 
          score={beachQuality.score} 
          label="Spiaggia" 
          icon={faUmbrellaBeach} 
        />
        
        <QualityIndicator 
          score={cyclingQuality.score} 
          label="Ciclismo" 
          icon={faBicycle} 
        />
        
        <QualityIndicator 
          score={runningQuality.score} 
          label="Corsa" 
          icon={faRunning} 
        />
        
        <QualityIndicator 
          score={gardeningQuality.score} 
          label="Giardinaggio" 
          icon={faSeedling} 
        />
        
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <p>Le valutazioni sono basate sulle previsioni dei prossimi 3 giorni.</p>
        </div>
      </div>
    </div>
  );
};

export default AirQualityAndActivities;
