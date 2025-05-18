import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTriangleExclamation, faChevronUp, faChevronDown, faCloudRain,
  faWind, faBolt, faSnowflake, faTemperatureHigh, faTemperatureLow,
  faWater, faSmog
} from '@fortawesome/free-solid-svg-icons';
import { WeatherAlert } from '../services/aemetService';

interface AlertBoxProps {
  alert: WeatherAlert;
  expanded?: boolean;
}

const AlertBox: React.FC<AlertBoxProps> = ({ alert, expanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Determine background color based on alert level
  const getBgColor = (level: string) => {
    switch (level) {
      case 'yellow':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'orange':
        return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'red':
        return 'bg-red-100 border-red-400 text-red-800';
      default:
        return 'bg-blue-100 border-blue-400 text-blue-800';
    }
  };

  // Get icon based on phenomenon
  const getAlertIcon = (phenomenon: string) => {
    const lowerPhenomenon = phenomenon.toLowerCase();
    if (lowerPhenomenon.includes('lluvia') || lowerPhenomenon.includes('rain')) {
      return faCloudRain;
    } else if (lowerPhenomenon.includes('viento') || lowerPhenomenon.includes('wind')) {
      return faWind;
    } else if (lowerPhenomenon.includes('tormenta') || lowerPhenomenon.includes('storm')) {
      return faBolt;
    } else if (lowerPhenomenon.includes('nieve') || lowerPhenomenon.includes('snow')) {
      return faSnowflake;
    } else if (lowerPhenomenon.includes('calor') || lowerPhenomenon.includes('heat')) {
      return faTemperatureHigh;
    } else if (lowerPhenomenon.includes('frío') || lowerPhenomenon.includes('cold')) {
      return faTemperatureLow;
    } else if (lowerPhenomenon.includes('costero') || lowerPhenomenon.includes('coastal')) {
      return faWater;
    } else if (lowerPhenomenon.includes('niebla') || lowerPhenomenon.includes('fog')) {
      return faSmog;
    } else {
      return faTriangleExclamation;
    }
  };

  // Format date to readable string
  const formatDate = (date: Date) => {
    return date.toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const bgColor = getBgColor(alert.level);
  const icon = getAlertIcon(alert.phenomenon);

  return (
    <div className={`p-4 mb-4 border-l-4 rounded-r ${bgColor} transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <FontAwesomeIcon icon={icon} className="mr-3 text-lg" />
          <div>
            <h3 className="font-bold text-sm uppercase">
              {alert.source === 'AEMET' ? 'AEMET' : 'OpenWeather'}: {alert.phenomenon}
            </h3>
            <p className="text-sm font-medium">
              {alert.zone} - {alert.level.toUpperCase()}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm focus:outline-none"
          aria-label={isExpanded ? 'Collapse alert details' : 'Expand alert details'}
        >
          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-opacity-20 border-current">
          <p className="text-sm mb-2">{alert.description}</p>
          <div className="text-xs flex justify-between">
            <span>Desde: {formatDate(alert.startTime)}</span>
            <span>Hasta: {formatDate(alert.endTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertBox;
