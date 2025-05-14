import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faCloud, faCloudRain, faWind, faDroplet, faTemperatureHalf, faSnowflake, faMountainSun, faCloudShowersHeavy, faExclamationTriangle, faRotate } from '@fortawesome/free-solid-svg-icons';
import { getTemperatureUnit, formatWindSpeed } from '../services/settingsService';

interface WeatherBoxProps {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  units: 'celsius' | 'fahrenheit';
  location?: string;
  alert?: string;
  onRefresh?: () => void;  // Funzione callback per aggiornare i dati
  isRefreshing?: boolean;  // Indica se è in corso un aggiornamento
}

const WeatherBox: React.FC<WeatherBoxProps> = ({
  temperature,
  feelsLike,
  humidity,
  windSpeed,
  condition,
  units,
  location = "Santa Cruz de Tenerife",
  alert,
  onRefresh,
  isRefreshing = false
}) => {
  const getWeatherIcon = () => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <div className="w-24 h-24 bg-[var(--color-highlight)] rounded-full shadow-lg relative">
                 <div className="absolute right-0 bottom-0 w-16 h-8 bg-[var(--color-card-bg)] rounded-full"></div>
               </div>;
      case 'cloudy':
        return <div className="w-24 h-24 relative">
                 <div className="absolute right-8 top-4 w-12 h-12 bg-[var(--color-highlight)] rounded-full"></div>
                 <div className="absolute right-0 top-12 w-16 h-10 bg-[var(--color-card-bg)] rounded-full"></div>
               </div>;
      case 'partly cloudy':
        return <div className="w-24 h-24 relative">
                 <div className="absolute left-0 top-2 w-16 h-16 bg-[var(--color-highlight)] rounded-full"></div>
                 <div className="absolute right-0 top-12 w-16 h-10 bg-[var(--color-card-bg)] rounded-full"></div>
               </div>;
      case 'rain':
      case 'rainy':
        return <div className="w-24 h-24 relative">
                 <div className="absolute right-8 top-2 w-12 h-12 bg-[var(--color-highlight)] rounded-full opacity-50"></div>
                 <div className="absolute right-0 top-8 w-20 h-12 bg-[var(--color-card-bg)] rounded-full"></div>
                 <div className="absolute left-6 top-16 w-1 h-6 bg-[#8FA7B4] rounded-full"></div>
                 <div className="absolute left-10 top-16 w-1 h-6 bg-[#8FA7B4] rounded-full"></div>
                 <div className="absolute left-14 top-16 w-1 h-6 bg-[#8FA7B4] rounded-full"></div>
               </div>;
      case 'thunderstorm':
        return <div className="w-24 h-24 relative">
                 <div className="absolute right-0 top-2 w-20 h-12 bg-[#61636B] rounded-full"></div>
                 <div className="absolute left-8 top-10 w-4 h-14 bg-[var(--color-highlight)] transform rotate-12 z-10"></div>
               </div>;
      case 'calima':
        return <div className="w-24 h-24 relative">
                 <div className="absolute left-0 top-2 w-16 h-16 bg-[var(--color-highlight)] rounded-full opacity-60"></div>
                 <div className="absolute left-0 right-0 top-14 h-6 bg-[#D5A76B] opacity-70 rounded-full"></div>
               </div>;
      default:
        return <div className="w-24 h-24 bg-[var(--color-highlight)] rounded-full shadow-lg relative">
                 <div className="absolute right-0 bottom-0 w-16 h-8 bg-[var(--color-card-bg)] rounded-full"></div>
               </div>;
    }
  };

  return (
    <div className="p-5 bg-[var(--color-card-bg)] rounded-3xl mx-auto max-w-md shadow-sm">
      {/* Logo e intestazione */}
      <div className="flex items-center mb-6 mt-2">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">AVO</h1>
            <h2 className="text-4xl font-bold text-[var(--color-text-primary)] -mt-1 leading-tight">Meteo</h2>
            <p className="text-lg text-[var(--color-text-secondary)]">Canarias</p>
          </div>
          <img 
            src="/assets/logo.png" 
            alt="Avocado Logo" 
            className="w-12 h-12 ml-3" 
          />
        </div>
      </div>

      {/* Informazioni località e temperatura */}
      <div className="mt-5 flex justify-between items-start">
        <div>
          <h3 className="text-3xl font-semibold text-[var(--color-text-primary)] flex items-center mb-2">
            {location}
            {onRefresh && (
              <button 
                onClick={onRefresh} 
                disabled={isRefreshing}
                className={`ml-2 p-1 rounded-full transition-all ${isRefreshing ? 'opacity-50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="Aggiorna dati meteo"
              >
                <FontAwesomeIcon 
                  icon={faRotate} 
                  className={`text-xs text-[var(--color-text-secondary)] ${isRefreshing ? 'animate-spin' : ''}`} 
                />
              </button>
            )}
          </h3>
          <h1 className="text-8xl font-bold text-[var(--color-text-primary)] leading-none mt-4 mb-2">{temperature}°</h1>
        </div>
        <div className="mr-2 mt-2">
          {getWeatherIcon()}
        </div>
      </div>

      {/* Alert box se presente */}
      {alert && (
        <div className="mt-5 bg-[var(--color-alert-bg)] p-4 rounded-xl relative">
          <div className="absolute -top-3 -left-1 w-7 h-7 bg-[var(--color-alert-bg)] rotate-45"></div>
          <div className="flex items-start">
            <div className="bg-[var(--color-alert-text)] bg-opacity-20 p-1 rounded-md mr-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl text-[var(--color-alert-text)]" />
            </div>
            <p className="text-[var(--color-alert-text)] font-medium flex-1">{alert}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherBox;
