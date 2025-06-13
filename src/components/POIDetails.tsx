import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, faPhone, faGlobe, faEnvelope, faClock, 
  faDirections, faCamera, faChevronLeft, faExternalLinkAlt,
  faUtensils, faMountain, faTree, faStore, faUmbrellaBeach, 
  faLandmark, faBuilding, faHotel, faCoffee, faHospital
} from '@fortawesome/free-solid-svg-icons';
import { POI } from '../services/osmService';

interface POIDetailsProps {
  poi: POI;
  onBack?: () => void;
  className?: string;
}

// Map of category icons for specific POI types
const CATEGORY_ICONS: Record<string, any> = {
  // Tourism
  tourism: faMountain,
  viewpoint: faMountain,
  attraction: faLandmark,
  museum: faLandmark,
  hotel: faHotel,
  
  // Natural
  natural: faTree,
  beach: faUmbrellaBeach,
  peak: faMountain,
  
  // Leisure
  leisure: faTree,
  park: faTree,
  garden: faTree,
  swimming_pool: faUmbrellaBeach,
  
  // Amenity
  amenity: faStore,
  restaurant: faUtensils,
  cafe: faCoffee,
  bar: faUtensils,
  hospital: faHospital,
  
  // Default
  default: faMapMarkerAlt
};

const POIDetails: React.FC<POIDetailsProps> = ({ poi, onBack, className = '' }) => {
  // Helper to get an icon for the POI category
  const getCategoryIcon = () => {
    // Check if we have a specific icon for this POI type
    const poiType = poi.tags.amenity || poi.tags.tourism || poi.tags.leisure || poi.tags.natural || '';
    
    if (poiType && CATEGORY_ICONS[poiType]) {
      return CATEGORY_ICONS[poiType];
    }
    
    // Otherwise use the category icon
    return CATEGORY_ICONS[poi.category] || CATEGORY_ICONS.default;
  };

  // Extract opening hours if available
  const openingHours = poi.tags.opening_hours;
  
  // Extract contact information
  const phone = poi.tags.phone || poi.tags['contact:phone'];
  const website = poi.tags.website || poi.tags['contact:website'] || poi.tags.url;
  const email = poi.tags.email || poi.tags['contact:email'];
  
  // Check if we have an image/photo
  const image = poi.tags.image || poi.tags.wikimedia_commons;
  
  // Format the distance
  const formattedDistance = poi.distance < 1000
    ? `${Math.round(poi.distance)} m` 
    : `${(poi.distance / 1000).toFixed(1)} km`;

  // Handle navigation
  const handleNavigate = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}&travelmode=walking`, 
      '_blank'
    );
  };

  // Handle external website
  const handleWebsiteClick = () => {
    if (website) {
      window.open(website, '_blank');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header with back button */}
      <div className="bg-amber-500 text-white p-4 flex items-center">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-2 hover:bg-amber-600 rounded-full p-1"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
        <FontAwesomeIcon icon={getCategoryIcon()} className="mr-2" />
        <h2 className="text-lg font-bold flex-1">{poi.name}</h2>
      </div>
      
      {/* Image if available */}
      {image && (
        <div className="relative h-48 bg-gray-200">
          {/* Image could be a Wikimedia Commons URL or a direct image URL */}
          {image.includes('wikimedia') ? (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCamera} size="2x" className="text-gray-400" />
              <span className="ml-2 text-gray-500">Imagen disponible en Wikimedia Commons</span>
            </div>
          ) : (
            <img 
              src={image} 
              alt={poi.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails to load, show a placeholder
                e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Sin+Imagen';
              }}
            />
          )}
        </div>
      )}
      
      {/* POI Information */}
      <div className="p-4">
        {/* Type and distance */}
        <div className="text-gray-600 mb-3 flex items-center">
          <span className="text-amber-500 mr-1">
            <FontAwesomeIcon icon={faMapMarkerAlt} size="sm" />
          </span>
          {poi.type} · {formattedDistance}
        </div>
        
        {/* Description */}
        {poi.tags.description && (
          <p className="text-gray-700 mb-4">{poi.tags.description}</p>
        )}
        
        {/* Opening Hours */}
        {openingHours && (
          <div className="flex items-start mb-3">
            <span className="text-amber-500 mr-2 mt-1">
              <FontAwesomeIcon icon={faClock} />
            </span>
            <div>
              <h4 className="font-medium text-gray-800">Horario</h4>
              <p className="text-sm text-gray-600">{openingHours}</p>
            </div>
          </div>
        )}
        
        {/* Contact Information */}
        {phone && (
          <div className="flex items-center mb-3">
            <span className="text-amber-500 mr-2">
              <FontAwesomeIcon icon={faPhone} />
            </span>
            <a 
              href={`tel:${phone}`} 
              className="text-blue-600 hover:underline"
            >
              {phone}
            </a>
          </div>
        )}
        
        {website && (
          <div className="flex items-center mb-3">
            <span className="text-amber-500 mr-2">
              <FontAwesomeIcon icon={faGlobe} />
            </span>
            <a 
              href="#" 
              onClick={handleWebsiteClick}
              className="text-blue-600 hover:underline flex items-center"
            >
              <span className="truncate max-w-[200px]">
                {website.replace(/^https?:\/\//, '')}
              </span>
              <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className="ml-1" />
            </a>
          </div>
        )}
        
        {email && (
          <div className="flex items-center mb-3">
            <span className="text-amber-500 mr-2">
              <FontAwesomeIcon icon={faEnvelope} />
            </span>
            <a 
              href={`mailto:${email}`} 
              className="text-blue-600 hover:underline"
            >
              {email}
            </a>
          </div>
        )}
        
        {/* Additional OSM tags that might be useful */}
        {poi.tags.wheelchair && (
          <div className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Accesibilidad: </span>
            {poi.tags.wheelchair === 'yes' ? 'Accesible para sillas de ruedas' : poi.tags.wheelchair}
          </div>
        )}
        
        {poi.tags.cuisine && (
          <div className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Cocina: </span>
            {poi.tags.cuisine}
          </div>
        )}
        
        {/* Navigation Button */}
        <button
          onClick={handleNavigate}
          className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
        >
          <FontAwesomeIcon icon={faDirections} className="mr-2" />
          Cómo llegar
        </button>
      </div>
    </div>
  );
};

export default POIDetails;
