import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faTemperatureHigh, faUmbrella, faWind, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { getTemperatureUnit } from '../services/settingsService';

interface LocationComparisonData {
  name: string;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  distance?: number; // in km
  similarityScore: number; // 0-100
}

interface SimilarLocationsComparisonProps {
  currentLocation: string;
  currentTemperature: number;
  currentPrecipitation: number;
  currentWindSpeed: number;
  similarLocations: LocationComparisonData[];
  units: 'metric' | 'imperial';
  className?: string;
}

const SimilarLocationsComparison: React.FC<SimilarLocationsComparisonProps> = ({
  currentLocation,
  currentTemperature,
  currentPrecipitation,
  currentWindSpeed,
  similarLocations,
  units,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(false);
  // Converti le unità per renderle compatibili
  const tempUnit = units === 'metric' ? '°C' : '°F';

  // Mostra solo le prime 3 località, o tutte se expanded
  const locationsToShow = expanded
    ? similarLocations
    : similarLocations.slice(0, 3);

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="text-base font-medium mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-[var(--color-highlight)]" />
          Località con clima simile
        </div>
        {similarLocations.length > 3 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
          >
            {expanded ? 'Mostra meno' : 'Mostra tutte'}
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="ml-1" />
          </button>
        )}
      </h3>

      <div className="space-y-3">
        {/* La location attuale come riferimento */}
        <div className="bg-[var(--color-highlight-light)] rounded-lg p-3 flex justify-between">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-[var(--color-highlight)]" />
            <div>
              <p className="font-medium">{currentLocation}</p>
              <p className="text-xs text-gray-600">Località attuale</p>
            </div>
          </div>
          <div className="flex space-x-3 text-sm">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faTemperatureHigh} className="mr-1 text-amber-500" />
              <span>{currentTemperature}{tempUnit}</span>
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faUmbrella} className="mr-1 text-blue-500" />
              <span>{currentPrecipitation}%</span>
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faWind} className="mr-1 text-gray-500" />
              <span>{currentWindSpeed} km/h</span>
            </div>
          </div>
        </div>

        {/* Le location simili */}
        {locationsToShow.map((location, index) => (
          <div key={index} className="border border-gray-100 rounded-lg p-3 flex justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs mr-2">
                {Math.round(location.similarityScore)}%
              </div>
              <div>
                <p className="font-medium">{location.name}</p>
                <p className="text-xs text-gray-600">
                  {location.distance ? `${location.distance} km di distanza` : 'Clima simile'}
                </p>
              </div>
            </div>
            <div className="flex space-x-3 text-sm">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faTemperatureHigh} className="mr-1 text-amber-500" />
                <span>{location.temperature}{tempUnit}</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faUmbrella} className="mr-1 text-blue-500" />
                <span>{location.precipitation}%</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={faWind} className="mr-1 text-gray-500" />
                <span>{location.windSpeed} km/h</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Le località sono ordinate per similarità climatica basata su temperatura, precipitazioni 
        e altre condizioni meteo. La percentuale indica la similarità complessiva.
      </p>
    </div>
  );
};

export default SimilarLocationsComparison;
