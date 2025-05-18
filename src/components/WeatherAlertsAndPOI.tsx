import React, { useState, useEffect } from 'react';
import { WeatherAlert, aemetService } from '../services/aemetService';
import { POI, osmService } from '../services/osmService';
import { getAIInsight } from '../services/aiService';
import AlertBox from './AlertBox';
import POIList from './POIList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faMapMarkedAlt, faSpinner, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

interface WeatherAlertsAndPOIProps {
  lat: number;
  lon: number;
  location: string;
  condition: string;
  temperature: number;
  className?: string;
}

const WeatherAlertsAndPOI: React.FC<WeatherAlertsAndPOIProps> = ({
  lat,
  lon,
  location,
  condition,
  temperature,
  className = ''
}) => {
  // State for alerts and POIs
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showAlerts, setShowAlerts] = useState<boolean>(true);
  const [showPOIs, setShowPOIs] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch alerts and POIs on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch weather alerts
        const weatherAlerts = await aemetService.getWeatherAlerts(lat, lon);
        setAlerts(weatherAlerts);
        
        // Fetch POIs
        const nearbyPOIs = await osmService.getPOIs(lat, lon, 5000);
        setPois(nearbyPOIs);
        
        // Generate AI insight with the new data
        if (location && condition) {
          const insight = await getAIInsight(
            location,
            condition,
            temperature,
            weatherAlerts,
            nearbyPOIs.slice(0, 5) // Just use the first 5 POIs for the insight
          );
          setAiInsight(insight);
        }
      } catch (err) {
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo más tarde.');
        console.error('Error fetching alerts and POIs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [lat, lon, location, condition, temperature]);
  
  // Filter POIs by category and remove unnamed locations
  const filteredPOIs = selectedCategory 
    ? pois.filter(poi => poi.category === selectedCategory && (poi.name !== 'Unnamed location' || poi.isInteresting))
    : pois.filter(poi => poi.name !== 'Unnamed location' || poi.isInteresting);
  
  // Get POI categories
  const poiCategories = Array.from(new Set(pois.map(poi => poi.category)));
  
  // Get translated category name
  const getCategoryName = (category: string): string => {
    const categoryNames: Record<string, string> = {
      'tourism': 'Turismo',
      'natural': 'Naturaleza',
      'leisure': 'Ocio',
      'amenity': 'Servicios',
      'other': 'Otros'
    };
    return categoryNames[category] || category;
  };
  
  return (
    <div className={`weather-alerts-poi ${className}`}>
      {/* AI Insight Section */}
      {aiInsight && (
        <div className="ai-insight bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <div className="flex items-start">
            <div className="mr-3 mt-1 text-blue-500">
              <FontAwesomeIcon icon={faMapMarkedAlt} />
            </div>
            <p className="text-blue-800">{aiInsight}</p>
          </div>
        </div>
      )}
      
      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-4">
          <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500 text-xl" />
          <p className="mt-2 text-gray-600">Cargando datos...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200 text-red-700">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 mt-1" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Alerts Section */}
      {!loading && alerts.length > 0 && (
        <div className="alerts-section mb-6">
          <div 
            className="flex justify-between items-center mb-2 cursor-pointer" 
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <h2 className="text-lg font-bold flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-yellow-500" />
              Alertas Meteorológicas ({alerts.length})
            </h2>
            <FontAwesomeIcon icon={showAlerts ? faChevronUp : faChevronDown} />
          </div>
          
          {showAlerts && (
            <div className="alerts-container">
              {alerts.map(alert => (
                <AlertBox key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* POIs Section */}
      {!loading && pois.length > 0 && (
        <div className="pois-section">
          <div 
            className="flex justify-between items-center mb-2 cursor-pointer" 
            onClick={() => setShowPOIs(!showPOIs)}
          >
            <h2 className="text-lg font-bold flex items-center">
              <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-blue-500" />
              Lugares Cercanos ({pois.length})
            </h2>
            <FontAwesomeIcon icon={showPOIs ? faChevronUp : faChevronDown} />
          </div>
          
          {showPOIs && (
            <>
              {/* Category Filter */}
              <div className="category-filter flex flex-wrap gap-2 mb-4">
                <button
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === null 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setSelectedCategory(null)}
                >
                  Todos
                </button>
                
                {poiCategories.map(category => (
                  <button
                    key={category}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === category 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {getCategoryName(category)}
                  </button>
                ))}
              </div>
              
              {/* POI List */}
              <POIList 
                pois={filteredPOIs} 
                onSelectPOI={(poi) => {
                  // Open in maps app
                  window.open(`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`, '_blank');
                }}
                showOnlyInteresting={true}
                maxItems={15}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherAlertsAndPOI;
