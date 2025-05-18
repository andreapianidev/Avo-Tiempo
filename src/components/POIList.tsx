import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, faMountain, faUmbrellaBeach, faCoffee, 
  faUtensils, faTree, faWater, faFire, faImage, faInfoCircle,
  faMonument, faMuseum, faPalette, faDungeon, faLeaf, faSwimmingPool,
  faGlassMartiniAlt, faBeer
} from '@fortawesome/free-solid-svg-icons';
import { POI } from '../services/osmService';

interface POIListProps {
  pois: POI[];
  onSelectPOI?: (poi: POI) => void;
  className?: string;
  showOnlyInteresting?: boolean;
  maxItems?: number;
}

const POIList: React.FC<POIListProps> = ({ 
  pois, 
  onSelectPOI, 
  className = '',
  showOnlyInteresting = true,
  maxItems = 10 
}) => {
  // Get the appropriate icon for a POI
  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'fa-mountain': faMountain,
      'fa-umbrella-beach': faUmbrellaBeach,
      'fa-coffee': faCoffee,
      'fa-utensils': faUtensils,
      'fa-tree': faTree,
      'fa-water': faWater,
      'fa-fire': faFire,
      'fa-image': faImage,
      'fa-info-circle': faInfoCircle,
      'fa-monument': faMonument,
      'fa-museum': faMuseum,
      'fa-palette': faPalette,
      'fa-dungeon': faDungeon,
      'fa-leaf': faLeaf,
      'fa-swimming-pool': faSwimmingPool,
      'fa-glass-martini-alt': faGlassMartiniAlt,
      'fa-beer': faBeer,
      'fa-map-marker-alt': faMapMarkerAlt
    };

    return iconMap[iconName] || faMapMarkerAlt;
  };

  // Format distance to be more readable
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  // Filter POIs if needed
  const filteredPOIs = showOnlyInteresting 
    ? pois.filter(poi => poi.isInteresting || poi.name !== 'Unnamed location')
    : pois;
    
  // Sort POIs by interestingness and distance
  const sortedPOIs = [...filteredPOIs].sort((a, b) => {
    // First prioritize interesting POIs
    if (a.isInteresting && !b.isInteresting) return -1;
    if (!a.isInteresting && b.isInteresting) return 1;
    
    // Then sort by distance
    return a.distance - b.distance;
  });
  
  // Limit the number of POIs to display
  const limitedPOIs = sortedPOIs.slice(0, maxItems);
  
  // Group POIs by category
  const groupedPOIs = limitedPOIs.reduce<Record<string, POI[]>>((groups, poi) => {
    const category = poi.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(poi);
    return groups;
  }, {});

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

  if (limitedPOIs.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-gray-500">No hay puntos de interés cercanos</p>
      </div>
    );
  }

  return (
    <div className={`poi-list ${className}`}>
      {Object.entries(groupedPOIs).map(([category, categoryPOIs]) => (
        <div key={category} className="mb-4">
          <h3 className="font-bold text-lg mb-2">{getCategoryName(category)}</h3>
          <div className="space-y-2">
            {categoryPOIs.map(poi => (
              <div 
                key={poi.id} 
                className={`flex items-center p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-colors ${poi.isInteresting ? 'border-l-4 border-blue-500' : ''}`}
                onClick={() => onSelectPOI && onSelectPOI(poi)}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                  <FontAwesomeIcon icon={getIcon(poi.icon)} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{poi.name}</h4>
                  <p className="text-sm text-gray-600">{poi.type}</p>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {formatDistance(poi.distance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default POIList;
