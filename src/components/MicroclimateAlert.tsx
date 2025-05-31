import React, { useState, useEffect } from 'react';
import { IonCard, IonIcon, IonButton, IonBadge, IonChip, IonSpinner, IonItem, IonLabel, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonText } from '@ionic/react';
import { locationOutline, navigateOutline, sunnyOutline, cloudyOutline, rainyOutline, thermometerOutline, chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faExchangeAlt, faMapMarkerAlt, faThermometerHalf, faWind, faCloud, faCloudSun, faCloudRain, faSmog } from '@fortawesome/free-solid-svg-icons';
import { GeoCoords } from '../services/geolocationService';
import { getCacheItem, setCacheItem, CacheNamespace } from '../services/cacheService';

// Definisco interfacce locali temporanee per evitare problemi di importazione
interface MicroclimateLocation {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  region: string;
  distance?: number;
}

interface WeatherComparison {
  currentLocation: {
    name: string;
    coords: GeoCoords;
    weather: any;
  };
  betterLocations: Array<{
    location: MicroclimateLocation;
    weather: any;
    improvement: string;
    score: number;
  }>;
}

// Mock temporaneo per il servizio microclima
const microclimateService = {
  findBetterWeatherNearby: async (location: string, coords: GeoCoords): Promise<WeatherComparison> => {
    console.log('Mock microclimateService chiamato');
    return {
      currentLocation: {
        name: location,
        coords: coords,
        weather: {}
      },
      betterLocations: []
    };
  },
  getMicroclimateAISuggestion: async (comparison: WeatherComparison): Promise<string> => {
    return 'A Santa Cruz de La Palma hay calima, pero en El Paso está despejado. ¡Escápate, mi niño!';
  }
};

interface MicroclimateAlertProps {
  currentLocation: string;
  coords: GeoCoords;
  onNavigate?: (lat: number, lon: number, name: string) => void;
}

const MicroclimateAlert: React.FC<MicroclimateAlertProps> = ({ currentLocation, coords, onNavigate }) => {
  const [comparison, setComparison] = useState<WeatherComparison | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (!currentLocation || !coords) return;
    
    const checkForBetterWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Otteni confronto microclima
        const result = await microclimateService.findBetterWeatherNearby(
          currentLocation,
          coords
        );
        
        setComparison(result);
        
        // Se ci sono località con meteo migliore, ottieni un suggerimento AI
        if (result.betterLocations && result.betterLocations.length > 0) {
          const aiSuggestion = await microclimateService.getMicroclimateAISuggestion(result);
          setSuggestion(aiSuggestion);
        }
      } catch (err) {
        console.error('Error checking for better weather:', err);
        setError('Non è stato possibile controllare il meteo nelle zone vicine');
      } finally {
        setLoading(false);
      }
    };
    
    checkForBetterWeather();
  }, [currentLocation, coords]);

  // Determina l'icona meteo in base al codice condizione
  const getWeatherIcon = (weatherId: number) => {
    if (weatherId >= 200 && weatherId < 300) return faCloudRain; // Temporale
    if (weatherId >= 300 && weatherId < 400) return faCloudRain; // Pioviggine
    if (weatherId >= 500 && weatherId < 600) return faCloudRain; // Pioggia
    if (weatherId >= 600 && weatherId < 700) return faCloudRain; // Neve
    if (weatherId >= 700 && weatherId < 800) {
      if (weatherId === 731 || weatherId === 761) return faSmog; // Calima/polvere
      return faSmog; // Nebbia/foschia
    }
    if (weatherId === 800) return faCloudSun; // Cielo sereno
    if (weatherId >= 801 && weatherId <= 803) return faCloudSun; // Parzialmente nuvoloso
    return faCloud; // Nuvoloso
  };

  // Se non ci sono località migliori o stiamo caricando, non mostrare nulla
  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <IonSpinner name="crescent" />
        <span className="ml-2 text-gray-600">Controllo microclimi nelle vicinanze...</span>
      </div>
    );
  }

  // Se non ci sono località con meteo migliore, non mostrare nulla
  if (!comparison || !comparison.betterLocations || comparison.betterLocations.length === 0) {
    return null;
  }

  // Prendi la località con il meteo migliore
  const bestLocation = comparison.betterLocations[0];
  const weatherId = bestLocation.weather.weather[0]?.id || 800;
  const currentWeatherId = comparison.currentLocation.weather.weather[0]?.id || 800;

  return (
    <div className="mb-6 transition-all duration-300 ease-in-out opacity-100">
        <IonCard className="overflow-hidden bg-[#fff8ed] border border-[#ffebba] shadow-md rounded-xl">
          {/* Header della card */}
          <div 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-[#ffd180] to-[#ffa000] text-white cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExchangeAlt} className="mr-2" />
              <h3 className="font-bold text-lg">Microclima nelle vicinanze</h3>
            </div>
            <IonBadge color="success" className="font-medium">Nuovo!</IonBadge>
          </div>
          
          {/* Suggerimento AI in stile canaro */}
          {suggestion && (
            <div className="p-4 bg-[#fff4d0] border-b border-[#ffebba] italic text-[#664d00] text-center font-medium">
              "{suggestion}"
            </div>
          )}
          
          {/* Confronto tra località */}
          <div className="p-4">
            <div className="flex items-center mb-4">
              <div className="flex-1">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-orange-500 mr-2" />
                  <span className="text-gray-800 font-semibold">{currentLocation}</span>
                </div>
                <div className="flex items-center mt-2">
                  <FontAwesomeIcon icon={getWeatherIcon(currentWeatherId)} className="text-gray-700 mr-2" />
                  <span className="text-gray-700">{comparison.currentLocation.weather.weather[0]?.description || 'Sconosciuto'}</span>
                </div>
              </div>
              
              <div className="mx-4 text-gray-400">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-teal-500 mr-2" />
                  <span className="text-gray-800 font-semibold">
                    {bestLocation.location.name} 
                    <span className="text-gray-500 text-sm ml-1">
                      ({Math.round(bestLocation.location.distance || 0)} km)
                    </span>
                  </span>
                </div>
                <div className="flex items-center mt-2">
                  <FontAwesomeIcon icon={getWeatherIcon(weatherId)} className="text-gray-700 mr-2" />
                  <span className="text-gray-700">{bestLocation.weather.weather[0]?.description || 'Sconosciuto'}</span>
                </div>
              </div>
            </div>
            
            {/* Dettagli miglioramento (visibili quando espanso) */}
            {expanded && (
              <div className="mt-3 border-t border-[#ffebba] pt-3 transition-all duration-300 ease-in-out overflow-hidden">
                <h4 className="text-gray-700 font-semibold mb-2">Miglioramenti:</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {bestLocation.improvement.split(', ').map((improvement: string, index: number) => (
                    <IonChip 
                      key={index} 
                      color="success" 
                      className="text-xs font-medium"
                    >
                      {improvement}
                    </IonChip>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-[#f8f9fa] p-2 rounded-lg">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                      <FontAwesomeIcon icon={faThermometerHalf} className="mr-1" />
                      <span>Temperatura</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        {Math.round(comparison.currentLocation.weather.main?.temp || 0)}°C
                      </span>
                      <span className="text-teal-600 font-semibold">
                        {Math.round(bestLocation.weather.main?.temp || 0)}°C
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-[#f8f9fa] p-2 rounded-lg">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                      <FontAwesomeIcon icon={faCloud} className="mr-1" />
                      <span>Nuvolosità</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        {comparison.currentLocation.weather.clouds?.all || 0}%
                      </span>
                      <span className="text-teal-600 font-semibold">
                        {bestLocation.weather.clouds?.all || 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-[#f8f9fa] p-2 rounded-lg">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                      <FontAwesomeIcon icon={faWind} className="mr-1" />
                      <span>Vento</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        {Math.round(comparison.currentLocation.weather.wind?.speed || 0)} m/s
                      </span>
                      <span className="text-teal-600 font-semibold">
                        {Math.round(bestLocation.weather.wind?.speed || 0)} m/s
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-[#f8f9fa] p-2 rounded-lg">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                      <IonIcon icon={thermometerOutline} className="mr-1" />
                      <span>Quota</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">-</span>
                      <span className="text-teal-600 font-semibold">
                        {bestLocation.location.elevation} m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-between mt-3">
              <IonButton 
                fill="clear" 
                size="small" 
                onClick={() => setExpanded(!expanded)}
                className="text-[#664d00]"
              >
                {expanded ? 'Meno dettagli' : 'Più dettagli'}
              </IonButton>
              
              {onNavigate && (
                <IonButton 
                  fill="solid" 
                  color="warning" 
                  size="small"
                  onClick={() => onNavigate(
                    bestLocation.location.lat, 
                    bestLocation.location.lon, 
                    bestLocation.location.name
                  )}
                >
                  <IonIcon icon={navigateOutline} slot="start" />
                  Mostra sulla mappa
                </IonButton>
              )}
            </div>
          </div>
        </IonCard>
    </div>
  );
};

export default MicroclimateAlert;
