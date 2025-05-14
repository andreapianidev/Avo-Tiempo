import * as React from 'react';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLanguage, faThermometer, faMoon, faSun, faComputerMouse, faBell, faBellSlash, faGlobe, faRotate } from '@fortawesome/free-solid-svg-icons';
import { getUserSettings, saveUserSettings } from '../services/settingsService';
import { requestNotificationPermission, getNotificationPermission, areNotificationsSupported } from '../services/notificationService';
import { getThemePreference, saveThemePreference, applyTheme, ThemeMode } from '../services/themeService';
import { createError, ErrorType, getUserFriendlyErrorMessage, AppError } from '../services/errorService';

const Settings: React.FC = () => {
  const [language, setLanguage] = useState<'es' | 'it'>('es');
  const [units, setUnits] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Initialize settings from storage
  useEffect(() => {
    const loadSettings = () => {
      try {
        // Load user settings
        const settings = getUserSettings();
        setLanguage(settings.language);
        setUnits(settings.units);
        
        // Load theme setting
        const themePref = getThemePreference();
        setTheme(themePref);
        
        // Check notification permission
        if (areNotificationsSupported()) {
          const permission = getNotificationPermission();
          setNotificationPermission(permission);
        }
      } catch (err: any) {
        console.error('Error loading settings:', err);
        setError(createError(
          ErrorType.STORAGE,
          'Error al cargar la configuración',
          err
        ));
      }
    };
    
    loadSettings();
  }, []);

  // Handler for language change
  const handleLanguageChange = (lang: 'es' | 'it') => {
    setLanguage(lang);
    saveUserSettings({ language: lang });
    
    // Show success message
    setSuccess(`Idioma cambiado a ${lang === 'es' ? 'Español' : 'Italiano'}`);
    setTimeout(() => setSuccess(null), 2000);
  };
  
  // Handler for units change
  const handleUnitsChange = (unitSystem: 'celsius' | 'fahrenheit') => {
    setUnits(unitSystem);
    saveUserSettings({ units: unitSystem });
    
    // Show success message
    setSuccess(`Unidades cambiadas a ${unitSystem === 'celsius' ? 'Celsius' : 'Fahrenheit'}`);
    setTimeout(() => setSuccess(null), 2000);
  };
  
  // Handler for theme change
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    saveThemePreference(newTheme);
    applyTheme(newTheme);
    
    // Show success message
    const themeNames = {
      'light': 'Claro',
      'dark': 'Oscuro',
      'system': 'Sistema'
    };
    setSuccess(`Tema cambiado a ${themeNames[newTheme]}`);
    setTimeout(() => setSuccess(null), 2000);
  };
  
  // Handler for notification permission request
  const handleNotificationRequest = async () => {
    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setSuccess('Notificaciones activadas correctamente');
      } else if (permission === 'denied') {
        setError(createError(
          ErrorType.VALIDATION,
          'Permisos de notificación denegados',
          null
        ));
      }
    } catch (err: any) {
      console.error('Error requesting notification permission:', err);
      setError(err.type ? err : createError(
        ErrorType.VALIDATION,
        'Error al solicitar permisos de notificación',
        err
      ));
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
    }
  };
  
  // Refresh settings
  const handleRefresh = () => {
    setIsRefreshing(true);
    try {
      // Load user settings
      const settings = getUserSettings();
      setLanguage(settings.language);
      setUnits(settings.units);
      
      // Load theme setting
      const themePref = getThemePreference();
      setTheme(themePref);
      
      // Check notification permission
      if (areNotificationsSupported()) {
        const permission = getNotificationPermission();
        setNotificationPermission(permission);
      }
      
      setSuccess('Configuración actualizada');
    } catch (err: any) {
      console.error('Error refreshing settings:', err);
      setError(createError(
        ErrorType.STORAGE,
        'Error al actualizar la configuración',
        err
      ));
    } finally {
      setIsRefreshing(false);
      setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 2000);
    }
  };

  return (
    <div className="p-4 pb-20 bg-[var(--color-bg-main)] text-[var(--color-text-primary)] min-h-screen" style={{ height: 'auto', overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`p-2 ${isRefreshing ? 'text-gray-400' : 'text-[var(--color-highlight)]'}`}
        >
          <FontAwesomeIcon icon={faRotate} className={`${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-red-800 dark:text-red-300 text-sm">
          {getUserFriendlyErrorMessage(error)}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4 text-green-800 dark:text-green-300 text-sm">
          {success}
        </div>
      )}
      
      <div className="space-y-4">
        <div className="bg-[var(--color-card-bg)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-full">
              <FontAwesomeIcon icon={faLanguage} className="text-[var(--color-highlight)]" />
            </div>
            <h2 className="font-medium">Idioma</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleLanguageChange('es')}
              className={`py-2 px-4 rounded-lg border ${
                language === 'es' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              Español
            </button>
            <button
              onClick={() => handleLanguageChange('it')}
              className={`py-2 px-4 rounded-lg border ${
                language === 'it' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              Italiano
            </button>
          </div>
        </div>
        
        <div className="bg-[var(--color-card-bg)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-full">
              <FontAwesomeIcon icon={faThermometer} className="text-[var(--color-highlight)]" />
            </div>
            <h2 className="font-medium">Unidades de temperatura</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleUnitsChange('celsius')}
              className={`py-2 px-4 rounded-lg border ${
                units === 'celsius' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              Celsius (°C)
            </button>
            <button
              onClick={() => handleUnitsChange('fahrenheit')}
              className={`py-2 px-4 rounded-lg border ${
                units === 'fahrenheit' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              Fahrenheit (°F)
            </button>
          </div>
        </div>
        
        <div className="bg-[var(--color-card-bg)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-full">
              <FontAwesomeIcon icon={faMoon} className="text-[var(--color-highlight)]" />
            </div>
            <h2 className="font-medium">Tema</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleThemeChange('light')}
              className={`py-2 px-3 rounded-lg border flex flex-col items-center gap-1 ${
                theme === 'light' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              <FontAwesomeIcon icon={faSun} className="text-lg" />
              <span className="text-xs">Claro</span>
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`py-2 px-3 rounded-lg border flex flex-col items-center gap-1 ${
                theme === 'dark' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              <FontAwesomeIcon icon={faMoon} className="text-lg" />
              <span className="text-xs">Oscuro</span>
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              className={`py-2 px-3 rounded-lg border flex flex-col items-center gap-1 ${
                theme === 'system' 
                  ? 'bg-[var(--color-highlight)] text-white border-[var(--color-highlight)]' 
                  : 'border-[var(--color-border)] text-[var(--color-text-primary)] dark:hover:bg-gray-800 hover:bg-gray-100'
              }`}
            >
              <FontAwesomeIcon icon={faComputerMouse} className="text-lg" />
              <span className="text-xs">Sistema</span>
            </button>
          </div>
        </div>
        
        <div className="bg-[var(--color-card-bg)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-full">
              <FontAwesomeIcon icon={areNotificationsSupported() ? faBell : faBellSlash} className="text-[var(--color-highlight)]" />
            </div>
            <h2 className="font-medium">Notificaciones</h2>
          </div>
          
          {areNotificationsSupported() ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Estado: <span className="font-medium">
                    {notificationPermission === 'granted' ? 'Activadas' : 
                     notificationPermission === 'denied' ? 'Bloqueadas' : 'No configuradas'}
                  </span>
                </p>
                
                {notificationPermission !== 'granted' && (
                  <button 
                    onClick={handleNotificationRequest}
                    disabled={isLoading}
                    className="py-1 px-3 rounded-lg text-sm bg-[var(--color-highlight)] text-white disabled:bg-gray-400"
                  >
                    {isLoading ? 'Solicitando...' : 'Activar'}
                  </button>
                )}
              </div>
              
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {notificationPermission === 'granted' 
                  ? 'Recibirás alertas sobre condiciones meteorológicas importantes.'
                  : notificationPermission === 'denied'
                  ? 'Has bloqueado las notificaciones. Puedes cambiar esto en la configuración de tu navegador.'
                  : 'Activa las notificaciones para recibir alertas sobre condiciones meteorológicas importantes.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Tu navegador no soporta notificaciones.
            </p>
          )}
        </div>
        
        <div className="bg-[var(--color-card-bg)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-full">
              <FontAwesomeIcon icon={faGlobe} className="text-[var(--color-highlight)]" />
            </div>
            <h2 className="font-medium">Acerca de AVO Weather</h2>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Versión 2.0.0<br />
            Desarrollado por Avo Agency<br />
            © 2025 Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
