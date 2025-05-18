import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faSpinner, 
  faExclamationTriangle,
  faSun,
  faCloudRain,
  faCloud,
  faSnowflake,
  faArrowUp,
  faArrowDown,
  faEquals
} from '@fortawesome/free-solid-svg-icons';
import { getAIInsight } from '../services/aiService';
import { LocationItem } from '../services/locationService';
import { ErrorSeverity, createError, AppError, ErrorType } from '../services/errorService';
import ErrorFeedback from './ErrorFeedback';

interface AIWeatherTrendsProps {
  location: LocationItem;
  days?: number;
}

interface TrendData {
  day: string;
  trend: 'up' | 'down' | 'stable';
  condition: string;
  temperature: number;
}

/**
 * Componente che utilizza l'AI per analizzare e mostrare trend meteo futuri
 * in modo più personalizzato rispetto alle normali previsioni.
 */
const AIWeatherTrends: React.FC<AIWeatherTrendsProps> = ({ 
  location,
  days = 3
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [insight, setInsight] = useState('');
  const [error, setError] = useState<AppError | null>(null);

  // Fetch dei trend meteo tramite AI
  const fetchWeatherTrends = async () => {
    if (!location || !location.name) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Genera un prompt specifico per le tendenze meteo
      const prompt = `Analizza le tendenze meteo dei prossimi ${days} giorni per ${location.name}. 
      Condizione attuale: ${location.condition || 'soleggiato'}, temperatura: ${location.temperature || 25}°C. 
      Fornisci due paragrafi: 1) Una breve analisi delle tendenze con stile canarino divertente.
      2) Le previsioni giorno per giorno. Usa uno stile divertente tipico canario.`;
      
      const aiResponse = await getAIInsight(
        location.name,
        location.condition || 'sunny',
        location.temperature || 25,
        []
      );
      
      setInsight(aiResponse);
      
      // Genera dati di trend fittizi in base all'AI response
      // In un'app reale, questi sarebbero estratti dal testo AI o da un API meteo
      const trends = generateTrendData(aiResponse, days);
      setTrendData(trends);
      
    } catch (err) {
      console.error('Error fetching AI weather trends:', err);
      setError(createError(
        ErrorType.API,
        'Error al analizar tendencias meteorológicas',
        err instanceof Error ? err : new Error(String(err)),
        'No se pudieron generar análisis de tendencias en este momento',
        ErrorSeverity.LOW
      ));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Genera dati di trend fittizi basati sul testo AI
  const generateTrendData = (text: string, numDays: number): TrendData[] => {
    const weatherConditions = ['sunny', 'partly cloudy', 'cloudy', 'rainy', 'stormy'];
    const trends: TrendData[] = [];
    
    // Cerca parole chiave nel testo per determinare tendenze
    const hasWarming = text.toLowerCase().includes('calor') || 
                      text.toLowerCase().includes('cálido') ||
                      text.toLowerCase().includes('subir');
                      
    const hasCooling = text.toLowerCase().includes('fresco') || 
                      text.toLowerCase().includes('frío') ||
                      text.toLowerCase().includes('bajar');
                      
    const hasRain = text.toLowerCase().includes('lluvia') || 
                    text.toLowerCase().includes('precipitaciones');
    
    const today = new Date();
    
    for (let i = 0; i < numDays; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      
      // Determina condizione in base a parole chiave
      let condition = weatherConditions[0]; // default sunny
      if (hasRain && Math.random() > 0.5) {
        condition = 'rainy';
      } else if (text.toLowerCase().includes('nube')) {
        condition = Math.random() > 0.5 ? 'cloudy' : 'partly cloudy';
      }
      
      // Determina trend temperatura
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (hasWarming) {
        trend = Math.random() > 0.3 ? 'up' : 'stable';
      } else if (hasCooling) {
        trend = Math.random() > 0.3 ? 'down' : 'stable';
      }
      
      // Calcola temperatura basata sul trend
      let baseTemp = location.temperature || 25;
      let temperature = baseTemp;
      
      if (trend === 'up') {
        temperature = baseTemp + (i + 1) * 0.8;
      } else if (trend === 'down') {
        temperature = baseTemp - (i + 1) * 0.6;
      } else {
        temperature = baseTemp + (Math.random() * 2 - 1);
      }
      
      trends.push({
        day: day.toLocaleDateString('es-ES', { weekday: 'short' }),
        trend,
        condition,
        temperature: Math.round(temperature * 10) / 10
      });
    }
    
    return trends;
  };

  // Ottiene l'icona per la condizione meteo
  const getConditionIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return faSun;
      case 'partly cloudy':
      case 'cloudy':
        return faCloud;
      case 'rainy':
        return faCloudRain;
      case 'stormy':
        return faCloudRain;
      default:
        return faSun;
    }
  };
  
  // Ottiene l'icona per il trend della temperatura
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return faArrowUp;
      case 'down':
        return faArrowDown;
      case 'stable':
        return faEquals;
    }
  };
  
  // Ottiene la classe di colore per il trend
  const getTrendColorClass = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-red-500';
      case 'down':
        return 'text-blue-500';
      case 'stable':
        return 'text-gray-500';
    }
  };

  useEffect(() => {
    if (location && location.name) {
      fetchWeatherTrends();
    }
  }, [location, days]);

  return (
    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 p-4 rounded-lg shadow-sm">
      <div className="flex items-center mb-3">
        <FontAwesomeIcon icon={faChartLine} className="text-indigo-500 mr-2" />
        <h3 className="text-lg font-semibold text-indigo-800">Analisi Tendenze Meteo AI</h3>
      </div>
      
      {error && (
        <ErrorFeedback 
          error={error}
          onRetry={fetchWeatherTrends}
          className="mb-3"
        />
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center py-8">
          <FontAwesomeIcon icon={faSpinner} spin className="text-indigo-500 text-2xl mb-2" />
          <p className="text-indigo-700 text-sm animate-pulse">Analizando tendencias...</p>
        </div>
      ) : insight ? (
        <>
          <div className="bg-white p-3 rounded-md mb-4">
            <p className="text-gray-700 mb-2">{insight}</p>
          </div>
          
          <div className="bg-white rounded-md overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {trendData.map((data, index) => (
                <div key={index} className="p-3 text-center">
                  <p className="text-gray-500 text-sm mb-1">{data.day}</p>
                  <div className="flex justify-center text-lg mb-1">
                    <FontAwesomeIcon icon={getConditionIcon(data.condition)} className="text-amber-500" />
                  </div>
                  <p className="text-gray-800 font-semibold">{data.temperature}°C</p>
                  <div className="flex items-center justify-center mt-1">
                    <FontAwesomeIcon 
                      icon={getTrendIcon(data.trend)} 
                      className={`text-xs ${getTrendColorClass(data.trend)}`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center p-6 bg-white rounded-md">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400 mr-2" />
          <p className="text-gray-600">Selecciona una ubicación para ver análisis</p>
        </div>
      ) : null}
      
      {location && location.name && !isLoading && (
        <button 
          onClick={fetchWeatherTrends} 
          className="mt-3 w-full py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-md transition-colors flex justify-center items-center"
        >
          <FontAwesomeIcon icon={faChartLine} className="mr-2" />
          Actualizar análisis
        </button>
      )}
    </div>
  );
};

export default AIWeatherTrends;
