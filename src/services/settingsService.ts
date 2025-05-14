import { createError, ErrorType, logError } from './errorService';

export interface UserSettings {
  language: 'es' | 'it';
  units: 'celsius' | 'fahrenheit';
  darkMode: boolean;
}

// Storage key
const SETTINGS_STORAGE_KEY = 'avo_weather_settings';

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  language: 'es',
  units: 'celsius',
  darkMode: false
};

/**
 * Get user settings from localStorage
 */
export const getUserSettings = (): UserSettings => {
  try {
    const settingsJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!settingsJson) return DEFAULT_SETTINGS;
    
    const savedSettings = JSON.parse(settingsJson);
    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings
    };
  } catch (error) {
    const appError = createError(
      ErrorType.STORAGE, 
      'Failed to load user settings', 
      error
    );
    logError(appError);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save user settings to localStorage
 */
export const saveUserSettings = (settings: Partial<UserSettings>): boolean => {
  try {
    const currentSettings = getUserSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };
    
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    const appError = createError(
      ErrorType.STORAGE, 
      'Failed to save user settings', 
      error
    );
    logError(appError);
    return false;
  }
};

/**
 * Convert temperature based on user's unit preference
 */
export const convertTemperature = (
  celsius: number, 
  targetUnit: 'celsius' | 'fahrenheit' = 'celsius'
): number => {
  if (targetUnit === 'celsius') {
    return celsius;
  }
  
  // Convert to Fahrenheit
  return Math.round((celsius * 9/5) + 32);
};

/**
 * Get temperature unit symbol based on settings
 */
export const getTemperatureUnit = (units: 'celsius' | 'fahrenheit'): string => {
  return units === 'celsius' ? '°C' : '°F';
};

/**
 * Convert wind speed based on user's unit preference
 * Input is in km/h
 */
export const formatWindSpeed = (
  windSpeed: number, 
  units: 'celsius' | 'fahrenheit'
): string => {
  // For Fahrenheit we'll use mph, for Celsius we'll use km/h
  if (units === 'fahrenheit') {
    // Convert km/h to mph
    const mph = Math.round(windSpeed * 0.621371);
    return `${mph} mph`;
  }
  
  return `${windSpeed} km/h`;
};
