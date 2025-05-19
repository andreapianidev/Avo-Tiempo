import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, faSync, faSignal, faDatabase, faBell, 
  faLocationArrow, faHistory, faCheck, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { toggleNotificationPreference, getNotificationPreferences } from '../services/appStateService';
import { clearCacheByNamespace, CacheNamespace } from '../services/cacheService';

const SettingsPage: React.FC = () => {
  const [offlineEnabled, setOfflineEnabled] = useState<boolean>(true);
  const [clearingCache, setClearingCache] = useState<boolean>(false);

  // Carica impostazioni all'avvio
  useEffect(() => {
    const loadSettings = async () => {      
      // Carica impostazioni notifiche
      const notifPrefs = getNotificationPreferences();
      setOfflineEnabled(notifPrefs.offlineMode);
    };
    
    loadSettings();
  }, []);

  // Gestisci pulizia cache
  const handleClearCache = async (namespace: CacheNamespace) => {
    setClearingCache(true);
    try {
      await clearCacheByNamespace(namespace);
      alert(`Cache ${namespace} svuotata con successo`);
    } catch (error) {
      console.error(`Errore nella pulizia della cache ${namespace}:`, error);
    } finally {
      setClearingCache(false);
    }
  };

  // Cambia preferenza notifiche offline
  const handleToggleOfflineMode = () => {
    toggleNotificationPreference('offlineMode');
    setOfflineEnabled(!offlineEnabled);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <FontAwesomeIcon icon={faCog} className="mr-2 text-[var(--color-highlight)]" />
        Impostazioni
      </h1>
      
      {/* Gestione cronologia meteo */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-medium text-lg mb-4 flex items-center">
          <FontAwesomeIcon icon={faHistory} className="mr-2 text-[var(--color-highlight)]" />
          Cronologia meteo
        </h2>
        
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          La cronologia meteo ti permette di confrontare le condizioni attuali con quelle passate.
          Puoi salvare fino a 50 istantanee meteo.
        </p>
        
        <button
          className="w-full py-2 px-4 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center justify-center"
          onClick={() => handleClearCache(CacheNamespace.WEATHER_DATA)}
          disabled={clearingCache}
        >
          {clearingCache ? (
            <>
              <FontAwesomeIcon icon={faSync} spin className="mr-2" />
              Eliminazione in corso...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              Elimina cronologia
            </>
          )}
        </button>
      </div>
      
      {/* Modalità offline */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-medium text-lg mb-4 flex items-center">
          <FontAwesomeIcon icon={faSignal} className="mr-2 text-[var(--color-highlight)]" />
          Modalità offline
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[var(--color-text-primary)]">
              Attiva notifiche modalità offline
            </label>
            <div
              className={`relative w-12 h-6 rounded-full cursor-pointer transition-all ${offlineEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={handleToggleOfflineMode}
            >
              <span 
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all ${offlineEnabled ? 'transform translate-x-6' : ''}`}
              />
            </div>
          </div>
          
          <p className="text-sm text-[var(--color-text-secondary)]">
            Quando sei offline, l'app utilizzerà i dati memorizzati nella cache.
            Riceverai una notifica quando passi dalla modalità online a quella offline e viceversa.
          </p>
        </div>
      </div>
      
      {/* Gestione cache */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium text-lg mb-4 flex items-center">
          <FontAwesomeIcon icon={faDatabase} className="mr-2 text-[var(--color-highlight)]" />
          Gestione cache
        </h2>
        
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          La cache permette all'app di funzionare offline e di caricarsi più velocemente.
          Puoi svuotare la cache se l'app occupa troppo spazio o se riscontri problemi.
        </p>
        
        <div className="space-y-2">
          <button
            className="w-full py-2 px-4 bg-[var(--color-bg-main)] border border-[var(--color-border)] rounded hover:bg-gray-100 flex items-center justify-center"
            onClick={() => handleClearCache(CacheNamespace.WEATHER)}
            disabled={clearingCache}
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Svuota cache meteo
          </button>
          
          <button
            className="w-full py-2 px-4 bg-[var(--color-bg-main)] border border-[var(--color-border)] rounded hover:bg-gray-100 flex items-center justify-center"
            onClick={() => handleClearCache(CacheNamespace.POI)}
            disabled={clearingCache}
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Svuota cache POI
          </button>
          
          <button
            className="w-full py-2 px-4 bg-[var(--color-bg-main)] border border-[var(--color-border)] rounded hover:bg-gray-100 flex items-center justify-center"
            onClick={() => handleClearCache(CacheNamespace.AI_INSIGHTS)}
            disabled={clearingCache}
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Svuota cache AI Insights
          </button>
          
          <button
            className="w-full py-2 px-4 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center justify-center mt-4"
            onClick={() => {
              Object.values(CacheNamespace).forEach(namespace => {
                handleClearCache(namespace as CacheNamespace);
              });
            }}
            disabled={clearingCache}
          >
            {clearingCache ? (
              <>
                <FontAwesomeIcon icon={faSync} spin className="mr-2" />
                Eliminazione in corso...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Svuota tutta la cache
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
