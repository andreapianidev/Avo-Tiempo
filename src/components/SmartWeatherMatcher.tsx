import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTemperatureHigh, faWind, faCloud, faUmbrella, 
  faSun, faSnowflake, faWater, faCheckCircle, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { WeatherData } from '../services/weatherService';
import { ActivityCategory, RatedActivity } from '../types/activities';
import { getCacheItem, setCacheItem, CacheNamespace } from '../services/cacheService';
import { getAIInsight } from '../services/aiService';

interface SmartWeatherMatcherProps {
  activity: RatedActivity;
  weather: WeatherData;
  onClose: () => void;
}

interface WeatherCondition {
  name: string;
  icon: any;
  color: string;
  value: string | number;
  unit: string;
  impact: 'positive' | 'neutral' | 'negative';
  recommendation: string;
}

const SmartWeatherMatcher: React.FC<SmartWeatherMatcherProps> = ({ activity, weather, onClose }) => {
  const [weatherAnalysis, setWeatherAnalysis] = useState<WeatherCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAdvice, setAiAdvice] = useState('');
  
  useEffect(() => {
    // Funzione per analizzare le condizioni meteo e il loro impatto sull'attività
    const analyzeWeatherConditions = () => {
      const conditions: WeatherCondition[] = [];
      
      // Temperatura
      const tempImpact = getTemperatureImpact(activity, weather.temperature);
      conditions.push({
        name: 'Temperatura',
        icon: faTemperatureHigh,
        color: getTempColor(tempImpact.impact),
        value: Math.round(weather.temperature),
        unit: '°C',
        impact: tempImpact.impact,
        recommendation: tempImpact.recommendation
      });
      
      // Condizioni meteo generali
      const weatherTypeImpact = getWeatherTypeImpact(activity, weather.condition);
      conditions.push({
        name: 'Condizioni',
        icon: getWeatherIcon(weather.condition),
        color: getImpactColor(weatherTypeImpact.impact),
        value: weather.condition,
        unit: '',
        impact: weatherTypeImpact.impact,
        recommendation: weatherTypeImpact.recommendation
      });
      
      // Vento (simulato)
      const windSpeed = Math.round(Math.random() * 20);
      const windImpact = getWindImpact(activity, windSpeed);
      conditions.push({
        name: 'Vento',
        icon: faWind,
        color: getImpactColor(windImpact.impact),
        value: windSpeed,
        unit: 'km/h',
        impact: windImpact.impact,
        recommendation: windImpact.recommendation
      });
      
      // Umidità (simulata)
      const humidity = Math.round(30 + Math.random() * 50);
      const humidityImpact = getHumidityImpact(activity, humidity);
      conditions.push({
        name: 'Umidità',
        icon: faWater,
        color: getImpactColor(humidityImpact.impact),
        value: humidity,
        unit: '%',
        impact: humidityImpact.impact,
        recommendation: humidityImpact.recommendation
      });
      
      return conditions;
    };
    
    // Generiamo un consiglio AI personalizzato
    const generateAIAdvice = async () => {
      const cacheKey = `weather_advice_${activity.id}_${weather.condition}_${Math.round(weather.temperature)}`;
      
      // Verifica la cache
      const cachedAdvice = getCacheItem<string>(CacheNamespace.AI_INSIGHTS, cacheKey);
      if (cachedAdvice) {
        setAiAdvice(cachedAdvice);
        return;
      }
      
      // Genera un nuovo consiglio con AI
      try {
        const prompt = `
          Sei un esperto meteo canario che aiuta i turisti. Analizza queste condizioni meteo e dai un consiglio personale in stile canaro 
          su come adattare questa attività alle condizioni attuali. Massimo 2 frasi divertenti ma utili.
          
          Attività: ${activity.name} - ${activity.description}
          Condizioni meteo attuali: ${weather.condition}, ${weather.temperature}°C
          Punteggio di idoneità: ${activity.score}/100
          
          Esempio di stile canaro:
          "¡Ay mi niño! Con questo solecito a Las Palmas, per il tuo trekking porta agua y sombrero, e inizia presto presto. ¡La calima no perdona, cariño!"
        `;
        
        const advice = await getAIInsight(prompt);
        if (advice) {
          setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, advice, 2 * 60 * 60 * 1000); // 2 ore
          setAiAdvice(advice);
        } else {
          setAiAdvice("¡Mira, mi niño! Adatta la tua attività alle condizioni meteo e goditi la giornata, chacho!");
        }
      } catch (error) {
        console.error('Errore nel generare il consiglio AI:', error);
        setAiAdvice("¡Ay caramba! Preparati bene per le condizioni meteo di oggi, mi niño!");
      }
    };
    
    // Esegui l'analisi e genera il consiglio
    setWeatherAnalysis(analyzeWeatherConditions());
    generateAIAdvice();
    
    // Simula il tempo di caricamento
    setTimeout(() => {
      setLoading(false);
    }, 1200);
  }, [activity, weather]);
  
  // Funzioni helper per la generazione dell'analisi meteo
  
  const getTemperatureImpact = (activity: RatedActivity, temperature: number) => {
    const { temperatureRange } = activity;
    
    if (temperature < temperatureRange.min) {
      return {
        impact: 'negative' as const,
        recommendation: `Temperatura sotto l'ideale (${temperatureRange.min}°C - ${temperatureRange.max}°C). Porta vestiti caldi.`
      };
    } else if (temperature > temperatureRange.max) {
      return {
        impact: 'negative' as const,
        recommendation: `Temperatura sopra l'ideale (${temperatureRange.min}°C - ${temperatureRange.max}°C). Cerca di stare all'ombra.`
      };
    } else if (temperature > temperatureRange.min + 2 && temperature < temperatureRange.max - 2) {
      return {
        impact: 'positive' as const,
        recommendation: 'Temperatura perfetta per questa attività!'
      };
    } else {
      return {
        impact: 'neutral' as const,
        recommendation: 'Temperatura accettabile, ma preparati a piccole variazioni.'
      };
    }
  };
  
  const getWeatherTypeImpact = (activity: RatedActivity, condition: string) => {
    const lowerCondition = condition.toLowerCase();
    
    // Verifica se la condizione è ideale
    if (activity.weatherConditions.ideal.some(c => lowerCondition.includes(c.toLowerCase()))) {
      return {
        impact: 'positive' as const,
        recommendation: 'Condizioni meteo ideali per questa attività!'
      };
    }
    
    // Verifica se la condizione è accettabile
    if (activity.weatherConditions.acceptable.some(c => lowerCondition.includes(c.toLowerCase()))) {
      return {
        impact: 'neutral' as const,
        recommendation: 'Condizioni meteo accettabili, ma non ideali.'
      };
    }
    
    // Verifica se la condizione è da evitare
    if (activity.weatherConditions.avoid.some(c => lowerCondition.includes(c.toLowerCase()))) {
      return {
        impact: 'negative' as const,
        recommendation: 'Queste condizioni meteo non sono adatte per questa attività.'
      };
    }
    
    // Default (non specificato)
    return {
      impact: 'neutral' as const,
      recommendation: 'Impatto di queste condizioni non specificato per questa attività.'
    };
  };
  
  const getWindImpact = (activity: RatedActivity, windSpeed: number) => {
    // Attività all'aperto sono più sensibili al vento
    const isOutdoor = ['NATURA', 'SPORT'].includes(activity.category);
    
    if (isOutdoor) {
      if (windSpeed > 15) {
        return {
          impact: 'negative' as const,
          recommendation: 'Vento forte può essere problematico per questa attività all\'aperto.'
        };
      } else if (windSpeed > 8) {
        return {
          impact: 'neutral' as const,
          recommendation: 'Vento moderato, potrebbe influenzare leggermente l\'attività.'
        };
      } else {
        return {
          impact: 'positive' as const,
          recommendation: 'Vento leggero, perfetto per attività all\'aperto.'
        };
      }
    } else {
      // Attività al chiuso
      return {
        impact: 'neutral' as const,
        recommendation: 'Il vento non influenza significativamente questa attività.'
      };
    }
  };
  
  const getHumidityImpact = (activity: RatedActivity, humidity: number) => {
    // Attività sportive sono più sensibili all'umidità
    const isSportActivity = activity.category === ActivityCategory.SPORT;
    
    if (isSportActivity) {
      if (humidity > 70) {
        return {
          impact: 'negative' as const,
          recommendation: 'Umidità elevata può rendere l\'attività fisica più faticosa. Bevi molta acqua.'
        };
      } else if (humidity < 30) {
        return {
          impact: 'neutral' as const,
          recommendation: 'Umidità bassa, bevi più acqua del solito.'
        };
      } else {
        return {
          impact: 'positive' as const,
          recommendation: 'Umidità ottimale per attività sportive.'
        };
      }
    } else {
      return {
        impact: 'neutral' as const,
        recommendation: 'L\'umidità ha un impatto minimo su questa attività.'
      };
    }
  };
  
  // Funzioni helper UI
  
  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return faUmbrella;
    } else if (lowerCondition.includes('cloud')) {
      return faCloud;
    } else if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) {
      return faSun;
    } else if (lowerCondition.includes('snow')) {
      return faSnowflake;
    } else {
      return faCloud;
    }
  };
  
  const getTempColor = (impact: 'positive' | 'neutral' | 'negative') => {
    return getImpactColor(impact);
  };
  
  const getImpactColor = (impact: 'positive' | 'neutral' | 'negative') => {
    switch (impact) {
      case 'positive': return 'text-green-500';
      case 'neutral': return 'text-amber-500';
      case 'negative': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  
  // Calcolo dell'adattabilità complessiva
  const calculateOverallMatchScore = () => {
    if (weatherAnalysis.length === 0) return 0;
    
    const impactScores = {
      'positive': 1,
      'neutral': 0.5,
      'negative': 0
    };
    
    const totalScore = weatherAnalysis.reduce((score, condition) => {
      return score + impactScores[condition.impact];
    }, 0);
    
    return Math.round((totalScore / weatherAnalysis.length) * 100);
  };
  
  const overallScore = calculateOverallMatchScore();
  
  // Determine overall recommendation
  const getOverallRecommendation = () => {
    if (overallScore >= 80) {
      return "Condizioni ideali! È il momento perfetto per questa attività.";
    } else if (overallScore >= 60) {
      return "Buone condizioni, ma considera alcune precauzioni.";
    } else if (overallScore >= 40) {
      return "Condizioni accettabili, ma potrebbero esserci alcune difficoltà.";
    } else {
      return "Condizioni non ideali. Considera di rimandare o adattare significativamente l'attività.";
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Meteo-Adattatore</h3>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <p className="mt-1">{activity.name} a {weather.location}</p>
        </div>
        
        {loading ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-pulse flex space-x-4 mb-4">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="animate-pulse flex space-x-4 mb-4">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* Punteggio di adattabilità */}
            <div className="mb-5 text-center">
              <div className="relative inline-block">
                <svg className="w-32 h-32">
                  <circle
                    className="text-gray-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                  />
                  <circle
                    className={`${
                      overallScore >= 80 ? 'text-green-500' : 
                      overallScore >= 60 ? 'text-green-400' : 
                      overallScore >= 40 ? 'text-amber-500' : 
                      'text-red-500'
                    }`}
                    strokeWidth="10"
                    strokeDasharray={360}
                    strokeDashoffset={360 - (360 * overallScore) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="58"
                    cx="64"
                    cy="64"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{overallScore}%</span>
                </div>
              </div>
              <h4 className="text-lg font-medium mt-2">Compatibilità Meteo</h4>
              <p className="text-gray-600 text-sm mt-1">{getOverallRecommendation()}</p>
            </div>
            
            {/* Consigli AI in stile canaro */}
            {aiAdvice && (
              <div className="mb-5 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-500 text-xl" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Consiglio dell'AI Canaria</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      {aiAdvice}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Dettagli delle condizioni */}
            <div className="space-y-4">
              {weatherAnalysis.map((condition, index) => (
                <div key={index} className="flex items-start border-b pb-3">
                  <div className={`flex-shrink-0 p-2 rounded-full ${condition.impact === 'positive' ? 'bg-green-100' : condition.impact === 'neutral' ? 'bg-amber-100' : 'bg-red-100'}`}>
                    <FontAwesomeIcon icon={condition.icon} className={`text-lg ${condition.color}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{condition.name}</h4>
                      <span className={`text-sm font-medium ${condition.color}`}>
                        {condition.value}{condition.unit}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{condition.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pulsante di chiusura */}
            <button 
              onClick={onClose}
              className="w-full mt-5 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              Ho capito
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartWeatherMatcher;
