import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore - Ignorar error de tipos para mapbox-gl
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkedAlt, faSpinner, faLayerGroup, faInfo, faTimes } from '@fortawesome/free-solid-svg-icons';
import { POI } from '../services/osmService';
import { createError, ErrorType, ErrorSeverity } from '../services/errorService';
import POIDetails from './POIDetails';

// Mapbox token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiYXZvdGllbXBvIiwiYSI6ImNrbTVwZ2JwNjBtNGcydW1xdWRoNDduZGcifQ.r45fLo7JoE7ZUQDymLzQJQ';

interface POIMapProps {
  pois: POI[];
  centerLat: number;
  centerLon: number;
  onSelectPOI?: (poi: POI) => void;
  className?: string;
}

const POIMap: React.FC<POIMapProps> = ({
  pois,
  centerLat,
  centerLon,
  onSelectPOI,
  className = ''
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    tourism: true,
    natural: true,
    leisure: true,
    amenity: true,
    other: true
  });

  // Function to get marker color based on POI category
  const getMarkerColor = (category: string): string => {
    const colors: Record<string, string> = {
      tourism: '#3b82f6', // blue
      natural: '#10b981', // green
      leisure: '#f59e0b', // amber
      amenity: '#ef4444', // red
      other: '#6b7280'    // gray
    };
    return colors[category] || colors.other;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    try {
      setIsLoading(true);
      
      // Create map instance
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [centerLon, centerLat],
        zoom: 13
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add user location marker
      new mapboxgl.Marker({
        color: '#f97316', // amber-500
        scale: 1.2
      })
        .setLngLat([centerLon, centerLat])
        .addTo(map.current);
        
      // Add event handlers
      map.current.on('load', () => {
        setIsLoading(false);
      });
      
      map.current.on('error', (e: Error | any) => {
        console.error('Mapbox error:', e);
        setError('Error al cargar el mapa. Por favor, inténtalo de nuevo más tarde.');
        setIsLoading(false);
      });
      
      // Clean up
      return () => {
        map.current?.remove();
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Error al inicializar el mapa. Por favor, inténtalo de nuevo más tarde.');
      setIsLoading(false);
    }
  }, [centerLat, centerLon]);
  
  // Add POI markers when pois or active layers change
  useEffect(() => {
    if (!map.current || isLoading) return;
    
    // Clear existing markers (except user location)
    const markers = document.querySelectorAll('.mapboxgl-marker:not(:first-child)');
    markers.forEach(marker => marker.remove());
    
    // Add markers for filtered POIs
    const filteredPOIs = pois.filter(poi => activeLayers[poi.category]);
    
    filteredPOIs.forEach(poi => {
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker';
      markerEl.style.width = '30px';
      markerEl.style.height = '30px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = getMarkerColor(poi.category);
      markerEl.style.display = 'flex';
      markerEl.style.alignItems = 'center';
      markerEl.style.justifyContent = 'center';
      markerEl.style.color = 'white';
      markerEl.style.cursor = 'pointer';
      markerEl.style.border = poi.isInteresting ? '2px solid white' : 'none';
      markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      markerEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a8 8 0 0 0-8 8c0 1.808.594 3.497 1.594 4.875L12 24l6.406-11.125A7.95 7.95 0 0 0 20 8a8 8 0 0 0-8-8zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>`;
      
      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; max-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${poi.name}</h3>
          <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 4px;">${poi.type}</p>
          <p style="font-size: 0.875rem; color: #4b5563;">
            ${(poi.distance < 1000) ? `${Math.round(poi.distance)} m` : `${(poi.distance / 1000).toFixed(1)} km`}
          </p>
        </div>
      `);
      
      // Create and add marker
      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([poi.lon, poi.lat])
        .setPopup(popup)
        .addTo(map.current!);
      
      // Add click handler
      markerEl.addEventListener('click', () => {
        setSelectedPOI(poi);
        if (onSelectPOI) onSelectPOI(poi);
      });
    });
  }, [pois, activeLayers, isLoading, onSelectPOI]);
  
  // Toggle layer visibility
  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };
  
  // Get a friendly name for a category
  const getCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      tourism: 'Turismo',
      natural: 'Naturaleza',
      leisure: 'Ocio',
      amenity: 'Servicios',
      other: 'Otros'
    };
    return names[category] || category;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="w-full h-64 rounded-lg overflow-hidden shadow-md"
      />
      
      {/* Layer controls button */}
      <button
        className="absolute top-2 left-2 bg-white p-2 rounded-md shadow-md z-10"
        onClick={() => setShowLayerControl(!showLayerControl)}
      >
        <FontAwesomeIcon icon={faLayerGroup} className="text-gray-700" />
      </button>
      
      {/* Layer controls panel */}
      {showLayerControl && (
        <div className="absolute top-12 left-2 bg-white p-3 rounded-md shadow-md z-10 text-sm">
          <h3 className="font-bold mb-2">Capas</h3>
          {Object.keys(activeLayers).map(layer => (
            <div key={layer} className="flex items-center mb-1">
              <input
                type="checkbox"
                id={`layer-${layer}`}
                checked={activeLayers[layer]}
                onChange={() => toggleLayer(layer)}
                className="mr-2"
              />
              <label 
                htmlFor={`layer-${layer}`}
                className="flex items-center cursor-pointer"
              >
                <span 
                  className="w-3 h-3 inline-block rounded-full mr-2"
                  style={{ backgroundColor: getMarkerColor(layer) }}
                />
                {getCategoryName(layer)}
              </label>
            </div>
          ))}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <div className="bg-white p-3 rounded-md shadow-md">
            <FontAwesomeIcon icon={faSpinner} spin className="text-amber-500 mr-2" />
            <span>Cargando mapa...</span>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
          <div className="bg-white p-4 rounded-md shadow-md max-w-xs">
            <FontAwesomeIcon icon={faInfo} className="text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* POI Info panel when selected */}
      {selectedPOI && (
        <div className="absolute bottom-2 left-2 right-2 bg-white rounded-md shadow-md z-10 max-h-80 overflow-auto">
          <div className="absolute top-2 right-2 z-20">
            <button 
              className="bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              onClick={() => setSelectedPOI(null)}
            >
              <FontAwesomeIcon icon={faTimes} className="text-gray-600" />
            </button>
          </div>
          <POIDetails 
            poi={selectedPOI} 
            className="border-none shadow-none" 
          />
        </div>
      )}
    </div>
  );
};

export default POIMap;
