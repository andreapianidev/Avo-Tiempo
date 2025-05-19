import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, faSun, faCloudSun, faCloudRain, 
  faSnowflake, faWind, faUmbrellaBeach, faCoffee, 
  faUtensils, faStore, faTree, faWater, faMonument, faMuseum, 
  faSwimmingPool, faBeer, faSpinner, faMountainSun, faShoppingBag,
  faHiking, faLandmark, faBinoculars, faAnchor, faStar,
  faCamera, faShip, faIceCream, faBook, faTheaterMasks, faPizzaSlice,
  faChevronDown, faChevronUp, faMapMarkedAlt, faMoon,
  faCloudMoon, faClock, faMountain, faPlus, faSearchPlus
} from '@fortawesome/free-solid-svg-icons';
import { POI, osmService } from '../services/osmService';
import { getAIInsight } from '../services/aiService';

interface WeatherBasedPOIRecommendationsProps {
  location: string;
  lat: number;
  lon: number;
  temperature: number;
  condition: string;
  time: Date;
  radius?: number;
  className?: string;
}

const WeatherBasedPOIRecommendations: React.FC<WeatherBasedPOIRecommendationsProps> = ({
  location,
  lat,
  lon,
  temperature,
  condition,
  time = new Date(),
  radius = 10000,
  className = ''
}) => {
  const [allPois, setAllPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [radiusValue, setRadiusValue] = useState<number>(radius);
  const [activeTab, setActiveTab] = useState<'all' | 'food' | 'attractions' | 'services' | 'nature' | 'map'>('all');
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [loadMoreCount, setLoadMoreCount] = useState<number>(10); // Numero di POI da mostrare inizialmente per categoria
  
  // Definizioni per il time-of-day
  const hourOfDay = time.getHours();
  const isMorning = hourOfDay >= 6 && hourOfDay < 12;
  const isAfternoon = hourOfDay >= 12 && hourOfDay < 18;
  const isEvening = hourOfDay >= 18 && hourOfDay < 22;
  const isNight = hourOfDay >= 22 || hourOfDay < 6;
  
  // Condizioni meteo mappate a categorie più generali
  const weatherType = useMemo(() => {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('rain') || conditionLower.includes('shower') || conditionLower.includes('thunderstorm') || conditionLower.includes('drizzle')) {
      return 'rainy';
    } else if (conditionLower.includes('snow') || conditionLower.includes('sleet') || conditionLower.includes('ice')) {
      return 'snowy';
    } else if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      return 'sunny';
    } else if (conditionLower.includes('cloud') || conditionLower.includes('overcast') || conditionLower.includes('mist') || conditionLower.includes('fog')) {
      return 'cloudy';
    } else if (conditionLower.includes('wind') || conditionLower.includes('storm') || conditionLower.includes('gust')) {
      return 'windy';
    }
    
    // Fallback
    return 'default';
  }, [condition]);
  
  // Temperatura categorizzata
  const temperatureType = useMemo(() => {
    if (temperature >= 30) return 'very-hot';
    if (temperature >= 25) return 'hot';
    if (temperature >= 18) return 'warm';
    if (temperature >= 10) return 'mild';
    if (temperature >= 0) return 'cool';
    return 'cold';
  }, [temperature]);

  // Combinazioni di categorie di POI consigliate in base a meteo e ora
  const suggestedCategories = useMemo(() => {
    // Mapping delle categorie POI consigliate per ogni combinazione di meteo e ora
    const categoryMap: Record<string, Record<string, string[]>> = {
      'sunny': {
        'morning': ['natural', 'hiking', 'leisure', 'beach', 'viewpoint'],
        'afternoon': ['beach', 'tourism', 'natural', 'leisure', 'viewpoint'],
        'evening': ['restaurant', 'bar', 'viewpoint', 'leisure'],
        'night': ['bar', 'restaurant', 'nightlife', 'amenity']
      },
      'cloudy': {
        'morning': ['museum', 'tourism', 'shopping', 'cafe'],
        'afternoon': ['tourism', 'museum', 'shopping', 'leisure', 'restaurant'],
        'evening': ['restaurant', 'cinema', 'bar', 'leisure'],
        'night': ['bar', 'nightlife', 'restaurant', 'amenity']
      },
      'rainy': {
        'morning': ['museum', 'cafe', 'shopping', 'amenity'],
        'afternoon': ['museum', 'shopping', 'leisure-indoor', 'cinema', 'restaurant'],
        'evening': ['restaurant', 'cinema', 'bar', 'leisure-indoor'],
        'night': ['bar', 'nightlife', 'restaurant', 'amenity-indoor']
      },
      'snowy': {
        'morning': ['cafe', 'viewpoint', 'leisure-winter', 'amenity'],
        'afternoon': ['leisure-winter', 'cafe', 'viewpoint', 'amenity'],
        'evening': ['restaurant', 'cafe', 'amenity', 'bar'],
        'night': ['bar', 'restaurant', 'amenity', 'hotel']
      },
      'windy': {
        'morning': ['museum', 'cafe', 'shopping', 'amenity-indoor'],
        'afternoon': ['museum', 'shopping', 'restaurant', 'amenity-indoor'],
        'evening': ['restaurant', 'cinema', 'amenity-indoor', 'bar'],
        'night': ['bar', 'restaurant', 'nightlife', 'amenity-indoor']
      }
    };
    
    // Determina il periodo del giorno
    let timeOfDay = 'afternoon';
    if (isMorning) timeOfDay = 'morning';
    else if (isEvening) timeOfDay = 'evening';
    else if (isNight) timeOfDay = 'night';
    
    // Prendi le categorie consigliate per questo meteo e orario
    return categoryMap[weatherType]?.[timeOfDay] || ['restaurant', 'tourism', 'leisure', 'natural'];
  }, [weatherType, isMorning, isAfternoon, isEvening, isNight]);
  
  // Filter POIs based on the current weather condition and time of day
  const filteredPois = useMemo(() => {
    if (!selectedCategory) {
      // Per la vista "Tutti", mostriamo solo i POI delle categorie suggerite
      return allPois.filter(poi => {
        // Controlla se la categoria o il tipo del POI è in suggestedCategories
        return suggestedCategories.some(cat => 
          poi.category === cat || poi.type === cat || 
          // Per gestire categorie composte come "leisure-indoor"
          (cat.includes('-') && poi.category === cat.split('-')[0] && poi.type.includes(cat.split('-')[1]))
        );
      }).slice(0, 30); // Limita a 30 POI per performance
    }
    
    return allPois.filter(poi => poi.category === selectedCategory)
      .slice(0, 30); // Limita a 30 POI per performance
  }, [allPois, selectedCategory, suggestedCategories]);
  
  // Raggruppa i POI per tipo
  const poisByType = useMemo(() => {
    const grouped: Record<string, POI[]> = {};
    
    filteredPois.forEach(poi => {
      const key = poi.type || 'other';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(poi);
    });
    
    return grouped;
  }, [filteredPois]);
  
  // Funzione per caricare più POI
  const loadMorePOIs = () => {
    setLoadMoreCount(prev => prev + 10);
  };
  
  // Carica i POI in base alla posizione
  useEffect(() => {
    const fetchPOIs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const pois = await osmService.getPOIs(lat, lon, radiusValue);
        setAllPois(pois);
        console.log(`[WeatherBasedPOIRecommendations] Caricati ${pois.length} POI nel raggio di ${radiusValue/1000}km`);
        
        // Genera una raccomandazione AI
        let weather = condition;
        let temp = temperature;
        let timeStr = isMorning ? "mattina" : isAfternoon ? "pomeriggio" : isEvening ? "sera" : "notte";
        
        // Per l'AI Insight generiamo la stringa di prompt
        const customPrompt = `Dammi consigli divertenti su cosa fare a ${location} di ${timeStr} con ${weather} e ${temp}°C. Suggerisci 2-3 luoghi specifici tra i POI. Tono umoristico in stile canaro.`;
        
        // Chiamiamo la funzione con il prompt personalizzato
        const insight = await getAIInsight(
          location,
          weather,
          temp,
          [], // No alerts
          pois.slice(0, 10) // Prime 10 POI
        );
        
        setAiRecommendation(insight);
      } catch (err) {
        console.error('Error fetching POIs:', err);
        setError('Impossibile caricare i punti di interesse. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPOIs();
  }, [lat, lon, radiusValue, location, condition, temperature, isMorning, isAfternoon, isEvening]);
  
  // Icona per le condizioni meteo
  const weatherIcon = useMemo(() => {
    switch (weatherType) {
      case 'sunny': return faSun;
      case 'cloudy': return faCloudSun;
      case 'rainy': return faCloudRain;
      case 'snowy': return faSnowflake;
      case 'windy': return faWind;
      default: return faSun;
    }
  }, [weatherType]);
  
  // Icona per l'ora del giorno
  const timeIcon = useMemo(() => {
    if (isMorning) return faSun; // Alba (sostituiamo con icona del sole)
    if (isAfternoon) return faSun; // Sole pieno
    if (isEvening) return faMoon; // Tramonto (sostituiamo con icona della luna)
    return faCloudMoon; // Notte
  }, [isMorning, isAfternoon, isEvening]);
  
  // Ottieni l'icona giusta per un tipo di POI
  const getPoiTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      'restaurant': faUtensils,
      'cafe': faCoffee,
      'bar': faBeer,
      'pub': faBeer,
      'beach': faUmbrellaBeach,
      'museum': faMuseum,
      'monument': faMonument,
      'viewpoint': faBinoculars,
      'park': faTree,
      'water': faWater,
      'shop': faStore,
      'mall': faShoppingBag,
      'hiking': faHiking,
      'swimming': faSwimmingPool,
      'historic': faLandmark,
      'castle': faLandmark,
      'church': faLandmark,
      'water_sports': faAnchor,
      'photography': faCamera,
      'boat': faShip,
      'ferry': faShip,
      'ice_cream': faIceCream,
      'library': faBook,
      'theatre': faTheaterMasks,
      'pizza': faPizzaSlice
    };
    
    return iconMap[type] || faMapMarkerAlt;
  };
  
  // Formatta la distanza in modo leggibile
  const formatDistance = (distance: number): string => {
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };
  
  // Ritorna il nome "amichevole" per un tipo di POI
  const getPoiTypeName = (type: string): string => {
    const nameMap: Record<string, string> = {
      'restaurant': 'Ristoranti',
      'cafe': 'Caffè',
      'bar': 'Bar',
      'pub': 'Pub',
      'beach': 'Spiagge',
      'museum': 'Musei',
      'monument': 'Monumenti',
      'viewpoint': 'Panorami',
      'park': 'Parchi',
      'water': 'Luoghi d\'acqua',
      'shop': 'Negozi',
      'mall': 'Centri commerciali',
      'hiking': 'Sentieri',
      'swimming': 'Piscine',
      'historic': 'Luoghi storici',
      'castle': 'Castelli',
      'church': 'Chiese',
      'water_sports': 'Sport acquatici',
      'supermarket': 'Supermercati',
      'fast_food': 'Fast food',
      'hotel': 'Hotel',
      'tourist_attraction': 'Attrazioni turistiche',
      'artwork': 'Opere d\'arte'
    };
    
    return nameMap[type] || type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };
  
  // Nome della categoria corrente
  const getCategoryName = (category: string): string => {
    const categoryNames: Record<string, string> = {
      'tourism': 'Turismo',
      'natural': 'Natura',
      'leisure': 'Svago',
      'amenity': 'Servizi',
      'shop': 'Shopping',
      'restaurant': 'Ristoranti',
      'beach': 'Spiagge',
      'viewpoint': 'Panorami',
      'museum': 'Musei',
      'bar': 'Bar',
      'hiking': 'Escursioni'
    };
    
    return categoryNames[category] || category;
  };
  
  // Categorie disponibili dai POI caricati
  const availableCategories = useMemo(() => {
    const categories = Array.from(new Set(allPois.map(poi => poi.category)));
    return categories.sort();
  }, [allPois]);
  
  // Mappatura delle categorie principali
  const mainCategories = useMemo(() => {
    return {
      food: ['amenity'],
      attractions: ['tourism', 'historic'],
      services: ['shop', 'healthcare', 'emergency'],
      nature: ['natural', 'leisure']
    };
  }, []);
  
  // Filtraggio POI per tab principale
  const getTabPOIs = (tab: 'all' | 'food' | 'attractions' | 'services' | 'nature') => {
    if (tab === 'all') return filteredPois;
    
    return filteredPois.filter(poi => {
      return mainCategories[tab].includes(poi.category) ||
        // Casi specifici per amenity
        (tab === 'food' && poi.category === 'amenity' && 
         ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'ice_cream'].includes(poi.type)) ||
        (tab === 'services' && poi.category === 'amenity' && 
         ['pharmacy', 'hospital', 'bank', 'fuel', 'police'].includes(poi.type)) ||
        (tab === 'attractions' && poi.category === 'amenity' && 
         ['theatre', 'cinema', 'arts_centre', 'place_of_worship'].includes(poi.type));
    });
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={`py-4 text-center ${className}`}>
        <FontAwesomeIcon icon={faSpinner} spin className="text-amber-500 text-xl" />
        <p className="mt-2 text-gray-600">Ricerca punti di interesse nelle vicinanze...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`py-4 ${className}`}>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (filteredPois.length === 0) {
    return (
      <div className={`py-4 ${className}`}>
        <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
          <FontAwesomeIcon icon={faMapMarkerAlt} className="text-amber-500 text-xl mb-2" />
          <p className="text-gray-700">Nessun punto di interesse trovato in questa zona con queste condizioni.</p>
          
          <div className="mt-4 flex justify-center">
            <div className="flex items-center space-x-2">
              <label htmlFor="poi-radius-selector" className="text-sm text-gray-700">Raggio:</label>
              <select 
                id="poi-radius-selector"
                value={radiusValue}
                onChange={(e) => setRadiusValue(Number(e.target.value))}
                className="py-1 px-2 text-sm border border-gray-300 rounded"
              >
                <option value="2000">2 km</option>
                <option value="5000">5 km</option>
                <option value="10000">10 km</option>
                <option value="15000">15 km</option>
                <option value="20000">20 km</option>
                <option value="30000">30 km</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`weather-based-poi-recommendations ${className}`}>
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h2 className="text-xl font-semibold flex items-center">
          <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-[var(--color-highlight)]" />
          Consigli in base al meteo
        </h2>
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-gray-500" />
      </div>
      
      {expanded && (
        <div className="poi-content">
          {/* Indicatori del contesto */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <FontAwesomeIcon icon={weatherIcon} className="mr-2 text-[var(--color-highlight)]" />
                <span className="text-sm">{condition}</span>
              </div>
              <div className="flex items-center">
                <FontAwesomeIcon icon={timeIcon} className="mr-2 text-[var(--color-highlight)]" />
                <span className="text-sm">
                  {isMorning ? 'Mattina' : isAfternoon ? 'Pomeriggio' : isEvening ? 'Sera' : 'Notte'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="poi-radius-selector" className="text-sm text-gray-700">Raggio:</label>
              <select 
                id="poi-radius-selector"
                value={radiusValue}
                onChange={(e) => setRadiusValue(Number(e.target.value))}
                className="py-1 px-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="2000">2 km</option>
                <option value="5000">5 km</option>
                <option value="10000">10 km</option>
                <option value="15000">15 km</option>
                <option value="20000">20 km</option>
                <option value="30000">30 km</option>
              </select>
            </div>
          </div>
          
          {/* Raccomandazione AI */}
          {aiRecommendation && (
            <div className="mb-6 p-4 bg-[var(--color-highlight-light)] rounded-lg border border-[var(--color-highlight-border)]">
              <div className="flex">
                <div className="flex-shrink-0 text-[var(--color-highlight)] mr-3">
                  <FontAwesomeIcon icon={faStar} />
                </div>
                <p className="text-[var(--color-text-primary)]">{aiRecommendation}</p>
              </div>
            </div>
          )}
          
          {/* Tab principali per categorie */}
          <div className="flex mb-4 border-b border-gray-200 overflow-x-auto">
            <button
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${activeTab === 'all' ? 'border-[var(--color-highlight)] text-[var(--color-highlight)] font-medium' : 'border-transparent'}`}
              onClick={() => setActiveTab('all')}
            >
              <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2" /> Tutti i POI
            </button>
            <button
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${activeTab === 'food' ? 'border-[var(--color-highlight)] text-[var(--color-highlight)] font-medium' : 'border-transparent'}`}
              onClick={() => setActiveTab('food')}
            >
              <FontAwesomeIcon icon={faUtensils} className="mr-2" /> Ristoranti e Bar
            </button>
            <button
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${activeTab === 'attractions' ? 'border-[var(--color-highlight)] text-[var(--color-highlight)] font-medium' : 'border-transparent'}`}
              onClick={() => setActiveTab('attractions')}
            >
              <FontAwesomeIcon icon={faLandmark} className="mr-2" /> Attrazioni
            </button>
            <button
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${activeTab === 'nature' ? 'border-[var(--color-highlight)] text-[var(--color-highlight)] font-medium' : 'border-transparent'}`}
              onClick={() => setActiveTab('nature')}
            >
              <FontAwesomeIcon icon={faTree} className="mr-2" /> Natura
            </button>
            <button
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${activeTab === 'services' ? 'border-[var(--color-highlight)] text-[var(--color-highlight)] font-medium' : 'border-transparent'}`}
              onClick={() => setActiveTab('services')}
            >
              <FontAwesomeIcon icon={faStore} className="mr-2" /> Servizi
            </button>
            <button
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${activeTab === 'map' ? 'border-[var(--color-highlight)] text-[var(--color-highlight)] font-medium' : 'border-transparent'}`}
              onClick={() => setActiveTab('map')}
            >
              <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" /> Mappa
            </button>
          </div>
          
          {/* Filtri secondari */}
          <div className="flex flex-wrap justify-between mb-4">
            {/* Filtro per categoria dettagliata */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 flex-1">
              <button
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                  selectedCategory === null
                    ? 'bg-[var(--color-highlight)] text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setSelectedCategory(null)}
              >
                Tutti
              </button>
              
              {availableCategories.map(category => (
                <button
                  key={category}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-[var(--color-highlight)] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {getCategoryName(category)}
                </button>
              ))}
            </div>
            
            {/* Filtro per distanza */}
            <div className="flex items-center ml-2">
              <span className="text-sm mr-2">Distanza:</span>
              <select 
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                value={distanceFilter || ''}
                onChange={(e) => setDistanceFilter(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Qualsiasi</option>
                <option value="1000">Entro 1 km</option>
                <option value="3000">Entro 3 km</option>
                <option value="5000">Entro 5 km</option>
                <option value="10000">Entro 10 km</option>
              </select>
            </div>
          </div>
          
          {/* Vista a mappa */}
          {activeTab === 'map' ? (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <p className="mb-3">Visualizzazione mappa dei POI disponibili:</p>
              <div 
                className="h-64 bg-gray-100 rounded flex items-center justify-center cursor-pointer"
                onClick={() => window.open(`https://www.google.com/maps/search/points+of+interest/@${lat},${lon},14z`, '_blank')}
              >
                <div className="text-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-3xl text-[var(--color-highlight)] mb-2" />
                  <p>Clicca per visualizzare i punti di interesse su Google Maps</p>
                  <p className="text-xs mt-1 text-gray-500">{filteredPois.length} POI disponibili in questa zona</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Se non ci sono POI in questa tab */}
              {getTabPOIs(activeTab).length === 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-2xl text-gray-400 mb-2" />
                  <p className="text-gray-600 mb-2">Nessun punto di interesse trovato in questa categoria</p>
                  <p className="text-sm text-gray-500">Prova a cambiare categoria o ad aumentare il raggio di ricerca</p>
                  <button 
                    className="mt-3 px-4 py-2 bg-[var(--color-highlight)] text-white rounded hover:bg-[var(--color-highlight-dark)] transition-colors"
                    onClick={() => setRadiusValue(radiusValue + 5000)}
                  >
                    <FontAwesomeIcon icon={faSearchPlus} className="mr-2" />
                    Aumenta raggio a {(radiusValue + 5000) / 1000} km
                  </button>
                </div>
              )}
              
              {/* Raggruppa POI per tipo */}
              {Object.entries(poisByType)
                .filter(([_, pois]) => getTabPOIs(activeTab).some(p => pois.includes(p)))
                .map(([type, pois]) => {
                  // Filtra i POI per questo tipo che appartengono alla tab attiva
                  const tabFilteredPois = pois.filter(p => getTabPOIs(activeTab).includes(p));
                  
                  // Filtra per distanza se il filtro è attivo
                  const distanceFilteredPois = distanceFilter ? 
                    tabFilteredPois.filter(p => p.distance <= distanceFilter) : 
                    tabFilteredPois;
                    
                  if (distanceFilteredPois.length === 0) return null;
                  
                  return (
                    <div key={type} className="poi-type-group">
                      <h3 className="font-medium text-[var(--color-text-primary)] mb-2 flex items-center">
                        <FontAwesomeIcon icon={getPoiTypeIcon(type)} className="mr-2 text-[var(--color-highlight)]" />
                        {getPoiTypeName(type)} ({distanceFilteredPois.length})
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {distanceFilteredPois.slice(0, loadMoreCount).map(poi => (
                          <div 
                            key={poi.id} 
                            className="bg-white p-3 rounded-lg shadow-sm flex items-center border border-gray-100 hover:border-[var(--color-highlight-border)] transition-colors"
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`, '_blank')}
                          >
                            <div className="mr-3 w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-highlight-light)]">
                              <FontAwesomeIcon icon={getPoiTypeIcon(poi.type)} className="text-[var(--color-highlight)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[var(--color-text-primary)] truncate">{poi.name}</h4>
                              <p className="text-xs text-[var(--color-text-secondary)]">{poi.type.replace('_', ' ')}</p>
                            </div>
                            <div className="text-xs font-medium text-[var(--color-text-secondary)]">
                              {formatDistance(poi.distance)}
                            </div>
                          </div>
                        ))}
                        
                        {/* Pulsante per caricare altri POI */}
                        {distanceFilteredPois.length > loadMoreCount && (
                          <button 
                            className="text-[var(--color-highlight)] font-medium text-sm p-3 border border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50"
                            onClick={loadMorePOIs}
                          >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            Mostra altri {distanceFilteredPois.length - loadMoreCount} POI
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
          
          {/* Nota informativa sulla fonte dei dati */}
          <div className="text-xs text-gray-500 mt-4">
            Dati forniti da <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-[var(--color-highlight)] hover:underline">OpenStreetMap</a>.
            Le distanze sono calcolate in linea d'aria dalla posizione attuale.
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherBasedPOIRecommendations;
