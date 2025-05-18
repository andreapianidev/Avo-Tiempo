import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkedAlt, faSpinner, faChevronDown, faChevronUp, 
  faLightbulb, faMapMarkerAlt, faWalking, faMap, faList,
  faExclamationTriangle, faMountainSun
} from '@fortawesome/free-solid-svg-icons';
import { POI, osmService } from '../services/osmService';
import { getAIInsight } from '../services/aiService';
import POIList from './POIList';
import POIMap from './POIMap';
import { LocationItem } from '../services/locationService';
import { createError, ErrorType, ErrorSeverity } from '../services/errorService';

interface LocationPOIRecommendationsProps {
  location: LocationItem;
  className?: string;
}

const LocationPOIRecommendations: React.FC<LocationPOIRecommendationsProps> = ({
  location,
  className = ''
}) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showPOIs, setShowPOIs] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);

  useEffect(() => {
    const fetchPOIs = async () => {
      if (!location || !location.lat || !location.lon) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch POIs from OpenStreetMap
        const nearbyPOIs = await osmService.getPOIs(location.lat, location.lon, 5000);
        setPois(nearbyPOIs);
        
        // Generate AI recommendation if we have weather data
        if (location.condition && location.temperature !== undefined) {
          const recommendation = await getAIInsight(
            location.name,
            location.condition,
            location.temperature,
            [], // No alerts in this context
            nearbyPOIs.slice(0, 5) // Use top 5 POIs for recommendation
          );
          setAiRecommendation(recommendation);
        }
      } catch (err) {
        setError('Error al cargar los puntos de interés. Por favor, inténtalo de nuevo más tarde.');
        console.error('Error fetching POIs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPOIs();
  }, [location]);

  if (loading) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <FontAwesomeIcon icon={faSpinner} spin className="text-amber-500 text-xl" />
        <p className="mt-2 text-gray-600">Buscando lugares interesantes cerca de {location.name}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 p-3 rounded-lg ${className}`}>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (pois.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-amber-500 text-xl mb-2" />
        <p className="text-gray-600">No se encontraron lugares interesantes cerca de {location.name}.</p>
      </div>
    );
  }

  return (
    <div className={`location-poi-recommendations ${className}`}>
      {/* AI Recommendation */}
      {aiRecommendation && (
        <div className="ai-recommendation bg-amber-50 p-4 rounded-lg mb-4 border border-amber-200">
          <div className="flex items-start">
            <div className="mr-3 mt-1 text-amber-500">
              <FontAwesomeIcon icon={faLightbulb} />
            </div>
            <p className="text-amber-800">{aiRecommendation}</p>
          </div>
        </div>
      )}
      
      {/* POIs Section Header */}
      <div className="pois-section">
        <div className="flex justify-between items-center mb-2">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={() => setShowPOIs(!showPOIs)}
          >
            <h2 className="text-lg font-bold flex items-center">
              <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-amber-500" />
              Lugares Cercanos ({pois.length})
            </h2>
            <FontAwesomeIcon icon={showPOIs ? faChevronUp : faChevronDown} className="ml-2 text-gray-500" />
          </div>
          
          {/* View toggle buttons */}
          {showPOIs && pois.length > 0 && (
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                className={`px-3 py-1 text-xs flex items-center ${viewMode === 'list' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setViewMode('list')}
              >
                <FontAwesomeIcon icon={faList} className="mr-1" />
                Lista
              </button>
              <button
                className={`px-3 py-1 text-xs flex items-center ${viewMode === 'map' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setViewMode('map')}
              >
                <FontAwesomeIcon icon={faMap} className="mr-1" />
                Mapa
              </button>
            </div>
          )}
        </div>
        
        {/* POIs Content */}
        {showPOIs && (
          <>
            {/* POI View content based on selected mode */}
            {viewMode === 'list' ? (
              // List view
              <POIList 
                pois={pois} 
                showOnlyInteresting={true}
                maxItems={10}
                onSelectPOI={(poi) => {
                  setSelectedPOI(poi);
                  // Si estamos en lista, cambiamos a mapa para mostrar el POI seleccionado
                  setViewMode('map');
                }}
              />
            ) : (
              // Map view
              location.lat && location.lon ? (
                <POIMap
                  pois={pois}
                  centerLat={location.lat}
                  centerLon={location.lon}
                  onSelectPOI={setSelectedPOI}
                  className="mb-3"
                />
              ) : (
                <div className="bg-red-50 p-4 rounded-lg mb-3">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2 mt-1" />
                    <p className="text-red-700 text-sm">No se pueden mostrar los lugares en el mapa porque faltan las coordenadas de la ubicación.</p>
                  </div>
                </div>
              )
            )}
            
            {/* Selected POI info */}
            {selectedPOI && (
              <div className="bg-blue-50 p-3 rounded-lg mb-3 border border-blue-200">
                <h3 className="font-bold text-blue-800">{selectedPOI.name}</h3>
                <p className="text-sm text-blue-600">{selectedPOI.type} · {selectedPOI.distance < 1000 ? `${Math.round(selectedPOI.distance)} m` : `${(selectedPOI.distance / 1000).toFixed(1)} km`}</p>
                
                <div className="flex mt-2 space-x-2">
                  <button 
                    className="flex items-center px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedPOI.lat},${selectedPOI.lon}`, '_blank')}
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1" />
                    Ver en mapa
                  </button>
                  
                  <button 
                    className="flex items-center px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lon}&destination=${selectedPOI.lat},${selectedPOI.lon}&travelmode=walking`, '_blank')}
                  >
                    <FontAwesomeIcon icon={faWalking} className="mr-1" />
                    Cómo llegar
                  </button>
                </div>
              </div>
            )}
            
            {/* Explore suggestions */}
            <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Sugerencias para explorar:</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200 transition-colors"
                  onClick={() => {
                    // Buscar restaurantes cercanos
                    const restaurants = pois.filter(p => p.category === 'amenity' && (p.type === 'restaurant' || p.type === 'cafe' || p.type === 'bar'));
                    if (restaurants.length > 0) {
                      setSelectedPOI(restaurants[0]);
                      setViewMode('map');
                    } else {
                      // Si no hay restaurantes, buscar por Google Maps
                      window.open(`https://www.google.com/maps/search/restaurantes+cerca+de+${encodeURIComponent(location.name)}`, '_blank');
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faWalking} className="mr-1" />
                  Restaurantes cercanos
                </button>
                
                <button 
                  className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200 transition-colors"
                  onClick={() => {
                    // Buscar puntos turísticos cercanos 
                    const tourism = pois.filter(p => p.category === 'tourism');
                    if (tourism.length > 0) {
                      setSelectedPOI(tourism[0]);
                      setViewMode('map');
                    } else {
                      window.open(`https://www.google.com/maps/search/atracciones+turisticas+cerca+de+${encodeURIComponent(location.name)}`, '_blank');
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-1" />
                  Puntos turísticos
                </button>
                
                <button 
                  className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200 transition-colors"
                  onClick={() => {
                    // Filtrar puntos naturales
                    const nature = pois.filter(p => p.category === 'natural');
                    if (nature.length > 0) {
                      setSelectedPOI(nature[0]);
                      setViewMode('map');
                    } else {
                      window.open(`https://www.google.com/maps/search/naturaleza+cerca+de+${encodeURIComponent(location.name)}`, '_blank');
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faMountainSun} className="mr-1" />
                  Naturaleza
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LocationPOIRecommendations;
