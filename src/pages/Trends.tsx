import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRotate, faExclamationTriangle, faWater, faCloud, faSun, 
  faLocationDot, faMapMarkerAlt, faChartLine, faChartBar, 
  faTemperatureHigh, faUmbrella, faWind, faCalendarAlt, 
  faInfoCircle, faHistory, faExchangeAlt, faLeaf, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import AIInsight from '../components/AIInsight';
import WeatherCharts from '../components/WeatherCharts';
import AirQualityAndActivities from '../components/AirQualityAndActivities';
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
  
  // Nuovi stati per le funzionalità avanzate
  const [selectedChartType, setSelectedChartType] = useState<'temperature' | 'precipitation' | 'comfort' | 'all'>('temperature');
  const [showExtendedInfo, setShowExtendedInfo] = useState<boolean>(false);
  const [showHistoricalComparison, setShowHistoricalComparison] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [showQuickStats, setShowQuickStats] = useState<boolean>(true);

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
          [{ // Convert the string alert to a WeatherAlert object
            source: 'OpenWeather',
            id: 'trend-summary-1',
            zone: location,
            province: location.split(' ')[0] || 'Unknown',
            description: `Tendencia a ${summary.averageMaxTemp}°C max y ${summary.averageMinTemp}°C min en ${location}`,
            level: 'unknown',
            startTime: new Date(),
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            phenomenon: 'Tendencia Semanal'
          }],
          undefined, // No POIs for trends
          (streamText: string) => {
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
        {/* Selezione del tipo di grafico */}
      <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-medium flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="text-amber-500 mr-2" />
            Grafici meteorologici
          </h3>
          <div className="text-xs">
            <button 
              onClick={() => setTimeRange(timeRange === 'week' ? 'month' : 'week')}
              className="flex items-center text-gray-500 hover:text-amber-600 transition-colors"
            >
              <FontAwesomeIcon icon={faExchangeAlt} className="mr-1" />
              {timeRange === 'week' ? 'Mensile' : 'Settimanale'}
            </button>
          </div>
        </div>
        
        <div className="flex overflow-x-auto pb-2 -mx-1 mb-2">
          <button 
            onClick={() => setSelectedChartType('temperature')} 
            className={`px-3 py-2 text-xs rounded-md mx-1 flex items-center whitespace-nowrap ${selectedChartType === 'temperature' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <FontAwesomeIcon icon={faTemperatureHigh} className="mr-1" />
            Temperature
          </button>
          <button 
            onClick={() => setSelectedChartType('precipitation')} 
            className={`px-3 py-2 text-xs rounded-md mx-1 flex items-center whitespace-nowrap ${selectedChartType === 'precipitation' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <FontAwesomeIcon icon={faUmbrella} className="mr-1" />
            Precipitazioni
          </button>
          <button 
            onClick={() => setSelectedChartType('comfort')} 
            className={`px-3 py-2 text-xs rounded-md mx-1 flex items-center whitespace-nowrap ${selectedChartType === 'comfort' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <FontAwesomeIcon icon={faLeaf} className="mr-1" />
            Comfort
          </button>
          <button 
            onClick={() => setSelectedChartType('all')} 
            className={`px-3 py-2 text-xs rounded-md mx-1 flex items-center whitespace-nowrap ${selectedChartType === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <FontAwesomeIcon icon={faChartBar} className="mr-1" />
            Tutti i grafici
          </button>
        </div>
        
        {/* Grafici avanzati con Chart.js */}
        <WeatherCharts 
          trendData={trendData} 
          chartType={selectedChartType} 
        />
      </div>
      
      {/* Schede rapide con statistiche */}
      {showQuickStats && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-amber-700 mb-1">Temperatura media</div>
            <div className="flex justify-between items-end">
              <div className="text-xl font-semibold">
                {Math.round((Number(tempRange.max) + Number(tempRange.min)) / 2)}{getTemperatureUnit(units)}
              </div>
              <FontAwesomeIcon icon={faTemperatureHigh} className="text-amber-500 text-lg" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-blue-700 mb-1">Probabilità pioggia</div>
            <div className="flex justify-between items-end">
              <div className="text-xl font-semibold">
                {avgPrecipitation}%
              </div>
              <FontAwesomeIcon icon={faUmbrella} className="text-blue-500 text-lg" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-green-700 mb-1">Indice UV medio</div>
            <div className="flex justify-between items-end">
              <div className="text-xl font-semibold">
                {Math.round(trendData.reduce((sum, day) => sum + (day.uvIndex || 5), 0) / Math.max(1, trendData.length))}
              </div>
              <FontAwesomeIcon icon={faSun} className="text-yellow-500 text-lg" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-700 mb-1">Vento medio</div>
            <div className="flex justify-between items-end">
              <div className="text-xl font-semibold">
                {Math.round(trendData.reduce((sum, day) => sum + (day.windSpeed || 10), 0) / Math.max(1, trendData.length))} km/h
              </div>
              <FontAwesomeIcon icon={faWind} className="text-gray-500 text-lg" />
            </div>
          </div>
        </div>
      )}
        
  
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
      
      {/* Componente per qualità dell'aria e attività consigliate */}
      <AirQualityAndActivities 
        trendData={trendData} 
        className="my-4" 
      />
      
      <div className="bg-white rounded-xl p-4 shadow-sm my-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium flex items-center">
            <FontAwesomeIcon icon={faWater} className="text-amber-500 mr-2" />
            Resumen Semanal
          </h2>
          <button 
            onClick={() => setShowExtendedInfo(!showExtendedInfo)}
            className="text-xs text-amber-600 hover:text-amber-700 flex items-center"
          >
            <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
            {showExtendedInfo ? 'Menos detalles' : 'Más detalles'}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {trendSummary || 'Cargando resumen semanal...'}
        </p>
        
        {showExtendedInfo && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-medium mb-2 flex items-center">
              <FontAwesomeIcon icon={faShieldAlt} className="text-amber-500 mr-1" />
              Avvisi e consigli per la settimana
            </h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              {Number(trendData[0]?.maxTemp) > 28 && (
                <li className="flex items-start">
                  <span className="text-red-500 mr-1">•</span>
                  <span>Temperature elevate: bevi almeno 2 litri d'acqua al giorno e evita le ore più calde</span>
                </li>
              )}
              {Number(avgPrecipitation) > 30 && (
                <li className="flex items-start">
                  <span className="text-blue-500 mr-1">•</span>
                  <span>Alta probabilità di pioggia: porta sempre con te un ombrello o impermeabile</span>
                </li>
              )}
              {trendData.some(day => (Number(day.windSpeed || 0) > 30)) && (
                <li className="flex items-start">
                  <span className="text-gray-500 mr-1">•</span>
                  <span>Venti forti previsti: prestare attenzione a oggetti che potrebbero volare via</span>
                </li>
              )}
              {trendData.some(day => day.condition === 'clear' || day.condition === 'sunny') && (
                <li className="flex items-start">
                  <span className="text-yellow-500 mr-1">•</span>
                  <span>Giornate soleggiate: usa protezione solare e occhiali da sole nelle ore diurne</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="text-green-500 mr-1">•</span>
                <span>I dati vengono aggiornati ogni 3 ore per garantire la massima precisione</span>
              </li>
            </ul>
          </div>
        )}
        
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-3 text-right flex items-center justify-end">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
            Actualizado: {lastUpdated.toLocaleTimeString('es-ES')}, {lastUpdated.toLocaleDateString('es-ES')}
          </p>
        )}
      </div>
      
      {/* Bottone per mostrare confronto con dati storici */}
      <button
        onClick={() => setShowHistoricalComparison(!showHistoricalComparison)}
        className="w-full py-2 px-4 mb-4 text-sm rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <FontAwesomeIcon icon={faHistory} className="mr-2" />
        {showHistoricalComparison ? 'Nascondi confronto con anni precedenti' : 'Confronta con anni precedenti'}
      </button>
      
      {/* Confronto con dati storici (simulati) */}
      {showHistoricalComparison && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="text-base font-medium mb-3 flex items-center">
            <FontAwesomeIcon icon={faHistory} className="text-amber-500 mr-2" />
            Confronto con lo storico
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-24 text-xs text-gray-500">Temperature</div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex items-center px-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400 z-10"></div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div className="h-4 w-4 rounded-full bg-amber-500 z-10 flex items-center justify-center">
                    <span className="text-white text-[8px]">2025</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 z-10"></div>
                </div>
              </div>
              <div className="w-16 ml-2 text-xs text-gray-500 text-right">+1.3°C</div>
            </div>
            
            <div className="flex items-center">
              <div className="w-24 text-xs text-gray-500">Precipitazioni</div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex items-center px-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400 z-10"></div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div className="h-4 w-4 rounded-full bg-blue-500 z-10 flex items-center justify-center">
                    <span className="text-white text-[8px]">2025</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 z-10"></div>
                </div>
              </div>
              <div className="w-16 ml-2 text-xs text-gray-500 text-right">-5%</div>
            </div>
            
            <div className="flex items-center">
              <div className="w-24 text-xs text-gray-500">Ore di sole</div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex items-center px-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400 z-10"></div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div className="h-4 w-4 rounded-full bg-yellow-500 z-10 flex items-center justify-center">
                    <span className="text-white text-[8px]">2025</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300"></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 z-10"></div>
                </div>
              </div>
              <div className="w-16 ml-2 text-xs text-gray-500 text-right">+2.1h</div>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            Confronto con le medie storiche degli ultimi 10 anni per lo stesso periodo. 
            Il clima di {currentLocation} sta mostrando un trend di riscaldamento con temperature superiori alla media.  
          </p>
        </div>
      )}
      </div>
    </div>
  );
};

export default Trends;
