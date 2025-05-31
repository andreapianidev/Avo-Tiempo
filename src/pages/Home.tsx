import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate, faLocationDot, faMapMarkerAlt, faExclamationTriangle, faChartPie, faChartLine, faMap, faWind } from '@fortawesome/free-solid-svg-icons';
import WeatherBox from '../components/WeatherBox';
import ForecastCard from '../components/ForecastCard';
import AIInsight from '../components/AIInsight';
import WeatherDetails from '../components/WeatherDetails';
import WeatherAlertsAndPOI from '../components/WeatherAlertsAndPOI';
import WeatherBasedPOIRecommendations from '../components/WeatherBasedPOIRecommendations';
import DailyActivitySuggestion from '../components/DailyActivitySuggestion';

// Importiamo i componenti di grafici e analisi
import POICategoryDistribution from '../components/POICategoryDistribution';
import POIDistanceDistribution from '../components/POIDistanceDistribution';
import WeatherTrendChart from '../components/WeatherTrendChart';
import POIDensityMap from '../components/POIDensityMap';
import WeatherActivityCorrelation from '../components/WeatherActivityCorrelation';
import AirQualityTrendChart from '../components/AirQualityTrendChart';
import WeatherPatternAnalysis from '../components/WeatherPatternAnalysis';
import WeatherHistory from '../components/WeatherHistory';
import MicroclimateAlert from '../components/MicroclimateAlert';
import { fetchWeather, WeatherData, getMockWeatherData } from '../services/weatherService';
import { setCurrentLocation, getCurrentLocation, listenToLocationChanges } from '../services/appStateService';
import { getAIInsight } from '../services/aiService';
import { getCurrentCity, getCurrentPosition, getCityFromCoords } from '../services/geolocationService';
import { getUserSettings, convertTemperature } from '../services/settingsService';
import { ErrorType, createError, AppError } from '../services/errorService';
import ErrorFeedback from '../components/ErrorFeedback';
import { isOffline, listenToConnectivityChanges } from '../services/appStateService';

const Home: React.FC = () => {
  // Get user settings for temperature units
  const { units } = getUserSettings();
  
  // Stati per i dati meteo e AI
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [streamedAiMessage, setStreamedAiMessage] = useState<string>('');
  
  // Stati di caricamento e errore
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(isOffline());
  
  // Stato per la posizione corrente dell'utente
  const [currentLocation, setLocationState] = useState<string>(getCurrentLocation() || 'El Paso');
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState<boolean>(false);

  // Caricamento dati meteo con memorizzazione della posizione
  const loadWeatherData = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else if (!refresh && isLoading === false) {
      setIsLoading(true);
    }
    
    setError(null);
    
    console.log(`[HOME] Richiesta meteo per ${currentLocation}${refresh ? ' (refresh)' : ''}`);
    
    try {
      // Fetch real weather data from API usando la posizione corrente
      // La posizione sarà gestita internamente dal servizio
      const data = await fetchWeather(currentLocation);
      
      if (!data) {
        throw createError(ErrorType.API, 'No se pudieron obtener los datos del clima');
      }
      
      // Se la posizione nei dati restituiti è diversa, aggiorniamo lo stato locale
      if (data.location.toLowerCase() !== currentLocation.toLowerCase()) {
        console.log(`[HOME] Aggiornamento posizione da ${currentLocation} a ${data.location}`);
        setLocationState(data.location);
      }
      
      setWeatherData(data);
      setLastUpdated(new Date());
      
      // Get AI insight based on weather data with streaming
      try {
        // Reset di entrambi i messaggi prima di iniziare un nuovo streaming
        setStreamedAiMessage('');
        setAiMessage('');
        
        // Chiamata con callback di aggiornamento per lo streaming
        const insight = await getAIInsight(
          data.location,
          data.condition,
          data.temperature,
          data.alert ? [{
            source: 'OpenWeather',
            id: 'ow-alert-1',
            zone: data.location,
            province: data.location.split(' ')[0] || 'Unknown',
            description: data.alert,
            level: 'yellow',  // Default level
            startTime: new Date(),
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            phenomenon: 'Weather Alert'
          }] : undefined,
          undefined, // No POIs for now
          (streamText: string) => {
            setStreamedAiMessage(streamText);
          }
        );
        
        // Una volta completato lo streaming, impostiamo il messaggio completo
        // e resettiamo il messaggio in streaming per evitare duplicazioni
        setAiMessage(insight);
        setStreamedAiMessage('');
      } catch (aiError) {
        console.error('Error fetching AI insight, using fallback:', aiError);
        // If AI fails, we still have weather data, so we don't set a global error
      }
    } catch (err: any) {
      console.error('Error fetching weather data:', err);
      
      // Set fallback data
      setWeatherData(getMockWeatherData(currentLocation));
      
      // Set error for user notification
      if (err.type) {
        setError(err);
      } else {
        setError(createError(
          ErrorType.UNKNOWN,
          'Error desconocido al cargar datos del clima',
          err
        ));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentLocation]);
  
  // Function to refresh data - called by refresh button in weather box
  const handleRefresh = useCallback(() => {
    loadWeatherData(true);
  }, [loadWeatherData]);

  // Funzione per richiedere la posizione corrente
  const requestCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      console.log('[HOME] Richiesta posizione corrente...');
      const { city, coords } = await getCurrentCity();
      
      // Salva la posizione nel servizio centralizzato (aggiorna tutte le schermate)
      setCurrentLocation(city);
      
      // Aggiorna anche lo stato locale
      setLocationState(city);
      setIsUsingCurrentLocation(true);
      
      // Ricarica i dati meteo con la nuova location
      await loadWeatherData(true);
    } catch (error: any) {
      console.error('Error getting location:', error);
      setLocationError(error.message || 'No fue posible obtener tu ubicación actual');
      setIsUsingCurrentLocation(false);
    } finally {
      setLocationLoading(false);
    }
  }, [loadWeatherData]);

  // Utilizziamo useRef per memorizzare le funzioni originali e rompere i cicli di dipendenza
  const loadWeatherRef = useRef(loadWeatherData);
  const requestLocationRef = useRef(requestCurrentLocation);
  
  // Memorizziamo le funzioni originali nei ref per evitare dipendenze circolari
  useEffect(() => {
    loadWeatherRef.current = loadWeatherData;
    requestLocationRef.current = requestCurrentLocation;
  }, [loadWeatherData, requestCurrentLocation]);

  // Ascolta i cambiamenti di posizione da altre schermate
  useEffect(() => {
    // Creazione ascoltatore per cambiamenti di posizione
    const locationUnsubscribe = listenToLocationChanges((newLocation) => {
      console.log(`[HOME] Posizione cambiata in: ${newLocation}`);
      setLocationState(newLocation);
    });
    
    // Ascolta i cambiamenti di connettività
    const connectivityUnsubscribe = listenToConnectivityChanges((online) => {
      console.log(`[HOME] Stato connessione cambiato: ${online ? 'online' : 'offline'}`);
      setIsOfflineMode(!online);
      
      // Se torniamo online dopo essere stati offline, aggiorna i dati
      if (online && isOfflineMode) {
        loadWeatherData(true);
      }
    });
    
    // Se all'avvio non c'è una posizione salvata, proviamo a ottenerla
    if (!currentLocation) {
      requestCurrentLocation();
    }
    
    return () => {
      // Rimozione ascoltatori quando il componente viene smontato
      locationUnsubscribe();
      connectivityUnsubscribe();
    };
  }, [requestCurrentLocation, currentLocation, isOfflineMode, loadWeatherData]);
  
  // Creiamo versioni stabili delle funzioni che usano i riferimenti
  const stableLoadWeather = useCallback((refresh = false) => {
    return loadWeatherRef.current(refresh);
  }, []);
  
  const stableRequestLocation = useCallback(() => {
    return requestLocationRef.current();
  }, []);
  
  // Effettua il caricamento iniziale e imposta l'aggiornamento periodico
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout;
    
    // Carica i dati all'avvio
    stableLoadWeather();
    
    // Se non stiamo usando la posizione corrente, tentiamo di ottenerla automaticamente
    if (!isUsingCurrentLocation) {
      stableRequestLocation();
    }
    
    // Imposta l'aggiornamento periodico dei dati (ogni 30 minuti)
    refreshInterval = setInterval(() => {
      if (isMounted) {
        stableLoadWeather(true);
      }
    }, 30 * 60 * 1000);
    
    // Cleanup quando il componente viene smontato
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [stableLoadWeather, stableRequestLocation, isUsingCurrentLocation]);

  // If loading initially, show skeleton
  if (isLoading && !weatherData) {
    return (
      <div className="pb-20 animate-pulse bg-[var(--color-bg-main)]">
        <div className="p-4 max-w-md mx-auto">
          {/* Mostra l'indicatore offline anche durante il caricamento */}
          {isOfflineMode && (
            <ErrorFeedback 
              error={null} 
              className="mb-4"
            />
          )}
          
          {/* Location skeleton */}
          <div className="flex justify-between items-center mb-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          
          {/* Weather box skeleton */}
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
          
          {/* AI insight skeleton */}
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
          
          {/* Hourly forecast skeleton */}
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-md mb-3"></div>
          <div className="flex overflow-x-auto pb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg mx-1 flex-shrink-0"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Se non abbiamo dati meteo, mostra un messaggio di errore
  if (!weatherData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg-main)] p-4 text-center text-[var(--color-text-primary)]">
        <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl text-[var(--color-highlight)] mb-4" />
        <h2 className="text-xl font-medium mb-2">No se pudieron cargar los datos</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">{error?.message || 'Ha ocurrido un error inesperado.'}</p>
        <button 
          onClick={() => loadWeatherData()}
          className="px-6 py-2 bg-[var(--color-highlight)] text-white rounded-lg flex items-center"
        >
          <FontAwesomeIcon icon={faRotate} className="mr-2" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-[var(--color-bg-main)] min-h-screen p-4" style={{ height: 'auto', overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}> {/* Bottom padding for footer nav + scrollabile */}
      <div className="mx-auto max-w-md">
        {/* Location info and permission request */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <FontAwesomeIcon 
              icon={isUsingCurrentLocation ? faLocationDot : faMapMarkerAlt} 
              className={`mr-2 ${isUsingCurrentLocation ? 'text-[var(--color-highlight)]' : 'text-[var(--color-text-secondary)]'}`} 
            />
            <span className="text-[var(--color-text-primary)]">
              {isUsingCurrentLocation ? 'Posizione attuale' : 'Posizione predefinita'}
            </span>
          </div>
          
          <button 
            onClick={requestCurrentLocation} 
            disabled={locationLoading}
            className={`px-3 py-1 text-sm rounded-lg flex items-center ${locationLoading ? 'bg-gray-200 text-gray-500' : 'bg-[var(--color-highlight)] text-white'}`}
          >
            <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
            {locationLoading ? 'Caricamento...' : (isUsingCurrentLocation ? 'Aggiorna' : 'Usa posizione')}
          </button>
        </div>
        
        {locationError && (
          <ErrorFeedback 
            error={createError(ErrorType.LOCATION, locationError || 'Errore di accesso alla posizione')} 
            onDismiss={() => setLocationError(null)}
          />
        )}

        {/* Il WeatherBox ora contiene il titolo dell'app e tutti i dettagli principali */}
        <WeatherBox 
          temperature={convertTemperature(weatherData.temperature, units)}
          feelsLike={convertTemperature(weatherData.feelsLike, units)}
          humidity={weatherData.humidity}
          windSpeed={weatherData.windSpeed}
          condition={weatherData.condition}
          units={units}
          location={weatherData.location}
          alert={weatherData.alert}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Messaggio AI con supporto streaming */}
        <AIInsight 
          message={aiMessage} 
          isLoading={isRefreshing} 
          streamedMessage={streamedAiMessage} 
          onStreamUpdate={setStreamedAiMessage} 
        />
        
        <ErrorFeedback 
          error={error} 
          onRetry={() => handleRefresh()} 
          onDismiss={() => setError(null)}
        />

        {/* Previsione oraria */}
        <h3 className="font-medium text-[var(--color-text-primary)] mb-3 mt-6">Previsión horaria</h3>
        <div className="flex overflow-x-auto pb-4 scrollbar-hide">
          {weatherData.hourlyForecast.map((forecast, index) => (
            <ForecastCard 
              key={index}
              time={forecast.time}
              temperature={convertTemperature(forecast.temperature, units)}
              condition={forecast.condition}
              isNow={index === 0}
              units={units}
            />
          ))}
        </div>
        
        {/* Weather details */}
        {weatherData && (
          <WeatherDetails
            humidity={weatherData.humidity}
            pressure={typeof weatherData.pressure === 'number' ? weatherData.pressure : 1013}
            windSpeed={weatherData.windSpeed}
            windDirection={typeof weatherData.windDirection === 'number' ? weatherData.windDirection : 0}
            visibility={typeof weatherData.visibility === 'number' ? weatherData.visibility : 10}
            sunrise={typeof weatherData.sunrise === 'number' ? weatherData.sunrise : 6.5} 
            sunset={typeof weatherData.sunset === 'number' ? weatherData.sunset : 19.75}
            clouds={typeof weatherData.clouds === 'number' ? weatherData.clouds : 0}
            uvIndex={weatherData.uvIndex}
            rain1h={weatherData.rain1h}
            snow1h={weatherData.snow1h}
            windGust={weatherData.windGust}
            className="mt-6"
          />
        )}
        
        {/* Daily Activity Suggestion - Cosa faccio oggi? */}
        {weatherData && (
          <DailyActivitySuggestion
            weatherData={weatherData}
            className="mt-6"
            radius={10000}
          />
        )}
        
        {/* Componente per salvare e visualizzare la cronologia meteo */}
        {weatherData && (
          <WeatherHistory
            currentWeatherData={weatherData}
            className="mt-6"
          />
        )}
        
        {/* Nota informativa sull'aggiornamento dati */}
        <div className="mt-6 p-4 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <FontAwesomeIcon icon={faRotate} className="mr-2 text-[var(--color-highlight)]" />
            Los datos meteorológicos se actualizan automáticamente cada hora o cuando cambias de ubicación.
          </p>
        </div>
        
        {/* Alerts per microclimi vicini con meteo migliore */}
        {weatherData && (
          <MicroclimateAlert
            currentLocation={weatherData.location}
            coords={{
              latitude: weatherData.lat,
              longitude: weatherData.lon
            }}
            onNavigate={(lat, lon, name) => {
              // Funzione per navigare alla località con meteo migliore
              console.log(`Navigazione verso: ${name} (${lat}, ${lon})`);
              // Qui potremmo aprire una mappa o navigare alla località
            }}
          />
        )}
        
        {/* Sezione con i grafici di analisi */}
        {weatherData && (
          <div className="mt-6">
            <h2 className="font-medium text-[var(--color-text-primary)] mb-4 flex items-center">
              <FontAwesomeIcon icon={faChartPie} className="mr-2 text-[var(--color-highlight)]" />
              Analisi Dati e Statistiche
            </h2>
            
            {/* Grafico dell'andamento meteo settimanale */}
            {/* Analisi dei pattern meteorologici */}
            <WeatherPatternAnalysis
              weatherData={weatherData}
              location={weatherData.location}
              className="mb-4"
            />
            
            {/* Layout a due colonne per i nuovi grafici di correlazione attività e qualità aria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Grafico correlazione attività-meteo */}
              <WeatherActivityCorrelation 
                weatherData={weatherData}
                className="col-span-1" 
              />
              
              {/* Grafico trend qualità dell'aria */}
              <AirQualityTrendChart 
                lat={weatherData.lat} 
                lon={weatherData.lon} 
                currentAqi={{
                  value: 56,
                  category: "Buona",
                  pm25: 23,
                  pm10: 34,
                  o3: 45,
                  no2: 18,
                  pollen: 15
                }}
                className="col-span-1" 
              />
            </div>
            
            {/* Grafico dell'andamento meteo settimanale */}
            <WeatherTrendChart 
              lat={weatherData.lat}
              lon={weatherData.lon}
              location={weatherData.location}
              className="mb-4"
            />
            
            {/* Layout a due colonne per i grafici di distribuzione POI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Grafico distribuzione POI per categoria */}
              <POICategoryDistribution 
                lat={weatherData.lat}
                lon={weatherData.lon}
                radius={10000}
              />
              
              {/* Grafico distribuzione POI per distanza */}
              <POIDistanceDistribution 
                lat={weatherData.lat}
                lon={weatherData.lon}
                radius={10000}
              />
            </div>
            
            {/* Mappa di densità dei POI */}
            <POIDensityMap 
              lat={weatherData.lat}
              lon={weatherData.lon}
              radius={10000}
              className="mb-4"
            />
          </div>
        )}
        
        {/* Sezione per allerte meteo e POI */}
        {weatherData && (
          <WeatherAlertsAndPOI
            lat={weatherData.lat}
            lon={weatherData.lon}
            location={weatherData.location}
            condition={weatherData.condition}
            temperature={weatherData.temperature}
            className="mt-6"
          />
        )}
        
        {/* Nuova sezione per POI consigliati in base al meteo e all'ora */}
        {weatherData && (
          <WeatherBasedPOIRecommendations
            lat={weatherData.lat}
            lon={weatherData.lon}
            location={weatherData.location}
            condition={weatherData.condition}
            temperature={weatherData.temperature}
            time={new Date()}
            radius={10000}
            className="mt-6"
          />
        )}
        
        {/* Spazio vuoto alla fine per garantire che il contenuto sia completamente scrollabile */}
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default Home;
