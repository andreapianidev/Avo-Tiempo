import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, faMountain, faUmbrellaBeach, faCoffee, 
  faUtensils, faTree, faWater, faMonument, faMuseum, 
  faSwimmingPool, faBeer, faSpinner, faMountainSun, faShoppingBag,
  faHiking, faLandmark, faBinoculars, faAnchor, faFish, faUmbrella,
  faCamera, faShip, faWind, faGlassCheers, faChurch, faHotel, faSailboat,
  faBus, faParking, faGasPump, faWheelchair, faIceCream, faCar,
  faSchool, faStore, faHospital, faPhoneVolume, faMedkit, faRoute
} from '@fortawesome/free-solid-svg-icons';
import { POI, osmService } from '../services/osmService';
import { LocationItem } from '../services/locationService';
import ErrorFeedback from './ErrorFeedback';
import { AppError, handlePOIError } from '../services/errorService';

interface CategoryPOIRecommendationsProps {
  location: LocationItem;
  className?: string;
}

const CategoryPOIRecommendations: React.FC<CategoryPOIRecommendationsProps> = ({
  location,
  className = ''
}) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Categorie predefinite da mostrare
  const categories = [
    // Categorie originali
    { id: 'tourism', name: 'Turismo', icon: faMonument },
    { id: 'natural', name: 'Natura', icon: faMountainSun },
    { id: 'leisure', name: 'Tempo Libero', icon: faSwimmingPool },
    { id: 'amenity-food', name: 'Ristoranti', icon: faUtensils },
    { id: 'amenity-drink', name: 'Bar', icon: faBeer },
    { id: 'beach', name: 'Spiagge', icon: faUmbrellaBeach },
    { id: 'viewpoint', name: 'Panorami', icon: faBinoculars },
    { id: 'shop', name: 'Shopping', icon: faShoppingBag },
    { id: 'hiking', name: 'Sentieri', icon: faHiking },
    { id: 'historic', name: 'Cultura', icon: faLandmark },
    { id: 'watersport', name: 'Sport Acquatici', icon: faAnchor },
    { id: 'accommodation', name: 'Alloggi', icon: faHotel },
    
    // Nuove categorie
    { id: 'transport', name: 'Trasporti', icon: faBus },
    { id: 'parking', name: 'Parcheggi', icon: faParking },
    { id: 'fuel', name: 'Carburante', icon: faGasPump },
    { id: 'amenity-ice', name: 'Gelaterie', icon: faIceCream },
    { id: 'route-scenic', name: 'Strade Panoramiche', icon: faRoute },
    { id: 'healthcare', name: 'Sanità', icon: faMedkit },
    { id: 'emergency', name: 'Emergenze', icon: faPhoneVolume },
    { id: 'amenity-stores', name: 'Negozi Locali', icon: faStore }
  ];

  const fetchPOIs = useCallback(async () => {
    if (!location || !location.lat || !location.lon) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Recupera i POI da OpenStreetMap
      const nearbyPOIs = await osmService.getPOIs(location.lat, location.lon, 5000);
      setPois(nearbyPOIs);
    } catch (err) {
      const appErr = handlePOIError(err, 'Errore nel caricamento dei punti di interesse.');
      setError(appErr);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchPOIs();
  }, [fetchPOIs]);

  // Formatta la distanza in modo leggibile
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  // Filtra i POI in base alla categoria selezionata
  const getFilteredPOIs = (categoryId: string): POI[] => {
    // Categorie originali
    if (categoryId === 'amenity-food') {
      return pois.filter(poi => 
        poi.category === 'amenity' && 
        ['restaurant', 'cafe', 'fast_food'].includes(poi.type)
      ).slice(0, 5);
    } else if (categoryId === 'amenity-drink') {
      return pois.filter(poi => 
        poi.category === 'amenity' && 
        ['bar', 'pub', 'biergarten'].includes(poi.type)
      ).slice(0, 5);
    } else if (categoryId === 'beach') {
      return pois.filter(poi => 
        (poi.category === 'natural' && poi.type === 'beach') ||
        (poi.category === 'tourism' && poi.type === 'beach_resort')
      ).slice(0, 5);
    } else if (categoryId === 'viewpoint') {
      return pois.filter(poi => 
        (poi.category === 'tourism' && poi.type === 'viewpoint') ||
        (poi.category === 'natural' && poi.type === 'cliff')
      ).slice(0, 5);
    } else if (categoryId === 'shop') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['marketplace', 'shop'].includes(poi.type)) ||
        (poi.category === 'tourism' && ['mall', 'marketplace'].includes(poi.type)) ||
        (poi.category === 'shop')
      ).slice(0, 5);
    } else if (categoryId === 'hiking') {
      return pois.filter(poi => 
        (poi.category === 'natural' && ['peak', 'volcano', 'mountain', 'hill'].includes(poi.type)) ||
        (poi.category === 'tourism' && ['trail', 'hiking'].includes(poi.type)) ||
        (poi.category === 'route' && ['hiking', 'foot', 'mountain_hiking'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'historic') {
      return pois.filter(poi => 
        (poi.category === 'tourism' && ['museum', 'attraction', 'gallery', 'monument'].includes(poi.type)) ||
        (poi.category === 'amenity' && ['place_of_worship'].includes(poi.type)) ||
        (poi.category === 'historic')
      ).slice(0, 5);
    } else if (categoryId === 'watersport') {
      return pois.filter(poi => 
        (poi.category === 'leisure' && ['marina', 'water_park', 'swimming_pool', 'beach_resort'].includes(poi.type)) ||
        (poi.category === 'tourism' && ['diving', 'sailing'].includes(poi.type)) ||
        (poi.category === 'sport' && ['swimming', 'diving', 'sailing', 'surfing', 'windsurfing'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'accommodation') {
      return pois.filter(poi => 
        (poi.category === 'tourism' && ['hotel', 'apartment', 'guest_house', 'hostel', 'chalet', 'motel'].includes(poi.type))
      ).slice(0, 5);
    } 
    
    // Nuove categorie
    else if (categoryId === 'transport') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['bus_station', 'taxi', 'ferry_terminal'].includes(poi.type)) ||
        (poi.category === 'public_transport') ||
        (poi.category === 'aeroway' && ['aerodrome', 'helipad', 'heliport'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'parking') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['parking', 'parking_space', 'parking_entrance'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'fuel') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['fuel', 'charging_station'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'amenity-ice') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['ice_cream'].includes(poi.type)) ||
        (poi.category === 'shop' && ['ice_cream', 'confectionery'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'route-scenic') {
      return pois.filter(poi => 
        (poi.tags && poi.tags.scenic === 'yes') ||
        (poi.category === 'route' && ['scenic'].includes(poi.type))
      ).slice(0, 5);
    } else if (categoryId === 'healthcare') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['hospital', 'clinic', 'doctors', 'dentist', 'pharmacy'].includes(poi.type)) ||
        (poi.category === 'healthcare')
      ).slice(0, 5);
    } else if (categoryId === 'emergency') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['police', 'fire_station', 'ambulance_station'].includes(poi.type)) ||
        (poi.category === 'emergency')
      ).slice(0, 5);
    } else if (categoryId === 'amenity-stores') {
      return pois.filter(poi => 
        (poi.category === 'amenity' && ['marketplace'].includes(poi.type)) ||
        (poi.category === 'shop' && ['convenience', 'supermarket', 'bakery', 'butcher', 'greengrocer'].includes(poi.type))
      ).slice(0, 5);
    }
    
    // Categoria generica
    else {
      return pois.filter(poi => 
        poi.category === categoryId && 
        poi.name !== 'Unnamed location'
      ).slice(0, 5);
    }
  };

  // Ottieni l'icona appropriata per un POI
  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'fa-mountain': faMountain,
      'fa-umbrella-beach': faUmbrellaBeach,
      'fa-coffee': faCoffee,
      'fa-utensils': faUtensils,
      'fa-tree': faTree,
      'fa-water': faWater,
      'fa-monument': faMonument,
      'fa-museum': faMuseum,
      'fa-swimming-pool': faSwimmingPool,
      'fa-beer': faBeer,
      'fa-shopping-bag': faShoppingBag,
      'fa-hiking': faHiking,
      'fa-landmark': faLandmark,
      'fa-binoculars': faBinoculars,
      'fa-anchor': faAnchor,
      'fa-fish': faFish,
      'fa-umbrella': faUmbrella,
      'fa-camera': faCamera,
      'fa-ship': faShip,
      'fa-sailboat': faSailboat,
      'fa-wind': faWind,
      'fa-glass-cheers': faGlassCheers,
      'fa-church': faChurch,
      'fa-hotel': faHotel,
      'fa-map-marker-alt': faMapMarkerAlt,
      'fa-bus': faBus,
      'fa-parking': faParking,
      'fa-gas-pump': faGasPump,
      'fa-wheelchair': faWheelchair,
      'fa-ice-cream': faIceCream,
      'fa-car': faCar,
      'fa-school': faSchool,
      'fa-store': faStore,
      'fa-hospital': faHospital,
      'fa-phone-volume': faPhoneVolume,
      'fa-medkit': faMedkit,
      'fa-route': faRoute
    };

    return iconMap[iconName] || faMapMarkerAlt;
  };

  if (loading) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <FontAwesomeIcon icon={faSpinner} spin className="text-amber-500 text-xl" />
        <p className="mt-2 text-gray-600">Ricerca luoghi interessanti vicino a {location.name}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorFeedback 
        error={error} 
        onRetry={fetchPOIs} 
        onDismiss={() => setError(null)}
        className={className}
      />
    );
  }

  if (pois.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <FontAwesomeIcon icon={faMapMarkerAlt} className="text-amber-500 text-xl mb-2" />
        <p className="text-gray-600">Nessun luogo interessante trovato vicino a {location.name}.</p>
      </div>
    );
  }

  return (
    <div className={`category-poi-recommendations ${className}`}>
      <h3 className="font-medium text-lg mb-3">Luoghi consigliati per categoria:</h3>
      
      {/* Categorie */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(category => {
          const categoryPOIs = getFilteredPOIs(category.id);
          if (categoryPOIs.length === 0) return null;
          
          return (
            <button
              key={category.id}
              className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${
                selectedCategory === category.id 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
              onClick={() => setSelectedCategory(
                selectedCategory === category.id ? null : category.id
              )}
            >
              <FontAwesomeIcon icon={category.icon} className="mr-2" />
              {category.name} ({categoryPOIs.length})
            </button>
          );
        })}
      </div>
      
      {/* Lista POI della categoria selezionata */}
      {selectedCategory && (
        <div className="space-y-2 mt-3">
          {getFilteredPOIs(selectedCategory).map(poi => (
            <div 
              key={poi.id} 
              className="flex items-center p-3 bg-white rounded-lg shadow-sm"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-full mr-3">
                <FontAwesomeIcon icon={getIcon(poi.icon)} className="text-amber-600" />
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
          
          {getFilteredPOIs(selectedCategory).length === 0 && (
            <p className="text-center text-gray-500 py-3">
              Nessun luogo trovato in questa categoria
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryPOIRecommendations;
