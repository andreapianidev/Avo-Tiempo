// Nessuna importazione necessaria

export type ThemeMode = 'light' | 'dark' | 'system';

// Storage key for theme preference
const THEME_STORAGE_KEY = 'avo_weather_theme';

/**
 * Get the user's preferred theme
 */
export const getThemePreference = (): ThemeMode => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      return storedTheme;
    }
    
    return 'light'; // Default value - cambiato da 'system' a 'light'
  } catch (error) {
    console.error('Error loading theme preference:', error);
    return 'light'; // Fallback to light theme - cambiato da 'system' a 'light'
  }
};

/**
 * Save user's theme preference
 */
export const saveThemePreference = (theme: ThemeMode): boolean => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch (error) {
    console.error('Error saving theme preference:', error);
    return false;
  }
};

/**
 * Check if the system prefers dark mode
 */
export const systemPrefersDarkMode = (): boolean => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Set dark mode class on the document
 */
export const applyTheme = (theme: ThemeMode): void => {
  try {
    const prefersDark = theme === 'system' ? systemPrefersDarkMode() : theme === 'dark';
    
    // Add or remove dark class from document
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Also update meta theme-color for browser UI
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', prefersDark ? '#1A1A1A' : '#FFF8F0');
    }
  } catch (error) {
    console.error('Error applying theme:', error);
  }
};

/**
 * Initialize theme based on user preference
 */
export const initializeTheme = (): void => {
  const theme = getThemePreference();
  applyTheme(theme);
  
  // Set up listener for system preference changes
  if (theme === 'system' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Add listener for preference changes
    const handleChange = (e: MediaQueryListEvent): void => {
      applyTheme('system');
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } 
    // Older implementations
    else if ('addListener' in mediaQuery) {
      // @ts-ignore - For older browsers
      mediaQuery.addListener(handleChange);
    }
  }
};

/**
 * Toggle between light and dark mode
 */
export const toggleDarkMode = (): ThemeMode => {
  const currentTheme = getThemePreference();
  let newTheme: ThemeMode = 'light';
  
  if (currentTheme === 'light') {
    newTheme = 'dark';
  } else if (currentTheme === 'dark') {
    newTheme = 'system';
  } else {
    newTheme = 'light';
  }
  
  saveThemePreference(newTheme);
  applyTheme(newTheme);
  
  return newTheme;
};
