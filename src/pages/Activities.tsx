import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHiking, faBicycle, faUmbrellaBeach, faUtensils, faChild, 
  faMuseum, faCalendarAlt, faMapMarkedAlt, faSpinner, faFilter,
  faCalendarPlus, faCloud, faUsers, faLightbulb
} from '@fortawesome/free-solid-svg-icons';

// Importazioni componenti con workaround per TypeScript
import ActivityCard from '../components/ActivityCard';
// @ts-ignore - Ignoriamo temporaneamente gli errori di tipo sui componenti
import MapView from '../components/MapView';
// @ts-ignore
import LoadingSpinner from '../components/LoadingSpinner';
import AIInsight from '../components/AIInsight';
// @ts-ignore
import ErrorMessage from '../components/ErrorMessage';

// Nuovi componenti innovativi
// @ts-ignore
import ActivityScheduler from '../components/ActivityScheduler';
// @ts-ignore
import SmartWeatherMatcher from '../components/SmartWeatherMatcher';
// @ts-ignore
import SocialActivities from '../components/SocialActivities';

// Importazioni servizi
import { getRecommendedActivities, getRelevantPOIs } from '../services/activitiesService';
import { fetchWeather } from '../services/weatherService';
import { ActivityCategory, RatedActivity } from '../types/activities';
import { WeatherData } from '../services/weatherService';

const Activities: React.FC = () => {
  const [activities, setActivities] = useState<RatedActivity[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<RatedActivity | null>(null);
  const [pois, setPois] = useState<any[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  
  // Stati per le nuove funzionalità innovative
  const [showScheduler, setShowScheduler] = useState(false);
  const [showWeatherMatcher, setShowWeatherMatcher] = useState(false);
  const [showSocialActivities, setShowSocialActivities] = useState(false);
  const [activeInnovation, setActiveInnovation] = useState<RatedActivity | null>(null);

  // Categorie disponibili
  const categories = [
    { id: ActivityCategory.SPORT, name: 'Sport', icon: faBicycle },
    { id: ActivityCategory.CULTURA, name: 'Cultura', icon: faMuseum },
    { id: ActivityCategory.NATURA, name: 'Natura', icon: faHiking },
    { id: ActivityCategory.GASTRONOMIA, name: 'Gastronomia', icon: faUtensils },
    { id: ActivityCategory.FAMIGLIA, name: 'Famiglia', icon: faChild }
  ];

  // Carica attività e dati meteo
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Carica dati meteo
        const weather = await fetchWeather();
        if (!weather) {
          throw new Error('Impossibile recuperare i dati meteo');
        }
        setWeatherData(weather);
        
        // Carica attività raccomandate
        const recommendedActivities = await getRecommendedActivities(weather, selectedCategory || undefined);
        setActivities(recommendedActivities);
      } catch (err) {
        console.error('Errore nel caricamento dei dati: ', err);
        setError('Si è verificato un errore nel caricamento delle attività. Riprova più tardi.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedCategory]);

  // Gestisce il click su "Mostra sulla mappa"
  const handleShowMap = async (activity: RatedActivity) => {
    if (!weatherData) return;
    
    setSelectedActivity(activity);
    setShowMap(true);
    
    try {
      setPoisLoading(true);
      const relevantPois = await getRelevantPOIs(activity, {
        lat: weatherData.lat,
        lon: weatherData.lon
      });
      setPois(relevantPois);
    } catch (err) {
      console.error('Errore nel caricamento dei POI: ', err);
    } finally {
      setPoisLoading(false);
    }
  };
  
  // Handler per aprire lo scheduler
  const handleOpenScheduler = (activity: RatedActivity) => {
    setActiveInnovation(activity);
    setShowScheduler(true);
  };
  
  // Handler per aprire il weather matcher
  const handleOpenWeatherMatcher = (activity: RatedActivity) => {
    setActiveInnovation(activity);
    setShowWeatherMatcher(true);
  };
  
  // Handler per aprire le attività sociali
  const handleOpenSocialActivities = (activity: RatedActivity) => {
    setActiveInnovation(activity);
    setShowSocialActivities(true);
  };

  // Gestisce il click sui filtri di categoria
  const handleCategoryFilter = (category: ActivityCategory) => {
    if (selectedCategory === category) {
      // Se la categoria è già selezionata, deselezionala
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  // Chiude la mappa
  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedActivity(null);
    setPois([]);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-auto pb-20">
      <div className="container mx-auto px-4 py-4 flex-1">
        {/* Componenti Modali per Funzionalità Innovative */}
        {showScheduler && activeInnovation && weatherData && (
          <ActivityScheduler
            activity={activeInnovation}
            weather={weatherData}
            onClose={() => setShowScheduler(false)}
          />
        )}
        
        {showWeatherMatcher && activeInnovation && weatherData && (
          <SmartWeatherMatcher
            activity={activeInnovation}
            weather={weatherData}
            onClose={() => setShowWeatherMatcher(false)}
          />
        )}
        
        {showSocialActivities && activeInnovation && weatherData && (
          <SocialActivities
            activity={activeInnovation}
            weather={weatherData}
            onClose={() => setShowSocialActivities(false)}
          />
        )}
        {/* Intestazione */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Attività</h1>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-[var(--color-highlight)]" />
            <span className="text-sm">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
        
        {/* Filtri categoria */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex space-x-2 py-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.id)}
                className={`px-3 py-2 rounded-lg flex items-center text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-[var(--color-highlight)] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FontAwesomeIcon icon={category.icon} className="mr-2" />
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Descrizione filtri attivi */}
        {selectedCategory && (
          <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm flex items-center justify-between">
            <div>
              <FontAwesomeIcon icon={faFilter} className="mr-2 text-[var(--color-highlight)]" />
              Filtrando per: <span className="font-medium">{categories.find(c => c.id === selectedCategory)?.name}</span>
            </div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Rimuovi filtro
            </button>
          </div>
        )}
        
        {isLoading ? (
          <LoadingSpinner message="Caricamento attività disponibili..." />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : showMap && selectedActivity ? (
          <div className="rounded-xl overflow-hidden shadow-md border border-gray-200 mb-4">
            <div className="bg-gray-50 p-3 flex justify-between items-center">
              <h2 className="text-lg font-medium">{selectedActivity.name}</h2>
              <button
                onClick={handleCloseMap}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Torna alle attività
              </button>
            </div>
            
            <div className="h-[60vh] relative">
              {poisLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-[var(--color-highlight)] text-2xl" />
                </div>
              ) : null}
              
              <MapView 
                center={weatherData ? [weatherData.lat, weatherData.lon] : undefined}
                pois={pois}
                selectedPoiType={selectedActivity.category}
              />
            </div>
            
            <div className="p-3 bg-white">
              <p className="text-sm">
                <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-[var(--color-highlight)]" />
                {pois.length} punti di interesse trovati per {selectedActivity.name}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Insight AI */}
            {weatherData && (
              <AIInsight 
                message="" 
                type="activities" 
                location={weatherData.location} 
                data={{
                  temperature: weatherData.temperature,
                  condition: weatherData.condition,
                  activities: activities.slice(0, 3).map(a => a.name).join(', ')
                }}
                className="mb-4"
              />
            )}
            
            {/* Lista attività */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activities.map((activity, index) => (
                <ActivityCard 
                  key={activity.id} 
                  activity={activity}
                  weather={weatherData!}
                  showMap={handleShowMap}
                  className={index < 5 ? 'order-' + index : ''}
                  extraActions={[
                    {
                      icon: faCalendarPlus,
                      label: 'Pianifica',
                      action: () => handleOpenScheduler(activity)
                    },
                    {
                      icon: faCloud,
                      label: 'Meteo-Match',
                      action: () => handleOpenWeatherMatcher(activity)
                    },
                    {
                      icon: faUsers,
                      label: 'Social',
                      action: () => handleOpenSocialActivities(activity)
                    }
                  ]}
                />
              ))}
            </div>
            
            {activities.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Nessuna attività trovata per i filtri selezionati.</p>
              </div>
            )}
            
            {/* Banner informativo sulle nuove funzionalità */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FontAwesomeIcon icon={faLightbulb} className="text-blue-500 text-xl" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Nuove Funzionalità</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Abbiamo aggiunto nuove funzionalità innovative alla sezione Attività:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><span className="font-medium">Pianifica</span> - Organizza le tue attività con un'agenda intelligente</li>
                      <li><span className="font-medium">Meteo-Match</span> - Analisi dettagliata della compatibilità meteo</li>
                      <li><span className="font-medium">Social</span> - Trova compagni di viaggio e gruppi di attività</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Activities;
