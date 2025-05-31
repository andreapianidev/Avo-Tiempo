import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHiking, faBicycle, faUmbrellaBeach, faUtensils, faChild, 
  faMuseum, faCalendarAlt, faMapMarkedAlt, faSpinner, faFilter,
  faCalendarPlus, faCloud, faUsers, faLightbulb, faCloudSun // Added faCloudSun
} from '@fortawesome/free-solid-svg-icons';
import { IonAlert, IonButton } from '@ionic/react'; // Added IonAlert and IonButton for the new section

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
import SpontaneousExplorerWidget from '../components/SpontaneousExplorerWidget'; // Importa il nuovo widget

// Importazioni servizi
import { getRecommendedActivities, getRelevantPOIs } from '../services/activitiesService';
import { fetchWeather } from '../services/weatherService';
import { ActivityCategory, RatedActivity } from '../types/activities';
import { WeatherData } from '../services/weatherService';
import { GeoCoords } from '../services/geolocationService'; // Assicurati che GeoCoords sia importato

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

  // Nuovo stato per l'alert informativo degli strumenti innovativi
  const [toolInfoAlert, setToolInfoAlert] = useState<{show: boolean, toolName: string | null, message: string | null}>({show: false, toolName: null, message: null});

  // Funzione per mostrare l'alert informativo
  const showToolInfoAlert = (toolName: string) => {
    let messageText = '';
    switch (toolName) {
      case 'Pianificatore Attività':
        messageText = "Per usare il Pianificatore, trova un'attività che ti piace e clicca sull'icona 'Pianifica' (un calendario con un '+') sulla sua scheda. Potrai aggiungerla al tuo programma personale!";
        break;
      case 'Meteo Matcher':
        messageText = "Per usare il Meteo Matcher, clicca sull'icona 'Meteo-Match' (una nuvola) sulla scheda di un'attività. L'IA analizzerà la compatibilità con il meteo attuale e futuro!";
        break;
      case 'Social & Community':
        messageText = "Per esplorare le funzionalità Social, clicca sull'icona 'Social' (un gruppo di persone) sulla scheda di un'attività. Potrai vedere chi altro è interessato, unirti a gruppi o condividere!";
        break;
      default:
        messageText = `Usa i pulsanti dedicati sulle schede attività per accedere a questa funzionalità innovativa.`;
    }
    setToolInfoAlert({
      show: true,
      toolName: toolName,
      message: messageText
    });
  };

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
    <div className="flex flex-col min-h-screen overflow-y-auto overflow-x-hidden pb-20 h-full">
      <div className="container mx-auto px-4 py-4 flex-1 overflow-visible">
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

        {/* Sezione Strumenti Innovativi */}
        {!isLoading && !error && !showMap && weatherData && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Potenzia la Tua Esperienza ✨</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center mb-1.5">
                    <FontAwesomeIcon icon={faCalendarPlus} className="text-blue-500 text-xl mr-2.5" />
                    <h3 className="font-medium text-gray-700">Pianifica Attività</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2.5">Organizza le tue giornate e non perderti nessun evento.</p>
                </div>
                <IonButton size="small" expand="block" fill="outline" color="primary" onClick={() => showToolInfoAlert('Pianificatore Attività')}>
                    Scopri Come
                </IonButton>
              </div>
              
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center mb-1.5">
                    <FontAwesomeIcon icon={faCloudSun} className="text-orange-500 text-xl mr-2.5" />
                    <h3 className="font-medium text-gray-700">Meteo Matcher</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2.5">Trova l'attività perfetta per il meteo o il momento migliore.</p>
                </div>
                <IonButton size="small" expand="block" fill="outline" color="warning" onClick={() => showToolInfoAlert('Meteo Matcher')}>
                    Scopri Come
                </IonButton>
              </div>
              
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center mb-1.5">
                    <FontAwesomeIcon icon={faUsers} className="text-green-500 text-xl mr-2.5" />
                    <h3 className="font-medium text-gray-700">Social & Community</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-2.5">Condividi avventure, trova compagni e scopri trend locali.</p>
                </div>
                <IonButton size="small" expand="block" fill="outline" color="success" onClick={() => showToolInfoAlert('Social & Community')}>
                    Scopri Come
                </IonButton>
              </div>
            </div>
          </div>
        )}

        {/* Widget Giro Esplorativo Improvvisato */}
        {!isLoading && !error && !showMap && weatherData && (
          <SpontaneousExplorerWidget 
            userCoords={{ latitude: weatherData.lat, longitude: weatherData.lon } as GeoCoords} 
            className="mt-6 mb-4"
          />
        )}

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

        <IonAlert
          isOpen={toolInfoAlert.show}
          onDidDismiss={() => setToolInfoAlert({show: false, toolName: null, message: null})}
          header={toolInfoAlert.toolName || 'Informazione Strumento'}
          message={toolInfoAlert.message || ''}
          buttons={['OK']}
          cssClass='custom-alert-innovative-tools'
        />
      </div>
    </div>
  );
};

export default Activities;
