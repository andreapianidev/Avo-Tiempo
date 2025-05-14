import * as React from 'react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark, faMagnifyingGlass, faSun, faCloud, faCloudRain, faSnowflake, faMountainSun, faCloudShowersHeavy, faSpinner, faExclamationTriangle, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { getSavedLocations, saveLocation, removeLocation as removeLocationService, LocationItem, updateLocationWeather, isWeatherDataStale } from '../services/locationService';
import { fetchWeather } from '../services/weatherService';
import { getUserSettings, convertTemperature, getTemperatureUnit } from '../services/settingsService';
import { createError, ErrorType, AppError, getUserFriendlyErrorMessage } from '../services/errorService';

// Location interface is imported from locationService

const Locations: React.FC = () => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{[key: string]: boolean}>({});

  // Get user settings for temperature units
  const { units } = getUserSettings();

  // Utilizziamo useCallback per evitare ricreazione della funzione ad ogni render
  const memoizedLoadLocations = React.useCallback(() => {
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
      savedLocations.forEach(location => {
        if (isWeatherDataStale(location.timestamp)) {
          fetchLocationWeather(location.id, location.name);
        }
      });
    } catch (error) {
      setError(createError(
        ErrorType.STORAGE, 
        'Error al cargar ubicaciones guardadas', 
        error
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
      // First add to localStorage
      const newLocationItem = saveLocation(newLocation.trim());
      
      if (!newLocationItem) {
        throw createError(ErrorType.VALIDATION, 'La ubicación ya existe');
      }
      
      // Add to state with loading indicators
      setLocations(prev => [...prev, newLocationItem]);
      setNewLocation('');
      
      // Then fetch weather data for this location
      await fetchLocationWeather(newLocationItem.id, newLocationItem.name);
    } catch (err: any) {
      if (err.type) {
        setError(err);
      } else {
        setError(createError(
          ErrorType.LOCATION, 
          'Error al añadir la nueva ubicación', 
          err
        ));
      }
    } finally {
      setIsAdding(false);
    }
  };

  const removeLocation = (id: string) => {
    try {
      // Remove from localStorage
      const success = removeLocationService(id);
      
      if (!success) {
        throw new Error('Failed to remove location');
      }
      
      // Update state
      setLocations(prev => prev.filter(location => location.id !== id));
    } catch (error) {
      setError(createError(
        ErrorType.STORAGE, 
        'Error al eliminar la ubicación', 
        error
      ));
    }
  };

  // Filter locations based on search term
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="p-4 pb-20 min-h-screen" style={{ height: 'auto', overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <h1 className="text-2xl font-semibold mb-4">Mis Ubicaciones</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-800 text-sm">
          {getUserFriendlyErrorMessage(error)}
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            disabled={isAdding}
            placeholder="Añadir nueva ubicación..."
            className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-gray-100"
          />
          <button 
            onClick={addLocation}
            disabled={isAdding || newLocation.trim() === ''}
            className={`p-2 rounded-r-lg ${isAdding ? 'bg-gray-400' : 'bg-amber-500'} text-white`}
          >
            {isAdding ? (
              <FontAwesomeIcon icon={faSpinner} className="text-xl animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPlus} className="text-xl" />
            )}
          </button>
        </div>
      </div>
      
      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar ubicación..."
          className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-2.5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {filteredLocations.map(location => (
          <div 
            key={location.id}
            className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {updateStatus[location.id] ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <FontAwesomeIcon icon={faSpinner} className="text-2xl text-amber-500 animate-spin" />
                </div>
              ) : (
                getWeatherIcon(location.condition)
              )}
              <div>
                <p className="font-medium">{location.name}</p>
                <p className="text-sm text-gray-500">
                  {location.condition || 'Cargando...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {location.temperature !== undefined ? (
                <span className="font-semibold">
                  {convertTemperature(location.temperature, units)}{getTemperatureUnit(units)}
                </span>
              ) : (
                <span className="font-semibold text-gray-400">--{getTemperatureUnit(units)}</span>
              )}
              <button 
                onClick={() => removeLocation(location.id)}
                className="text-gray-400 hover:text-red-500"
                disabled={updateStatus[location.id]}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>
        ))}
        
        {!isLoading && filteredLocations.length === 0 && (
          <div className="text-center py-8 px-4">
            {searchTerm ? (
              <>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-amber-400 mb-2" />
                <p className="text-gray-500">No se encontraron ubicaciones con "{searchTerm}"</p>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faLocationDot} className="text-3xl text-amber-500 mb-2" />
                <p className="text-gray-500">No hay ubicaciones guardadas.</p>
                <p className="text-gray-500">Añade tu primera ubicación para comenzar.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Locations;
