import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faXmark, faMagnifyingGlass, faSun, faCloud, faCloudRain, 
  faSnowflake, faMountainSun, faCloudShowersHeavy, faSpinner, 
  faExclamationTriangle, faLocationDot, faMapMarkedAlt, faChevronDown, 
  faChevronUp, faHeart, faHistory, faGlobe, faCompass, faMapMarkerAlt,
  faShareAlt, faSortAmountDown, faSortAmountUp, faTrash, faUndo, faCog,
  faWifi, faRotate, faLightbulb, faUserGroup
} from '@fortawesome/free-solid-svg-icons';
import { getSavedLocations, saveLocation, removeLocation as removeLocationService, LocationItem, updateLocationWeather, isWeatherDataStale } from '../services/locationService';
import { fetchWeather } from '../services/weatherService';
import { getUserSettings, convertTemperature, getTemperatureUnit } from '../services/settingsService';
import { createError, ErrorType, AppError, ErrorSeverity, getUserFriendlyErrorMessage } from '../services/errorService';
import LocationPOIRecommendations from '../components/LocationPOIRecommendations';
import CategoryPOIRecommendations from '../components/CategoryPOIRecommendations';
import ErrorFeedback from '../components/ErrorFeedback';
import { CacheNamespace } from '../services/cacheService';
import connectivityService from '../services/connectivityService';

// Importiamo i nuovi componenti
import AILocationSuggestions from '../components/AILocationSuggestions';
import AIWeatherTrends from '../components/AIWeatherTrends';
import LocationSharing from '../components/LocationSharing';
import LocationGroups from '../components/LocationGroups';

// Location interface is imported from locationService

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{[key: string]: boolean}>({});
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  
  // Estado para nuevas funcionalidades
  const [favoriteLocations, setFavoriteLocations] = useState<string[]>([]);
  const [recentlyRemovedLocations, setRecentlyRemovedLocations] = useState<LocationItem[]>([]);
  const [sortOrder, setSortOrder] = useState<'name' | 'recent' | 'temperature'>('recent');
  const [isOffline, setIsOffline] = useState(false);
  const [showRecentlyRemoved, setShowRecentlyRemoved] = useState(false);
  const [forceRefreshPOI, setForceRefreshPOI] = useState<boolean>(false);
  
  // Estados para las nuevas características
  const [showAIsuggestions, setShowAIsuggestions] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [locationToShare, setLocationToShare] = useState<LocationItem | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>(['playa', 'montañas', 'gastronomía']);
  const [weatherPreference, setWeatherPreference] = useState<'sunny' | 'mild' | 'cool' | 'any'>('sunny');
  const [poiSearchRadius, setPoiSearchRadius] = useState<number>(10000); // Raggio di ricerca POI in metri

  // Get user settings for temperature units
  const { units } = getUserSettings();

  // Recuperar favoritos del almacenamiento local
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('avo_favorite_locations');
      if (storedFavorites) {
        setFavoriteLocations(JSON.parse(storedFavorites));
      }
      
      const storedRecentlyRemoved = localStorage.getItem('avo_recently_removed_locations');
      if (storedRecentlyRemoved) {
        setRecentlyRemovedLocations(JSON.parse(storedRecentlyRemoved));
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  }, []);
  
  // Monitorear el estado de conexión
  useEffect(() => {
    const unsubscribe = connectivityService.listenToConnectivityChanges((online) => {
      setIsOffline(!online);
    });
    
    return () => unsubscribe();
  }, []);

  // Memoize loadLocations con useCallback para evitar recreación
  const memoizedLoadLocations = useCallback(() => {
    loadLocations();
  }, []);
  
  useEffect(() => {
    memoizedLoadLocations();
  }, [memoizedLoadLocations]);
  
  const loadLocations = () => {
    setIsLoading(true);
    try {
      // Load from localStorage through our service
      const savedLocations = getSavedLocations();
      setLocations(savedLocations);
      
      // Update weather for each location if needed
      if (!isOffline) {
        savedLocations.forEach(location => {
          if (isWeatherDataStale(location.timestamp)) {
            fetchLocationWeather(location.id, location.name);
          }
        });
      }
    } catch (error) {
      setError(createError(
        ErrorType.STORAGE, 
        'Error al cargar ubicaciones guardadas', 
        error,
        'No se pudieron recuperar las ubicaciones guardadas',
        ErrorSeverity.MEDIUM,
        'STORAGE_ERR_01'
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocationWeather = async (locationId: string, locationName: string) => {
    // Set this location as updating
    setUpdateStatus(prev => ({ ...prev, [locationId]: true }));
    
    try {
      const weatherData = await fetchWeather(locationName);
      
      if (!weatherData) {
        throw new Error('No se pudieron obtener datos del clima');
      }
      
      // Update location with new weather data
      updateLocationWeather(locationId, {
        temperature: weatherData.temperature,
        condition: weatherData.condition
      });
      
      // Update local state
      setLocations(prevLocations => 
        prevLocations.map(loc => 
          loc.id === locationId 
            ? { 
                ...loc, 
                temperature: weatherData.temperature, 
                condition: weatherData.condition, 
                timestamp: Date.now() 
              } 
            : loc
        )
      );
    } catch (error) {
      console.error(`Error updating weather for ${locationName}:`, error);
      // We won't show an error UI for individual weather updates
      // Just silently fail and keep the old data
    } finally {
      // Mark this location as done updating
      setUpdateStatus(prev => ({ ...prev, [locationId]: false }));
    }
  };

  const getWeatherIcon = (condition: string | undefined) => {
    switch (condition?.toLowerCase() || 'unknown') {
      case 'sunny':
      case 'clear':
        return <FontAwesomeIcon icon={faSun} className="text-2xl text-yellow-500" />;
      case 'cloudy':
        return <FontAwesomeIcon icon={faCloud} className="text-2xl text-gray-500" />;
      case 'partly cloudy':
        return <FontAwesomeIcon icon={faCloud} className="text-2xl text-amber-400" />;
      case 'rain':
      case 'rainy':
        return <FontAwesomeIcon icon={faCloudRain} className="text-2xl text-blue-500" />;
      case 'thunderstorm':
        return <FontAwesomeIcon icon={faCloudShowersHeavy} className="text-2xl text-indigo-600" />;
      case 'snow':
        return <FontAwesomeIcon icon={faSnowflake} className="text-2xl text-sky-300" />;
      case 'mist':
      case 'fog':
        return <FontAwesomeIcon icon={faMountainSun} className="text-2xl text-gray-400" />;
      default:
        return <FontAwesomeIcon icon={faSun} className="text-2xl text-yellow-500" />;
    }
  };

  const addLocation = async () => {
    if (newLocation.trim() === '') return;
    
    setIsAdding(true);
    setError(null);
    
    try {
      // First fetch weather data to get coordinates
      const weatherData = await fetchWeather(newLocation);
      
      if (!weatherData) {
        throw new Error('No se pudieron obtener datos del clima');
      }
      
      // Save location to localStorage with coordinates
      const savedLocation = saveLocation(
        newLocation, 
        weatherData.lat, 
        weatherData.lon
      );
      
      if (!savedLocation) {
        throw new Error('Error al guardar la ubicación');
      }
      
      // Update location with weather data
      updateLocationWeather(savedLocation.id, {
        temperature: weatherData.temperature,
        condition: weatherData.condition
      });
      
      // Update local state
      setLocations(prevLocations => [
        ...prevLocations, 
        { 
          ...savedLocation, 
          temperature: weatherData.temperature, 
          condition: weatherData.condition,
          lat: weatherData.lat,
          lon: weatherData.lon
        }
      ]);
      
      // Clear input
      setNewLocation('');
    } catch (error: any) {
      // Handle specific error for duplicate location
      if (error.message === 'Location already exists') {
        setError(createError(
          ErrorType.VALIDATION, 
          'Esta ubicación ya existe', 
          error,
          'Por favor, elige un nombre diferente'
        ));
      } else {
        setError(createError(
          ErrorType.UNKNOWN, 
          'Error al añadir ubicación', 
          error
        ));
      }
    } finally {
      setIsAdding(false);
    }
  };

  const restoreLocation = (location: LocationItem) => {
    try {
      // First add to localStorage
      const newLocationItem = saveLocation(location.name, location.lat, location.lon);
      
      if (!newLocationItem) {
        throw createError(ErrorType.VALIDATION, 'La ubicación ya existe');
      }
      
      // Add to state with the same weather data
      setLocations(prev => [...prev, {
        ...newLocationItem,
        temperature: location.temperature,
        condition: location.condition,
        lat: location.lat,
        lon: location.lon
      }]);
      
      // Remove from recently removed list
      const updatedRecentlyRemoved = recentlyRemovedLocations.filter(
        item => item.id !== location.id
      );
      setRecentlyRemovedLocations(updatedRecentlyRemoved);
      localStorage.setItem('avo_recently_removed_locations', JSON.stringify(updatedRecentlyRemoved));
      
      // Show success message
      setError(createError(
        ErrorType.VALIDATION,
        'Ubicación restaurada correctamente',
        null,
        '',
        ErrorSeverity.LOW
      ));
      
      // Auto-dismiss the success message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      if (err.type) {
        setError(err);
      } else {
        setError(createError(
          ErrorType.STORAGE,
          'Error al restaurar la ubicación',
          err,
          'No se pudo restaurar la ubicación eliminada',
          ErrorSeverity.MEDIUM
        ));
      }
    }
  };

  const clearAllRecentlyRemoved = () => {
    setRecentlyRemovedLocations([]);
    localStorage.removeItem('avo_recently_removed_locations');
  };

  // Sort locations based on current sort order
  const sortLocations = (locs: LocationItem[]) => {
    const locsCopy = [...locs];
    
    switch (sortOrder) {
      case 'name':
        return locsCopy.sort((a, b) => a.name.localeCompare(b.name));
      case 'temperature':
        return locsCopy.sort((a, b) => {
          // Sort by temperature, with undefined temperatures at the end
          if (a.temperature === undefined) return 1;
          if (b.temperature === undefined) return -1;
          return b.temperature - a.temperature;
        });
      case 'recent':
      default:
        // Locations are already sorted by recency based on their IDs (timestamps)
        return locsCopy;
    }
  };

  // First filter, then sort, then put favorites at the top
  const filteredLocations = React.useMemo(() => {
    // Filter by search term
    const filtered = locations.filter(location => 
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort according to sortOrder
    const sorted = sortLocations(filtered);
    
    // Put favorites at the top
    if (favoriteLocations.length > 0) {
      return sorted.sort((a, b) => {
        const aIsFavorite = favoriteLocations.includes(a.id);
        const bIsFavorite = favoriteLocations.includes(b.id);
        
        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;
        return 0;
      });
    }
    
    return sorted;
  }, [locations, searchTerm, sortOrder, favoriteLocations]);

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('avo_favorite_locations');
      if (storedFavorites) {
        setFavoriteLocations(JSON.parse(storedFavorites));
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const storedRecentlyRemoved = localStorage.getItem('avo_recently_removed_locations');
      if (storedRecentlyRemoved) {
        setRecentlyRemovedLocations(JSON.parse(storedRecentlyRemoved));
      }
    } catch (e) {
      console.error('Error loading recently removed:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const storedInterests = localStorage.getItem('avo_user_interests');
      if (storedInterests) {
        setUserInterests(JSON.parse(storedInterests));
      }
      
      const storedWeatherPref = localStorage.getItem('avo_weather_preference');
      if (storedWeatherPref) {
        setWeatherPreference(storedWeatherPref as 'sunny' | 'mild' | 'cool' | 'any');
      }
    } catch (e) {
      console.error('Error loading user preferences:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('avo_favorite_locations', JSON.stringify(favoriteLocations));
    } catch (e) {
      console.error('Error saving favorites:', e);
    }
  }, [favoriteLocations]);

  useEffect(() => {
    try {
      localStorage.setItem('avo_recently_removed_locations', JSON.stringify(recentlyRemovedLocations));
    } catch (e) {
      console.error('Error saving recently removed:', e);
    }
  }, [recentlyRemovedLocations]);

  useEffect(() => {
    try {
      localStorage.setItem('avo_user_interests', JSON.stringify(userInterests));
      localStorage.setItem('avo_weather_preference', weatherPreference);
    } catch (e) {
      console.error('Error saving user preferences:', e);
    }
  }, [userInterests, weatherPreference]);

  // Show loading state
  if (isLoading && locations.length === 0) {
    return (
      <div className="p-4 pb-20 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-md mb-4"></div>
        <div className="h-10 w-full bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-10 w-full bg-gray-200 rounded-lg mb-4"></div>
        
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-16 bg-gray-200 rounded-lg mb-3"></div>
        ))}
      </div>
    );
  }

  const toggleFavorite = (id: string) => {
    try {
      const newFavorites = favoriteLocations.includes(id)
        ? favoriteLocations.filter(fav => fav !== id)
        : [...favoriteLocations, id];
      
      setFavoriteLocations(newFavorites);
      localStorage.setItem('avo_favorite_locations', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const removeLocation = (id: string) => {
    try {
      // Guardar la ubicación que se va a eliminar para poder recuperarla
      const locationToRemove = locations.find(loc => loc.id === id);
      if (locationToRemove) {
        const updatedRecentlyRemoved = [
          locationToRemove,
          ...recentlyRemovedLocations.slice(0, 4) // Mantener solo las 5 últimas eliminadas
        ];
        setRecentlyRemovedLocations(updatedRecentlyRemoved);
        localStorage.setItem('avo_recently_removed_locations', JSON.stringify(updatedRecentlyRemoved));
      }
      
      // Eliminar de favoritos si estaba
      if (favoriteLocations.includes(id)) {
        toggleFavorite(id);
      }
      
      const success = removeLocationService(id);
      
      if (!success) {
        throw new Error('Failed to remove location');
      }
      
      // Update state
      setLocations(prevLocations => prevLocations.filter(loc => loc.id !== id));
    } catch (error) {
      setError(createError(
        ErrorType.STORAGE, 
        'Error al eliminar la ubicación', 
        error,
        'No se pudo eliminar la ubicación seleccionada',
        ErrorSeverity.MEDIUM,
        'STORAGE_ERR_02'
      ));
    }
  };

  return (
    <div className="locations-page h-full w-full overflow-y-auto p-4 pb-24 bg-amber-50" style={{WebkitOverflowScrolling: 'touch'}}>
      {/* Modal para compartir ubicación */}
      {locationToShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <LocationSharing 
              location={locationToShare}
              onClose={() => setLocationToShare(null)}
            />
          </div>
        </div>
      )}
      
      <h1 className="text-2xl font-semibold mb-4">Mis Ubicaciones</h1>
      
      {/* Error feedback con nuestro componente mejorado */}
      {error && (
        <ErrorFeedback
          error={error}
          onRetry={memoizedLoadLocations}
          className="mb-4"
        />
      )}
      
      {/* Barra de herramientas con opciones avanzadas */}
      <div className="bg-white p-3 rounded-lg shadow-sm mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded-lg ${showAIsuggestions ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'} transition-colors`}
            onClick={() => setShowAIsuggestions(!showAIsuggestions)}
            title="Sugerencias AI"
          >
            <FontAwesomeIcon icon={faLightbulb} />
            <span className="ml-2 hidden sm:inline">Sugerencias AI</span>
          </button>
          
          <button
            className={`p-2 rounded-lg ${showGroups ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-800'} transition-colors`}
            onClick={() => setShowGroups(!showGroups)}
            title="Grupos"
          >
            <FontAwesomeIcon icon={faUserGroup} />
            <span className="ml-2 hidden sm:inline">Grupos</span>
          </button>
          
          <button
            className={`p-2 rounded-lg ${showRecentlyRemoved ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-800'} transition-colors`}
            onClick={() => setShowRecentlyRemoved(!showRecentlyRemoved)}
            title="Papelera"
          >
            <FontAwesomeIcon icon={faHistory} />
            <span className="ml-2 hidden sm:inline">Papelera</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
            onClick={() => {
              setSortOrder(prev => {
                if (prev === 'name') return 'recent';
                if (prev === 'recent') return 'temperature';
                return 'name';
              });
              // Re-sort locations
              setLocations(prev => [...sortLocations(prev)]);
            }}
            title={sortOrder === 'name' ? "Ordenar por fecha" : sortOrder === 'recent' ? "Ordenar por temperatura" : "Ordenar alfabéticamente"}
          >
            <FontAwesomeIcon icon={sortOrder === 'name' ? faSortAmountDown : faSortAmountUp} />
            <span className="ml-2 hidden sm:inline">
              {sortOrder === 'name' ? "Nombre" : sortOrder === 'recent' ? "Reciente" : "Temperatura"}
            </span>
          </button>
          
          <button 
            onClick={() => setSortOrder('temperature')} 
            className={`px-2 py-1 text-xs rounded-md flex items-center ${sortOrder === 'temperature' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faSun} className="mr-1" />
            Temperatura
          </button>
        </div>
      </div>
      
      {/* Panel de ubicaciones eliminadas recientemente */}
      {recentlyRemovedLocations.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div 
            className="flex justify-between items-center p-2 bg-gray-100 cursor-pointer"
            onClick={() => setShowRecentlyRemoved(!showRecentlyRemoved)}
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faTrash} className="text-gray-500 mr-2" />
              <span className="text-sm font-medium">Ubicaciones eliminadas recientemente</span>
            </div>
            <FontAwesomeIcon 
              icon={showRecentlyRemoved ? faChevronUp : faChevronDown} 
              className="text-gray-500" 
            />
          </div>
          
          {showRecentlyRemoved && (
            <div className="p-2 space-y-2 bg-gray-50">
              {recentlyRemovedLocations.map(location => (
                <div key={location.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                  <div className="flex-1">
                    <p className="font-medium">{location.name}</p>
                    {location.temperature !== undefined && (
                      <p className="text-xs text-gray-500">
                        {convertTemperature(location.temperature, 'celsius')}{getTemperatureUnit('celsius')}, 
                        {location.condition || 'Sin datos'}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => restoreLocation(location)}
                    className="p-1 text-amber-500 hover:text-amber-600 transition-colors"
                    title="Restaurar ubicación"
                  >
                    <FontAwesomeIcon icon={faUndo} />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={clearAllRecentlyRemoved}
                className="w-full text-center text-xs text-red-500 hover:text-red-600 py-1"
              >
                Limpiar historial
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {filteredLocations.length > 0 ? (
          filteredLocations.map(location => (
            <div 
              key={location.id}
              className={`bg-white rounded-lg p-3 shadow-sm flex flex-col ${favoriteLocations.includes(location.id) ? 'border-l-4 border-amber-400' : ''}`}
            >
              {/* Header with weather info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {updateStatus[location.id] ? (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <FontAwesomeIcon icon={faSpinner} className="text-2xl text-amber-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full">
                      {getWeatherIcon(location.condition)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium">{location.name}</p>
                      {favoriteLocations.includes(location.id) && (
                        <FontAwesomeIcon icon={faHeart} className="text-amber-500 ml-1 text-xs" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {location.condition || 'Cargando...'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {location.temperature !== undefined ? (
                    <span className="text-lg font-semibold">
                      {convertTemperature(location.temperature, 'celsius')}{getTemperatureUnit('celsius')}
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-gray-400">--{getTemperatureUnit('celsius')}</span>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleFavorite(location.id)}
                    className={`p-1 rounded-full ${favoriteLocations.includes(location.id) ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                    title={favoriteLocations.includes(location.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <FontAwesomeIcon icon={faHeart} />
                  </button>
                  
                  <button
                    onClick={() => {
                      // Compartir la ubicación - usando API Web Share si está disponible
                      if (navigator.share) {
                        navigator.share({
                          title: `Clima en ${location.name}`,
                          text: `¡Echa un vistazo al clima en ${location.name}! ${location.temperature ? `Temperatura: ${convertTemperature(location.temperature, 'celsius')}${getTemperatureUnit('celsius')}` : ''} ${location.condition || ''}`
                        }).catch(err => console.log('Error al compartir:', err));
                      } else {
                        // Fallback para navegadores que no soporten Web Share API
                        const shareText = `¡Echa un vistazo al clima en ${location.name}! ${location.temperature ? `Temperatura: ${convertTemperature(location.temperature, 'celsius')}${getTemperatureUnit('celsius')}` : ''} ${location.condition || ''}`;
                        navigator.clipboard.writeText(shareText)
                          .then(() => {
                            setError(createError(
                              ErrorType.VALIDATION,
                              'Texto copiado al portapapeles',
                              null,
                              '',
                              ErrorSeverity.LOW
                            ));
                            setTimeout(() => setError(null), 2000);
                          })
                          .catch(err => console.error('Error al copiar:', err));
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500 rounded-full"
                    title="Compartir"
                  >
                    <FontAwesomeIcon icon={faShareAlt} />
                  </button>
                  
                  {!isOffline && (
                    <button
                      onClick={() => {
                        fetchLocationWeather(location.id, location.name);
                      }}
                      className="p-1 text-gray-400 hover:text-green-500 rounded-full"
                      title="Actualizar datos"
                      disabled={updateStatus[location.id]}
                    >
                      <FontAwesomeIcon icon={faRotate} className={updateStatus[location.id] ? 'animate-spin text-green-500' : ''} />
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setExpandedLocation(expandedLocation === location.id ? null : location.id)}
                    className={`p-1 rounded-full ${expandedLocation === location.id ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'}`}
                    title="Ver lugares cercanos"
                  >
                    <FontAwesomeIcon icon={faMapMarkedAlt} />
                  </button>
                  
                  <button 
                    onClick={() => removeLocation(location.id)}
                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                    disabled={updateStatus[location.id]}
                    title="Eliminar ubicación"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              </div>
              
              {/* POI Recommendations */}
              {expandedLocation === location.id && location.lat && location.lon && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="mb-4">
                    <LocationPOIRecommendations location={location} />
                  </div>
                  
                  {/* Aggiungiamo l'analisi AI del meteo */}
                  <div className="mb-4">
                    <AIWeatherTrends location={location} days={3} />
                  </div>
                  
                  {/* Opzioni di condivisione */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setLocationToShare(location)}
                      className="flex items-center py-2 px-3 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      <FontAwesomeIcon icon={faShareAlt} className="mr-2" />
                      Compartir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 bg-white rounded-lg shadow-sm">
            {searchTerm ? (
              <>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-amber-400 mb-3" />
                <p className="text-gray-500 mb-1">No se encontraron ubicaciones con "{searchTerm}"</p>
                <p className="text-sm text-gray-400">Intenta con otro término de búsqueda</p>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faLocationDot} className="text-5xl text-amber-500 mb-4" />
                <p className="text-gray-700 font-medium mb-1">No hay ubicaciones guardadas.</p>
                <p className="text-gray-500 mb-4">Añade tu primera ubicación para comenzar.</p>
                
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    onClick={() => {
                      // Añadir ubicación predeterminada - Santa Cruz de Tenerife
                      setNewLocation('Santa Cruz de Tenerife');
                      addLocation();
                    }}
                    className="flex items-center justify-center py-2 px-4 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    Añadir Santa Cruz de Tenerife
                  </button>
                  
                  <button
                    onClick={() => {
                      // Añadir ubicación predeterminada - Las Palmas
                      setNewLocation('Las Palmas de Gran Canaria');
                      addLocation();
                    }}
                    className="flex items-center justify-center py-2 px-4 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                    Añadir Las Palmas
                  </button>
                </div>
                
                {/* Aggiungiamo i POI consigliati per categoria */}
                <div className="mt-8 w-full max-w-md">
                  <h2 className="text-xl font-bold text-center mb-4">Luoghi consigliati nelle Canarie</h2>
                  
                  {/* Controllo per il raggio di ricerca e aggiornamento */}
                  <div className="mb-4 flex items-center justify-center gap-3">
                    {/* Selettore del raggio */}
                    <div className="flex items-center space-x-2 py-2 px-3 bg-amber-50 rounded-lg">
                      <label htmlFor="poi-radius-selector" className="text-sm text-gray-700">Raggio:</label>
                      <select 
                        id="poi-radius-selector"
                        value={poiSearchRadius}
                        onChange={(e) => {
                          setPoiSearchRadius(Number(e.target.value));
                          setIsLoading(true);
                          // Forza l'aggiornamento dei POI con il nuovo raggio
                          setTimeout(() => setIsLoading(false), 1000);
                        }}
                        className="py-1 px-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="5000">5 km</option>
                        <option value="10000">10 km</option>
                        <option value="15000">15 km</option>
                        <option value="20000">20 km</option>
                        <option value="30000">30 km</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={() => {
                        // Forza l'aggiornamento reale dei POI con refresh=true
                        setIsLoading(true);
                        setForceRefreshPOI(true);
                        // Reset dopo un breve ritardo
                        setTimeout(() => {
                          setForceRefreshPOI(false);
                          setIsLoading(false);
                        }, 2000);
                      }}
                      className="flex items-center justify-center py-2 px-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <FontAwesomeIcon icon={faRotate} className="mr-2" />
                      Aggiorna POI
                    </button>
                  </div>
                  
                  <CategoryPOIRecommendations 
                    location={{
                      id: 'default',
                      name: 'Santa Cruz de Tenerife',
                      lat: 28.4636,
                      lon: -16.2518,
                      temperature: 22,
                      condition: 'Soleggiato'
                    }}
                    searchRadius={poiSearchRadius}
                    forceRefresh={forceRefreshPOI}
                    onRadiusChange={(radius) => {
                      setPoiSearchRadius(radius);
                      setIsLoading(true);
                      // Forza l'aggiornamento dei POI con il nuovo raggio
                      setForceRefreshPOI(true);
                      setTimeout(() => {
                        setForceRefreshPOI(false);
                        setIsLoading(false);
                      }, 2000);
                    }}
                  />
                </div>
                
                {/* Aggiungiamo una sezione per cercare altre località */}
                <div className="mt-8 w-full max-w-md">
                  <h2 className="text-xl font-bold text-center mb-4">Cerca altre località</h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nome della località..."
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full py-2 px-4 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <button
                      onClick={addLocation}
                      disabled={!newLocation.trim() || isAdding}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-500 hover:text-amber-600 disabled:text-gray-300"
                    >
                      {isAdding ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                      ) : (
                        <FontAwesomeIcon icon={faPlus} />
                      )}
                    </button>
                  </div>
                  
                  {/* Suggerimenti di località popolari */}
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Località popolari:</h3>
                    <div className="flex flex-wrap gap-2">
                      {['Puerto de la Cruz', 'Adeje', 'La Laguna', 'Maspalomas', 'Arona', 'Playa de las Américas'].map(loc => (
                        <button
                          key={loc}
                          onClick={() => {
                            setNewLocation(loc);
                            setTimeout(() => addLocation(), 100);
                          }}
                          className="py-1 px-3 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Estado de carga y mensajes de estado cuando no hay resultados filtrados pero existen ubicaciones */}
      {!isLoading && filteredLocations.length === 0 && locations.length > 0 && (
        <div className="text-center py-8 px-4 bg-white rounded-lg shadow-sm">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-amber-400 mb-2" />
          <p className="text-gray-500">No se encontraron ubicaciones con "{searchTerm}"</p>
          <p className="text-sm text-gray-400 mt-2">Intenta con otro término de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default Locations;
