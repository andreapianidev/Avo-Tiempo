import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCompass, 
  faTachometerAlt, 
  faWind, 
  faCloudRain, 
  faSnowflake,
  faEye, 
  faCloud, 
  faSun, 
  faMoon,
  faThermometerHalf,
  faWater
} from '@fortawesome/free-solid-svg-icons';

interface WeatherDetailsProps {
  pressure?: number;
  visibility?: number;
  sunrise?: number;
  sunset?: number;
  windSpeed: number;
  windDirection?: number;
  windGust?: number;
  humidity: number;
  clouds?: number;
  rain1h?: number;
  snow1h?: number;
  uvIndex?: number;
  className?: string;
}

const WeatherDetails: React.FC<WeatherDetailsProps> = ({
  pressure,
  visibility,
  sunrise,
  sunset,
  windSpeed,
  windDirection,
  windGust,
  humidity,
  clouds,
  rain1h,
  snow1h,
  uvIndex,
  className = ''
}) => {
  // Funzione per formattare l'orario dai timestamp
  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '--:--';
    return new Date(timestamp * 1000).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  // Converte la direzione in gradi in punti cardinali
  const getWindDirection = (degrees?: number): string => {
    if (degrees === undefined) return 'N/D';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className={`bg-[var(--color-card-bg)] rounded-3xl p-5 shadow-sm ${className}`}>
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
        Detalles Meteorológicos
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Vento */}
        <div className="bg-[var(--color-bg-main)] rounded-xl p-3">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faWind} className="text-[var(--color-highlight)] mr-2" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Viento</span>
          </div>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {windSpeed} km/h
          </p>
          {windDirection !== undefined && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Dirección: {getWindDirection(windDirection)} ({windDirection}°)
            </p>
          )}
          {windGust && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Ráfagas: {windGust} km/h
            </p>
          )}
        </div>
        
        {/* Pressione */}
        <div className="bg-[var(--color-bg-main)] rounded-xl p-3">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faTachometerAlt} className="text-[var(--color-highlight)] mr-2" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Presión</span>
          </div>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {pressure || 'N/D'} hPa
          </p>
        </div>
        
        {/* Umidità */}
        <div className="bg-[var(--color-bg-main)] rounded-xl p-3">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faWater} className="text-[var(--color-highlight)] mr-2" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Humedad</span>
          </div>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {humidity}%
          </p>
        </div>
        
        {/* Visibilità */}
        <div className="bg-[var(--color-bg-main)] rounded-xl p-3">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faEye} className="text-[var(--color-highlight)] mr-2" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Visibilidad</span>
          </div>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {visibility !== undefined ? `${visibility} km` : 'N/D'}
          </p>
        </div>
        
        {/* Alba e tramonto */}
        <div className="bg-[var(--color-bg-main)] rounded-xl p-3">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faSun} className="text-[var(--color-highlight)] mr-2" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Amanecer/Atardecer</span>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                <FontAwesomeIcon icon={faSun} className="text-yellow-500 mr-1" /> 
                {formatTime(sunrise)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                <FontAwesomeIcon icon={faMoon} className="text-blue-400 mr-1" /> 
                {formatTime(sunset)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Nuvolosità */}
        <div className="bg-[var(--color-bg-main)] rounded-xl p-3">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faCloud} className="text-[var(--color-highlight)] mr-2" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Nubes</span>
          </div>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {clouds !== undefined ? `${clouds}%` : 'N/D'}
          </p>
        </div>
        
        {/* Precipitazioni */}
        {(rain1h !== undefined || snow1h !== undefined) && (
          <div className="bg-[var(--color-bg-main)] rounded-xl p-3 col-span-2">
            <div className="flex items-center mb-2">
              <FontAwesomeIcon 
                icon={snow1h !== undefined ? faSnowflake : faCloudRain} 
                className="text-[var(--color-highlight)] mr-2" 
              />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Precipitaciones</span>
            </div>
            <div className="flex justify-between">
              {rain1h !== undefined && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faCloudRain} className="text-blue-500 mr-1" /> 
                  Lluvia: {rain1h} mm
                </p>
              )}
              {snow1h !== undefined && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <FontAwesomeIcon icon={faSnowflake} className="text-blue-300 mr-1" /> 
                  Nieve: {snow1h} mm
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Indice UV se disponibile */}
        {uvIndex !== undefined && (
          <div className="bg-[var(--color-bg-main)] rounded-xl p-3 col-span-2">
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={faSun} className="text-[var(--color-highlight)] mr-2" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Índice UV</span>
            </div>
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">
              {uvIndex}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {uvIndex <= 2 ? 'Bajo' : 
               uvIndex <= 5 ? 'Moderado' : 
               uvIndex <= 7 ? 'Alto' : 
               uvIndex <= 10 ? 'Muy alto' : 'Extremo'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherDetails;
