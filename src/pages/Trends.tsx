import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate, faExclamationTriangle, faWater, faCloud, faSun, faLocationDot, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import AIInsight from '../components/AIInsight';
import { fetchWeeklyTrend, generateTrendSummary, WeatherTrend, getActiveLocation } from '../services/trendService';
import { setCurrentLocation, getCurrentLocation, listenToLocationChanges } from '../services/appStateService';
import { getAIInsight } from '../services/aiService';
import { getUserSettings, convertTemperature, getTemperatureUnit } from '../services/settingsService';
import { createError, ErrorType, AppError, getUserFriendlyErrorMessage } from '../services/errorService';

const Trends: React.FC = () => {
  const [trendData, setTrendData] = useState<WeatherTrend[]>([]);
  const [trendSummary, setTrendSummary] = useState<string>('');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [streamedAiInsight, setStreamedAiInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>(getCurrentLocation() || 'El Paso');
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  // Get user settings for temperature units
  const { units } = getUserSettings();

  // Utilizziamo useRef per evitare dipendenze circolari
  const locationRef = useRef(currentLocation);

  // Aggiorniamo il ref quando cambia la posizione
  useEffect(() => {
    locationRef.current = currentLocation;
  }, [currentLocation]);

  // Definiamo le funzioni principali
  const loadTrendData = useCallback(async (refresh = false) => {
    const location = locationRef.current;

    if (refresh) {
      setIsRefreshing(true);
    } else if (!refresh && isLoading === false) {
      setIsLoading(true);
    }

    setError(null);

    try {
      console.log(`[TRENDS] Caricamento tendenze per ${location}`);
      // Fetch weekly trend data usando il servizio centralizzato
      const trends = await fetchWeeklyTrend(location);
      setTrendData(trends);

      // Generate summary
      const summary = generateTrendSummary(trends);
      setTrendSummary(summary.summary);

      // Get AI insight for trends with streaming support
      try {
        // Reset dello stream prima di ogni nuova generazione
        setStreamedAiInsight('');

        // Chiamata con callback di aggiornamento per lo streaming
        const insight = await getAIInsight(
          location,
          summary.dominantCondition,
          summary.averageMaxTemp,
          `Tendencia a ${summary.averageMaxTemp}°C max y ${summary.averageMinTemp}°C min en ${location}`,
          (streamText) => {
            setStreamedAiInsight(streamText);
          }
        );

        // Aggiorniamo anche aiInsight per compatibilità
        setAiInsight(insight);
      } catch (aiError) {
        console.error('Error getting AI insight:', aiError);
        setAiInsight('AI no disponible en este momento');
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching trend data:', err);

      setError(err.type ? err : createError(
        ErrorType.UNKNOWN,
        'Error desconocido al cargar tendencias',
        err
      ));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Richiedi la posizione attuale dell'utente
  const requestCurrentLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      console.log('[TRENDS] Richiedendo posizione corrente...');
      const location = await getActiveLocation();

      // Salva la posizione nel servizio centralizzato (aggiorna tutte le schermate)
      setCurrentLocation(location);

      // Aggiorna lo stato locale
      setIsUsingCurrentLocation(true);

      // Ricarica i dati con la nuova posizione
      await loadTrendData(true);
    } catch (error) {
      console.error('Error getting current location:', error);
      setIsUsingCurrentLocation(false);
    } finally {
      setLocationLoading(false);
    }
  }, [loadTrendData]);

  // Hook per ascoltare i cambiamenti di posizione da altre schermate
  useEffect(() => {
    // Creazione ascoltatore per cambiamenti di posizione
    const unsubscribe = listenToLocationChanges((newLocation) => {
      console.log(`[TRENDS] Posizione cambiata in: ${newLocation}`);
      setCurrentLocation(newLocation);
    });

    // Impostazione aggiornamento ogni ora
    const refreshInterval = setInterval(() => {
      loadTrendData(true);
    }, 60 * 60 * 1000); // 1 ora per rispettare il limite di chiamate API

    // Caricamento iniziale dei dati
    loadTrendData();

    return () => {
      clearInterval(refreshInterval);
      unsubscribe();
    };
  }, [loadTrendData]);

  // Questo effetto si attiva quando cambia la posizione
  useEffect(() => {
    // Evitiamo di ricaricare al primo render
    if (locationRef.current !== currentLocation) {
      loadTrendData();
    }
  }, [currentLocation, loadTrendData]);

  const handleRefresh = useCallback(() => {
    loadTrendData(true);
  }, [loadTrendData]);

  // Get temperature range for display
  const getTemperatureRange = useCallback(() => {
    if (!trendData || trendData.length === 0) return { min: '--', max: '--' };

    const maxTemps = trendData.map(day => day.maxTemp);
    const minTemps = trendData.map(day => day.minTemp);

    const max = Math.max(...maxTemps);
    const min = Math.min(...minTemps);

    return {
      max: convertTemperature(max, units),
      min: convertTemperature(min, units)
    };
  }, [trendData, units]);

  // Calculate average precipitation
  const getAveragePrecipitation = useCallback(() => {
    if (!trendData || trendData.length === 0) return '--';

    const total = trendData.reduce((sum, day) => sum + day.precipitation, 0);
    return Math.round(total / trendData.length);
  }, [trendData]);

  // If data is still loading initially, show skeleton loader
  if (isLoading && trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-3"></div>
            <div className="h-24 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-4"></div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
          </div>
          <p className="text-gray-500 mt-4">Cargando tendencias...</p>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-md mb-3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (!trendData.length && error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg-main)] p-4 text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl text-amber-500 mb-4" />
        <h2 className="text-xl font-medium mb-2">No se pudieron cargar los datos</h2>
        <p className="text-gray-600 mb-6">{getUserFriendlyErrorMessage(error)}</p>
        <button 
          onClick={() => loadTrendData()}
          className="px-6 py-2 bg-amber-500 text-white rounded-lg flex items-center"
        >
          <FontAwesomeIcon icon={faRotate} className="mr-2" /> Reintentar
        </button>
      </div>
    );
  }

  const tempRange = getTemperatureRange();
  const avgPrecipitation = getAveragePrecipitation();

  return (
    <div className="pb-20 p-4 bg-[var(--color-bg-main)] min-h-screen" style={{ height: 'auto', overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-medium text-[var(--color-text-primary)]">Tendencias Meteorológicas</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-highlight)] text-white"
            title="Actualizar datos"
          >
            <FontAwesomeIcon icon={faRotate} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Selector de ubicación */}
        <div className="mb-4 flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center">
            <FontAwesomeIcon 
              icon={isUsingCurrentLocation ? faLocationDot : faMapMarkerAlt} 
              className={`mr-2 ${isUsingCurrentLocation ? 'text-[var(--color-highlight)]' : 'text-[var(--color-text-secondary)]'}`} 
            />
            <span className="text-[var(--color-text-primary)]">
              {currentLocation}
            </span>
          </div>
          
          <button 
            onClick={requestCurrentLocation} 
            disabled={locationLoading}
            className={`px-3 py-1 text-sm rounded-lg flex items-center ${locationLoading ? 'bg-gray-200 text-gray-500' : 'bg-[var(--color-highlight)] text-white'}`}
          >
            <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
            {locationLoading ? 'Cargando...' : (isUsingCurrentLocation ? 'Actualizar' : 'Mi ubicación')}
          </button>
        </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-800 text-sm">
          {getUserFriendlyErrorMessage(error)}
        </div>
      )}
      
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="font-medium mb-3 flex items-center">
          <FontAwesomeIcon icon={faSun} className="text-amber-500 mr-2" />
          Previsión Semanal | {currentLocation}
        </h2>
        
        {/* Weekly weather chart */}
        <div className="h-48 bg-gradient-to-b from-amber-50 to-white rounded-lg mb-3 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-100 to-transparent"></div>
          
          {/* Temperature guide line */}
          <div className="absolute left-0 right-0 top-1/2 border-b-2 border-amber-400 border-dashed"></div>
          
          {/* Weather points - dynamically positioned based on real data */}
          {trendData.map((day, index) => {
            // Calculate horizontal position
            const leftPos = `${10 + (index * 12)}%`;
            
            // Calculate vertical position (inverted - higher temp = lower position)
            // Normalize between 20% and 80% of container height
            const maxPossibleTemp = 35; // Maximum expected temperature
            const minPossibleTemp = 10; // Minimum expected temperature
            const tempRange = maxPossibleTemp - minPossibleTemp;
            const normalizedPos = 1 - ((day.maxTemp - minPossibleTemp) / tempRange);
            const bottomPos = `${20 + (normalizedPos * 60)}%`;
            
            return (
              <div key={index} className="absolute w-2 h-2 bg-amber-500 rounded-full" 
                style={{left: leftPos, bottom: bottomPos}}
                title={`${day.day}: ${day.maxTemp}°C`}
              />
            );
          })}
          
          {/* Days of week labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 pb-2 text-xs text-gray-500">
            {trendData.map((day, index) => (
              <span key={index}>{day.day}</span>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-500">Temp. Máxima:</span>
            <span className="font-medium">{tempRange.max}{getTemperatureUnit(units)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Temp. Mínima:</span>
            <span className="font-medium">{tempRange.min}{getTemperatureUnit(units)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Precipitación:</span>
            <span className="font-medium">{avgPrecipitation}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Condición dominante:</span>
            <span className="font-medium flex items-center">
              {trendData.length > 0 && (
                <>
                  <FontAwesomeIcon 
                    icon={trendData[0].condition === 'clear' ? faSun : 
                          trendData[0].condition === 'rain' ? faWater : faCloud} 
                    className="mr-1 text-amber-500" 
                  />
                  {trendData[0].condition}
                </>
              )}
            </span>
          </div>
        </div>
      </div>
      
      <h2 className="font-medium mb-3 flex items-center">
        <FontAwesomeIcon icon={faCloud} className="text-amber-500 mr-2" />
        Análisis de Tendencias
      </h2>
      <AIInsight 
        message={aiInsight} 
        isLoading={isRefreshing} 
        streamedMessage={streamedAiInsight} 
        onStreamUpdate={setStreamedAiInsight} 
      />
      
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <h2 className="font-medium mb-2 flex items-center">
          <FontAwesomeIcon icon={faWater} className="text-amber-500 mr-2" />
          Resumen Semanal
        </h2>
        <p className="text-sm text-gray-500">
          {trendSummary || 'Cargando resumen semanal...'}
        </p>
        
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-2 text-right">
            Actualizado: {lastUpdated.toLocaleTimeString('es-ES')}
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

export default Trends;
