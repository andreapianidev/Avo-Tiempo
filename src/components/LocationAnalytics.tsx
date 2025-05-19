import React, { useState, useEffect } from 'react';
import { POI } from '../services/osmService';
import { WeatherData } from '../services/weatherService';
import POICharts from './POICharts';
import POIRecommendations from './POIRecommendations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartPie, faMapMarkerAlt, faCompass, faSync, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { getAIInsight } from '../services/aiService';

interface LocationAnalyticsProps {
  pois: POI[];
  weatherData?: WeatherData;
  currentLat: number;
  currentLon: number;
  locationName: string;
  onRefreshPOIs: () => void;
}

const LocationAnalytics: React.FC<LocationAnalyticsProps> = ({ 
  pois, 
  weatherData, 
  currentLat, 
  currentLon, 
  locationName,
  onRefreshPOIs 
}) => {
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'recommendations'>('charts');

  useEffect(() => {
    if (pois.length > 0 && weatherData && locationName) {
      generateAiInsight();
    }
  }, [pois, weatherData, locationName]);

  const generateAiInsight = async () => {
    if (!weatherData || pois.length === 0) return;
    
    setIsLoadingInsight(true);
    
    try {
      // Creiamo un prompt per l'AI in stile canaro
      const prompt = `
        Sei un assistente turistico delle Canarie con un accento canaro molto marcato.
        Genera un breve consiglio turistico divertente (massimo 120 parole) per ${locationName}.
        
        Dati meteo attuali:
        - Temperatura: ${weatherData.temperature}°C
        - Condizione: ${weatherData.condition}
        - Vento: ${weatherData.windSpeed || 'N/A'} km/h
        
        Punti di interesse nelle vicinanze (${pois.length} totali):
        ${pois.slice(0, 5).map(poi => `- ${poi.name} (${poi.type})`).join('\n')}
        
        Usa un tono molto informale, divertente e con espressioni tipiche canarie.
        Includi almeno un consiglio specifico su cosa fare oggi in base al meteo e ai luoghi disponibili.
      `;
      
      const insight = await getAIInsight(locationName, weatherData.condition, weatherData.temperature, undefined, pois.slice(0, 5));
      setAiInsight(insight);
    } catch (error) {
      console.error('Errore nella generazione dell\'insight AI:', error);
      setAiInsight('Non è stato possibile generare un consiglio personalizzato al momento. Riprova più tardi!');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Insight AI */}
      <div className="bg-yellow-50 rounded-lg shadow-md p-4 mb-4 border-l-4 border-yellow-400">
        <div className="flex items-start">
          <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-500 mr-3 mt-1" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">Consiglio locale</h3>
            {isLoadingInsight ? (
              <div className="animate-pulse h-16 bg-yellow-100 rounded"></div>
            ) : (
              <p className="text-sm text-yellow-700 italic">{aiInsight || "Caricamento consiglio in corso..."}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs per navigare tra grafici e raccomandazioni */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium flex justify-center items-center ${
              activeTab === 'charts' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('charts')}
          >
            <FontAwesomeIcon icon={faChartPie} className="mr-2" />
            Analisi POI
          </button>
          <button
            className={`flex-1 py-3 px-4 text-sm font-medium flex justify-center items-center ${
              activeTab === 'recommendations' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('recommendations')}
          >
            <FontAwesomeIcon icon={faCompass} className="mr-2" />
            Consigli Attività
          </button>
        </div>
        
        <div className="p-4">
          {/* Header con info e pulsante di refresh */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500 mr-2" />
              <span className="text-sm font-medium">
                {pois.length} punti di interesse
              </span>
            </div>
            <button 
              className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
              onClick={onRefreshPOIs}
            >
              <FontAwesomeIcon icon={faSync} className="mr-1" />
              Aggiorna
            </button>
          </div>
          
          {/* Contenuto del tab attivo */}
          {activeTab === 'charts' ? (
            <POICharts 
              pois={pois} 
              currentLat={currentLat} 
              currentLon={currentLon} 
            />
          ) : (
            <POIRecommendations 
              pois={pois} 
              weatherData={weatherData} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationAnalytics;
