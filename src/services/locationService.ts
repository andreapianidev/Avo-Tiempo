import { WeatherData } from './weatherService';

export interface LocationItem {
  id: string;
  name: string;
  temperature?: number;
  condition?: string;
  timestamp?: number;
}

// Storage keys
const LOCATIONS_STORAGE_KEY = 'avo_weather_locations';

/**
 * Get all saved locations from localStorage
 */
export const getSavedLocations = (): LocationItem[] => {
  try {
    const locationsJson = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!locationsJson) return [];
    return JSON.parse(locationsJson);
  } catch (error) {
    console.error('Error loading saved locations:', error);
    return [];
  }
};

/**
 * Save a new location
 */
export const saveLocation = (name: string): LocationItem | null => {
  try {
    const locations = getSavedLocations();
    
    // Check if location already exists
    if (locations.some(loc => loc.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Location already exists');
    }
    
    const newLocation: LocationItem = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now()
    };
    
    const updatedLocations = [...locations, newLocation];
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
    
    return newLocation;
  } catch (error) {
    console.error('Error saving location:', error);
    return null;
  }
};

/**
 * Remove a location
 */
export const removeLocation = (id: string): boolean => {
  try {
    const locations = getSavedLocations();
    const updatedLocations = locations.filter(location => location.id !== id);
    
    if (updatedLocations.length === locations.length) {
      // No location was removed
      return false;
    }
    
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
    return true;
  } catch (error) {
    console.error('Error removing location:', error);
    return false;
  }
};

/**
 * Update location weather data
 */
export const updateLocationWeather = (id: string, weatherData: Partial<WeatherData>): boolean => {
  try {
    const locations = getSavedLocations();
    const updatedLocations = locations.map(location => {
      if (location.id === id) {
        return {
          ...location,
          temperature: weatherData.temperature,
          condition: weatherData.condition,
          timestamp: Date.now()
        };
      }
      return location;
    });
    
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(updatedLocations));
    return true;
  } catch (error) {
    console.error('Error updating location weather:', error);
    return false;
  }
};

/**
 * Checks if weather data for a location is stale (older than 1 hour)
 */
export const isWeatherDataStale = (timestamp?: number): boolean => {
  if (!timestamp) return true;
  
  const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
  const now = Date.now();
  
  return (now - timestamp) > ONE_HOUR;
};
