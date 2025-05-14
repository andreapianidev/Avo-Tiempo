import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faCloud, faCloudRain, faWind, faSnowflake, faMountainSun, faCloudShowersHeavy } from '@fortawesome/free-solid-svg-icons';
import { getTemperatureUnit } from '../services/settingsService';

interface ForecastCardProps {
  time: string;
  temperature: number;
  condition: string;
  isNow?: boolean;
  units: 'celsius' | 'fahrenheit';
}

const ForecastCard: React.FC<ForecastCardProps> = ({ 
  time, 
  temperature, 
  condition, 
  isNow = false,
  units
}) => {
  const getWeatherIcon = () => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <div className="w-14 h-14 mx-auto bg-[var(--color-highlight)] rounded-full shadow-sm"></div>;
      case 'cloudy':
        return <div className="w-14 h-14 mx-auto relative">
                <div className="absolute right-2 top-2 w-8 h-8 bg-[var(--color-highlight)] rounded-full opacity-50"></div>
                <div className="absolute left-2 top-4 w-10 h-6 bg-[var(--color-card-bg)] rounded-full"></div>
               </div>;
      case 'partly cloudy':
        return <div className="w-14 h-14 mx-auto relative">
                <div className="absolute left-1 top-1 w-9 h-9 bg-[var(--color-highlight)] rounded-full"></div>
                <div className="absolute right-1 top-6 w-8 h-5 bg-[var(--color-card-bg)] rounded-full"></div>
               </div>;
      case 'rain':
      case 'rainy':
        return <div className="w-14 h-14 mx-auto relative">
                <div className="absolute left-2 top-2 w-8 h-8 bg-[var(--color-highlight)] rounded-full opacity-50"></div>
                <div className="absolute left-1 top-4 w-10 h-6 bg-[var(--color-card-bg)] rounded-full"></div>
                <div className="absolute left-4 top-8 w-1 h-4 bg-[#8FA7B4] rounded-full"></div>
                <div className="absolute left-6 top-8 w-1 h-4 bg-[#8FA7B4] rounded-full"></div>
                <div className="absolute left-8 top-8 w-1 h-4 bg-[#8FA7B4] rounded-full"></div>
               </div>;
      case 'calima':
        return <div className="w-14 h-14 mx-auto relative">
                <div className="absolute left-2 top-1 w-9 h-9 bg-[var(--color-highlight)] rounded-full opacity-60"></div>
                <div className="absolute left-0 right-0 top-8 h-4 bg-[#D5A76B] opacity-70 rounded-full"></div>
               </div>;
      default:
        return <div className="w-14 h-14 mx-auto bg-[var(--color-highlight)] rounded-full shadow-sm"></div>;
    }
  };

  return (
    <div className="w-20 flex flex-col items-center bg-[var(--color-card-bg)] rounded-xl p-2 shadow-sm mr-3">
      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{isNow ? 'Ahora' : time}</p>
      {getWeatherIcon()}
      <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{temperature}°</p>
    </div>
  );
};

export default ForecastCard;
