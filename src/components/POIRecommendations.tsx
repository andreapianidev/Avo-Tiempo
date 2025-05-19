import React, { useState, useEffect } from 'react';
import { POI } from '../services/osmService';
import { WeatherData } from '../services/weatherService';
import { getTopRatedPOIs } from '../utils/poiAnalytics';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faCloudSun, faCloud, faCloudRain, faWind, faUmbrella, faHiking, faSwimmer, faBiking, faIceCream, faCamera, faShoppingBag, faBinoculars, faTree, faStore, faShoppingCart } from '@fortawesome/free-solid-svg-icons';

interface POIRecommendationsProps {
  pois: POI[];
  weatherData?: WeatherData;
}

interface ActivityRecommendation {
  activity: string;
  icon: any;
  score: number;
  recommendedPOIs: POI[];
  description: string;
}

const POIRecommendations: React.FC<POIRecommendationsProps> = ({ pois, weatherData }) => {
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([]);

  useEffect(() => {
    if (pois.length > 0 && weatherData) {
      generateRecommendations();
    }
  }, [pois, weatherData]);

  // Genera raccomandazioni in base al meteo e ai POI disponibili
  const generateRecommendations = () => {
    if (!weatherData) return;
    
    const temp = weatherData.temperature;
    const condition = weatherData.condition.toLowerCase();
    const windSpeed = weatherData.windSpeed || 0;
    const humidity = weatherData.humidity || 50;
    const uvIndex = weatherData.uvIndex || 5;
    // Calcoliamo una probabilità di precipitazioni in base ai dati disponibili
    const precipProbability = weatherData.rain1h ? Math.min(1, weatherData.rain1h / 10) : 0;

    // Calcola punteggi per diverse attività
    const hikingScore = calculateHikingScore(temp, condition, windSpeed, precipProbability);
    const beachScore = calculateBeachScore(temp, condition, windSpeed, uvIndex);
    const sightseeingScore = calculateSightseeingScore(temp, condition, precipProbability);
    const bikingScore = calculateBikingScore(temp, condition, windSpeed, precipProbability);
    const outdoorDiningScore = calculateOutdoorDiningScore(temp, condition, windSpeed, precipProbability);
    const natureWatchingScore = calculateNatureWatchingScore(temp, condition, windSpeed, precipProbability);
    const shoppingScore = calculateShoppingScore(temp, condition, precipProbability);

    // Filtra POI per tipo di attività
    const hikingPOIs = pois.filter(poi => 
      poi.type === 'hiking' || 
      poi.category === 'natural' || 
      poi.tags.natural === 'peak' ||
      poi.tags.tourism === 'viewpoint'
    );
    
    const beachPOIs = pois.filter(poi => 
      poi.type === 'beach' || 
      poi.tags.natural === 'beach' || 
      poi.tags.leisure === 'beach_resort'
    );
    
    const sightseeingPOIs = pois.filter(poi => 
      poi.category === 'tourism' || 
      poi.tags.tourism === 'attraction' || 
      poi.tags.tourism === 'museum' ||
      poi.tags.historic === 'monument'
    );
    
    const bikingPOIs = pois.filter(poi => 
      poi.type === 'cycling' || 
      poi.tags.route === 'bicycle' ||
      poi.tags.leisure === 'park'
    );
    
    const diningPOIs = pois.filter(poi => 
      poi.category === 'amenity' && 
      (poi.tags.amenity === 'restaurant' || 
       poi.tags.amenity === 'cafe' || 
       poi.tags.amenity === 'bar' ||
       poi.tags.amenity === 'ice_cream')
    );
    
    const natureWatchingPOIs = pois.filter(poi => 
      poi.category === 'natural' || 
      poi.tags.natural || 
      poi.tags.leisure === 'park' ||
      poi.tags.tourism === 'viewpoint' ||
      poi.type === 'park' ||
      poi.type === 'forest'
    );
    
    const shoppingPOIs = pois.filter(poi => 
      poi.category === 'shop' || 
      poi.tags.shop || 
      poi.tags.amenity === 'marketplace' ||
      poi.type === 'mall' ||
      poi.type === 'market'
    );

    // Crea le raccomandazioni
    const newRecommendations: ActivityRecommendation[] = [
      {
        activity: 'Escursionismo',
        icon: faHiking,
        score: hikingScore,
        recommendedPOIs: getTopRatedPOIs(hikingPOIs, 3),
        description: getHikingDescription(hikingScore, condition)
      },
      {
        activity: 'Spiaggia',
        icon: faSwimmer,
        score: beachScore,
        recommendedPOIs: getTopRatedPOIs(beachPOIs, 3),
        description: getBeachDescription(beachScore, condition)
      },
      {
        activity: 'Turismo',
        icon: faCamera,
        score: sightseeingScore,
        recommendedPOIs: getTopRatedPOIs(sightseeingPOIs, 3),
        description: getSightseeingDescription(sightseeingScore, condition)
      },
      {
        activity: 'Ciclismo',
        icon: faBiking,
        score: bikingScore,
        recommendedPOIs: getTopRatedPOIs(bikingPOIs, 3),
        description: getBikingDescription(bikingScore, condition)
      },
      {
        activity: 'Gastronomia',
        icon: faIceCream,
        score: outdoorDiningScore,
        recommendedPOIs: getTopRatedPOIs(diningPOIs, 3),
        description: getDiningDescription(outdoorDiningScore, condition)
      },
      {
        activity: 'Natura & Fotografia',
        icon: faBinoculars,
        score: natureWatchingScore,
        recommendedPOIs: getTopRatedPOIs(natureWatchingPOIs, 3),
        description: getNatureWatchingDescription(natureWatchingScore, condition)
      },
      {
        activity: 'Shopping & Mercatini',
        icon: faShoppingBag,
        score: shoppingScore,
        recommendedPOIs: getTopRatedPOIs(shoppingPOIs, 3),
        description: getShoppingDescription(shoppingScore, condition)
      }
    ];

    // Ordina per punteggio decrescente
    newRecommendations.sort((a, b) => b.score - a.score);
    setRecommendations(newRecommendations);
  };

  // Funzioni per calcolare i punteggi delle attività
  const calculateHikingScore = (temp: number, condition: string, windSpeed: number, precipProbability: number): number => {
    let score = 100;
    
    // Penalità per temperature estreme
    if (temp < 10) score -= (10 - temp) * 3;
    if (temp > 28) score -= (temp - 28) * 5;
    
    // Penalità per condizioni meteo avverse
    if (condition.includes('rain')) score -= 40;
    if (condition.includes('storm')) score -= 80;
    if (condition.includes('snow')) score -= 30;
    if (condition.includes('fog')) score -= 20;
    if (condition.includes('cloud')) score -= 10;
    
    // Penalità per vento forte
    if (windSpeed > 20) score -= (windSpeed - 20) * 2;
    
    // Penalità per probabilità di precipitazioni
    score -= precipProbability * 50;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateBeachScore = (temp: number, condition: string, windSpeed: number, uvIndex: number): number => {
    let score = 100;
    
    // Penalità per temperature basse
    if (temp < 22) score -= (22 - temp) * 5;
    
    // Penalità per condizioni meteo avverse
    if (condition.includes('rain')) score -= 70;
    if (condition.includes('storm')) score -= 90;
    if (condition.includes('cloud')) score -= 30;
    
    // Penalità per vento forte
    if (windSpeed > 15) score -= (windSpeed - 15) * 3;
    
    // Penalità per UV estremo
    if (uvIndex > 8) score -= (uvIndex - 8) * 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateSightseeingScore = (temp: number, condition: string, precipProbability: number): number => {
    let score = 100;
    
    // Penalità per temperature estreme
    if (temp < 10) score -= (10 - temp) * 2;
    if (temp > 32) score -= (temp - 32) * 3;
    
    // Penalità per condizioni meteo avverse
    if (condition.includes('rain')) score -= 30;
    if (condition.includes('storm')) score -= 60;
    if (condition.includes('fog')) score -= 40;
    
    // Penalità per probabilità di precipitazioni
    score -= precipProbability * 40;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateBikingScore = (temp: number, condition: string, windSpeed: number, precipProbability: number): number => {
    let score = 100;
    
    // Penalità per temperature estreme
    if (temp < 12) score -= (12 - temp) * 3;
    if (temp > 30) score -= (temp - 30) * 4;
    
    // Penalità per condizioni meteo avverse
    if (condition.includes('rain')) score -= 60;
    if (condition.includes('storm')) score -= 90;
    if (condition.includes('fog')) score -= 30;
    
    // Penalità per vento forte
    if (windSpeed > 15) score -= (windSpeed - 15) * 4;
    
    // Penalità per probabilità di precipitazioni
    score -= precipProbability * 60;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateOutdoorDiningScore = (temp: number, condition: string, windSpeed: number, precipProbability: number): number => {
    let score = 100;
    
    // Penalità per temperature estreme
    if (temp < 15) score -= (15 - temp) * 4;
    if (temp > 32) score -= (temp - 32) * 3;
    
    // Penalità per condizioni meteo avverse
    if (condition.includes('rain')) score -= 70;
    if (condition.includes('storm')) score -= 90;
    if (condition.includes('fog')) score -= 10;
    if (condition.includes('cloud')) score -= 5;
    
    // Penalità per vento forte
    if (windSpeed > 10) score -= (windSpeed - 10) * 5;
    
    // Penalità per probabilità di precipitazioni
    score -= precipProbability * 70;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateNatureWatchingScore = (temp: number, condition: string, windSpeed: number, precipProbability: number): number => {
    let score = 100;
    
    // Penalità per temperature estreme
    if (temp < 8) score -= (8 - temp) * 3;
    if (temp > 32) score -= (temp - 32) * 2;
    
    // Penalità per condizioni meteo avverse
    if (condition.includes('rain')) score -= 50;
    if (condition.includes('storm')) score -= 70;
    if (condition.includes('fog')) score -= 30; // La nebbia può essere suggestiva per fotografia
    
    // Penalità per vento forte (problematico per l'osservazione)
    if (windSpeed > 25) score -= (windSpeed - 25) * 3;
    
    // Penalità per probabilità di precipitazioni
    score -= precipProbability * 50;
    
    // Bonus per condizioni che possono essere suggestive
    if (condition.includes('clear') || condition.includes('partly cloudy')) score += 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateShoppingScore = (temp: number, condition: string, precipProbability: number): number => {
    let score = 100;
    
    // Per lo shopping, temperature estreme sono meno rilevanti ma comunque un fattore
    if (temp < 12) score -= (12 - temp) * 2;
    if (temp > 35) score -= (temp - 35) * 3;
    
    // Penalità per condizioni meteo avverse (più rilevanti per mercatini all'aperto)
    if (condition.includes('rain')) score -= 60;
    if (condition.includes('storm')) score -= 80;
    
    // Probabilità di precipitazioni (impatta principalmente mercatini all'aperto)
    score -= precipProbability * 40;
    
    // Bonus per lo shopping indoor rispetto alla pioggia
    if (condition.includes('rain') || condition.includes('storm')) {
      // La pioggia è meno problematica per lo shopping nei negozi al chiuso
      score += 20; // Compensa parzialmente le penalità per la pioggia
    }
    
    return Math.max(0, Math.min(100, score));
  };

  // Funzioni per generare descrizioni in stile canaro
  const getHikingDescription = (score: number, condition: string): string => {
    if (score > 80) return "Mamma mia che giornata perfetta per fare un'escursione! Le montagne ti aspettano, cumpà!";
    if (score > 60) return "Buona giornata per camminare, ma porta una giacchetta che non si sa mai, oh!";
    if (score > 40) return "Meh, non è il massimo per fare trekking oggi. Meglio un giro corto corto, capito?";
    return "Scordatelo proprio di andare in montagna oggi, guagliò! Resta a casa che è meglio!";
  };

  const getBeachDescription = (score: number, condition: string): string => {
    if (score > 80) return "Che spettacolo di giornata! Prendi l'asciugamano e corri in spiaggia, è perfetta!";
    if (score > 60) return "Si può fare un bagno, ma non è proprio da cartolina. Portati un libro va!";
    if (score > 40) return "Mah, la spiaggia oggi è un po' cosí cosí. Magari solo per una passeggiata, eh?";
    return "Lascia perdere la spiaggia oggi, a meno che non ti piaccia il brivido! Che sfaccimm' di tempo!";
  };

  const getSightseeingDescription = (score: number, condition: string): string => {
    if (score > 80) return "Giornata perfetta per fare il turista! Prendi la macchina fotografica e vai a esplorare!";
    if (score > 60) return "Si può fare un giro turistico, ma tieni d'occhio il cielo che non si sa mai!";
    if (score > 40) return "Non è proprio il massimo per fare il turista oggi, ma se proprio devi...";
    return "Oggi è meglio visitare un museo al chiuso, fidati! Fuori è una schifezza!";
  };

  const getBikingDescription = (score: number, condition: string): string => {
    if (score > 80) return "Che giornata spettacolare per pedalare! Metti l'olio alla catena e parti!";
    if (score > 60) return "Si può fare un giro in bici, ma non allontanarti troppo che il tempo è ballerino!";
    if (score > 40) return "Mmmm, per la bici oggi è così così. Magari un giretto corto corto?";
    return "Lascia proprio perdere la bici oggi! È una giornata da divano e Netflix, credimi!";
  };

  const getDiningDescription = (score: number, condition: string): string => {
    if (score > 80) return "Che meraviglia! Giornata perfetta per mangiare all'aperto. Prenota un tavolo vista mare!";
    if (score > 60) return "Si può mangiare fuori, ma magari scegli un posto con tettoia, non si sa mai!";
    if (score > 40) return "Mmmm, meglio un locale con posti al chiuso oggi, il tempo è un po' ballerino!";
    return "Scordati proprio di mangiare all'aperto oggi! Ordina a domicilio e stai al calduccio!";
  };

  const getNatureWatchingDescription = (score: number, condition: string): string => {
    if (score > 80) return "Mamma mia che giornata spettacolare per osservare la natura! Porta la macchina fotografica e vai a caccia di panorami, guagliò!";
    if (score > 60) return "Buona giornata per fare foto alla natura, ma tieni d'occhio il cielo che potrebbe cambiare, eh!";
    if (score > 40) return "Per ammirare la natura oggi... beh, non è il massimo ma si può fare un giretto veloce veloce!";
    return "Oggi la natura si ammira dal divano con un documentario, mi niño! Con questo tempo, manco i lucertoloni escono!";
  };

  const getShoppingDescription = (score: number, condition: string): string => {
    if (score > 80) return "Perfetto per fare shopping oggi! I mercatini all'aperto sono spettacolari con questo tempo, corre corre!";
    if (score > 60) return "Si può fare shopping sia nei negozi che nei mercatini, ma tieni un occhio al cielo, mi niño!";
    if (score > 40) return "Meglio fare shopping al chiuso oggi, nei centri commerciali si sta più tranquilli!";
    return "Oggi è giornata da shopping online sul divano! Lascia perdere l'esterno che ti bagni come un pulcino!";
  };

  // Funzione per ottenere l'icona del meteo
  const getWeatherIcon = (condition: string) => {
    if (condition.includes('rain')) return faCloudRain;
    if (condition.includes('cloud')) return faCloudSun;
    if (condition.includes('clear')) return faSun;
    if (condition.includes('wind')) return faWind;
    return faCloud;
  };

  // Funzione per ottenere il colore in base al punteggio
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  if (!weatherData || pois.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-lg font-semibold mb-4 text-center">Consigli Attività</h2>
        <div className="text-center text-gray-500 py-8">
          <FontAwesomeIcon icon={faUmbrella} className="text-4xl mb-2" />
          <p>Caricamento consigli in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4 text-center">Consigli Attività</h2>
      
      {/* Condizioni meteo attuali */}
      <div className="flex items-center justify-center mb-4 text-sm bg-blue-50 p-2 rounded-md">
        <FontAwesomeIcon 
          icon={getWeatherIcon(weatherData.condition.toLowerCase())} 
          className="text-blue-500 mr-2" 
        />
        <span>
          {weatherData.temperature}°C, {weatherData.condition}
        </span>
      </div>
      
      {/* Lista raccomandazioni */}
      <div className="space-y-4">
        {recommendations.slice(0, 3).map((rec, index) => (
          <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={rec.icon} className="text-blue-500 mr-2" />
              <h3 className="font-medium">{rec.activity}</h3>
              <div className={`ml-auto font-bold ${getScoreColor(rec.score)}`}>
                {rec.score}/100
              </div>
            </div>
            
            <p className="text-sm text-gray-600 italic mb-2">{rec.description}</p>
            
            {rec.recommendedPOIs.length > 0 ? (
              <div className="mt-2">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Luoghi consigliati:</h4>
                <ul className="text-sm">
                  {rec.recommendedPOIs.map((poi, i) => (
                    <li key={i} className="flex items-center py-1">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full mr-2 text-xs">
                        {i + 1}
                      </span>
                      <span className="flex-1">{poi.name}</span>
                      <span className="text-xs text-gray-500">
                        {Math.round(poi.distance / 100) / 10} km
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">
                Nessun luogo di questo tipo trovato nelle vicinanze
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default POIRecommendations;
