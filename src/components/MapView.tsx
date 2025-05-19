import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMap } from '@fortawesome/free-solid-svg-icons';
import { API_KEYS } from '../services/apiConfigService';

// Imposta la chiave API di Mapbox
mapboxgl.accessToken = API_KEYS.MAPBOX;

interface MapViewProps {
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
  pois?: any[];
  selectedPoiType?: string;
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({ 
  center = [28.6835, -17.7642], // Default: Santa Cruz de La Palma
  zoom = 12,
  pois = [],
  selectedPoiType,
  className = ''
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Colori per i marker in base al tipo
  const getMarkerColor = (poiType: string) => {
    if (poiType.includes('natural')) return '#3B82F6'; // blue
    if (poiType.includes('tourism')) return '#EC4899'; // pink
    if (poiType.includes('amenity')) return '#F59E0B'; // amber
    if (poiType.includes('leisure')) return '#10B981'; // emerald
    return '#6366F1'; // indigo (default)
  };

  // Inizializza la mappa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [center[1], center[0]], // Mapbox usa [lng, lat]
      zoom: zoom
    });

    // Aggiungi controlli di navigazione
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Aggiorna il centro della mappa quando cambia
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center: [center[1], center[0]], zoom });
  }, [center, zoom]);

  // Aggiungi marker per i POI
  useEffect(() => {
    if (!map.current || !pois || pois.length === 0) return;

    // Rimuovi marker esistenti
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Aggiungi nuovi marker
    pois.forEach(poi => {
      if (!poi.lat || !poi.lon) return;
      
      // Crea elemento per il marker
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = getMarkerColor(selectedPoiType || '');
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      
      // Crea un popup
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div>
            <h3 class="font-medium">${poi.name || 'POI'}</h3>
            ${poi.description ? `<p class="text-sm">${poi.description}</p>` : ''}
            ${poi.tags ? `<p class="text-xs text-gray-500 mt-1">${poi.tags}</p>` : ''}
          </div>
        `);
      
      // Aggiungi marker alla mappa
      new mapboxgl.Marker(el)
        .setLngLat([poi.lon, poi.lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Adatta la vista per mostrare tutti i marker
    if (pois.length > 1 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      pois.forEach(poi => {
        if (poi.lat && poi.lon) {
          bounds.extend([poi.lon, poi.lat]);
        }
      });
      
      // Aggiungi anche il centro (posizione attuale dell'utente)
      bounds.extend([center[1], center[0]]);
      
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14
      });
    }
  }, [pois, selectedPoiType]);

  // Stile per il marker del centro (posizione utente)
  useEffect(() => {
    if (!map.current) return;
    
    // Rimuovi marker centrale esistente
    const existingUserMarker = document.querySelector('.user-marker');
    if (existingUserMarker) existingUserMarker.remove();
    
    // Crea elemento per il marker utente
    const el = document.createElement('div');
    el.className = 'user-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#EF4444'; // red-500
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    
    // Aggiungi marker dell'utente alla mappa
    new mapboxgl.Marker(el)
      .setLngLat([center[1], center[0]])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<p>La tua posizione</p>'))
      .addTo(map.current);
  }, [center]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Mostra messaggio se la mappa non può essere caricata */}
      {!mapboxgl.supported() && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <FontAwesomeIcon icon={faMap} className="text-3xl text-gray-400 mb-2" />
            <p className="text-gray-600">
              Il tuo browser non supporta Mapbox GL.
              <br />
              Prova ad utilizzare un browser più recente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
