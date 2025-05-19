import React, { useState, useEffect } from 'react';
import { Line, Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import cacheService, { CacheNamespace } from '../services/cacheService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faExclamationTriangle, faChartLine } from '@fortawesome/free-solid-svg-icons';

// Registra i componenti necessari per Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

interface Activity {
  name: string;
  type: string;
  suitability: number;
  temperature: number;
  humidity?: number;
  windSpeed?: number;
  icon: string;
}

interface WeatherActivityCorrelationProps {
  weatherData: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    forecast?: Array<{
      date: number;
      temperature: number;
      humidity: number;
      windSpeed: number;
      condition: string;
    }>;
  };
  className?: string;
}

const ACTIVITIES = [
  { name: 'Escursionismo', type: 'outdoor', icon: '🥾' },
  { name: 'Spiaggia', type: 'outdoor', icon: '🏖️' },
  { name: 'Ciclismo', type: 'outdoor', icon: '🚴' },
  { name: 'Corsa', type: 'outdoor', icon: '🏃' },
  { name: 'Giardinaggio', type: 'outdoor', icon: '🌱' },
  { name: 'Musei', type: 'indoor', icon: '🏛️' },
  { name: 'Shopping', type: 'indoor', icon: '🛍️' },
  { name: 'Cinema', type: 'indoor', icon: '🎬' },
  { name: 'Lettura', type: 'indoor', icon: '📚' },
  { name: 'Ristoranti', type: 'indoor', icon: '🍽️' }
];

// Cache TTL in millisecondi (4 ore)
const CACHE_TTL = 4 * 60 * 60 * 1000;

const WeatherActivityCorrelation: React.FC<WeatherActivityCorrelationProps> = ({ weatherData, className }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Controlla la cache
        const cacheKey = `activity_correlation_${weatherData.temperature}_${weatherData.humidity}_${weatherData.windSpeed}_${weatherData.condition}`;
        const cachedData = cacheService.getCacheItem<Activity[]>(CacheNamespace.AI_INSIGHTS, cacheKey);

        if (cachedData) {
          setActivities(cachedData);
          setLoading(false);
          return;
        }

        // Calcola i dati in base alle condizioni attuali se non sono in cache
        const activityData = calculateActivitySuitability(weatherData);
        
        // Salva i dati nella cache
        cacheService.setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, activityData, CACHE_TTL);
        
        setActivities(activityData);
      } catch (err) {
        console.error("Error calculating activity correlation:", err);
        setError("Si è verificato un errore durante il calcolo della correlazione tra attività e meteo.");
        
        // Usa dati fittizi in caso di errore
        setActivities(generateFallbackData(weatherData));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [weatherData]);

  const calculateActivitySuitability = (weather: WeatherActivityCorrelationProps['weatherData']): Activity[] => {
    const result: Activity[] = [];
    const { temperature, humidity, windSpeed, condition } = weather;
    const conditionLower = condition.toLowerCase();
    const isRainy = conditionLower.includes('rain') || conditionLower.includes('drizzle');
    const isCloudy = conditionLower.includes('cloud');
    const isClear = conditionLower.includes('clear') || conditionLower.includes('sun');
    const isWindy = windSpeed > 20;
    const isHot = temperature > 28;
    const isCold = temperature < 15;
    const isHighHumidity = humidity > 70;

    // Calcola l'idoneità per ogni attività in base alle condizioni meteo
    ACTIVITIES.forEach(activity => {
      let suitability = 50; // valore base
      
      if (activity.type === 'outdoor') {
        // Attività all'aperto
        if (isRainy) suitability -= 30;
        if (isCloudy) suitability -= 10;
        if (isClear) suitability += 20;
        if (isWindy) suitability -= 15;
        if (isHighHumidity) suitability -= 10;
        
        // Aggiustamenti specifici per attività
        if (activity.name === 'Spiaggia') {
          if (isHot) suitability += 30;
          if (isCold) suitability -= 40;
        } else if (activity.name === 'Escursionismo' || activity.name === 'Ciclismo') {
          if (isHot) suitability -= 15;
          if (isCold) suitability -= 10;
          if (temperature >= 15 && temperature <= 25) suitability += 20;
        } else if (activity.name === 'Corsa') {
          if (isHot) suitability -= 20;
          if (isHighHumidity) suitability -= 15;
          if (temperature >= 10 && temperature <= 20) suitability += 25;
        } else if (activity.name === 'Giardinaggio') {
          if (isRainy) suitability += 10; // Buono per le piante
          if (isHot) suitability -= 10;
        }
      } else {
        // Attività al chiuso
        if (isRainy) suitability += 20;
        if (isClear && isHot) suitability += 15; // Per sfuggire al caldo
        if (isClear && !isHot && !isCold) suitability -= 10; // Meglio stare fuori se il tempo è bello
        
        // Aggiustamenti specifici
        if (activity.name === 'Musei' || activity.name === 'Cinema') {
          if (isRainy || isCloudy) suitability += 15;
        } else if (activity.name === 'Shopping') {
          if (isRainy) suitability += 15;
          if (isHot) suitability += 10; // Shopping al coperto con aria condizionata
        } else if (activity.name === 'Ristoranti') {
          // I ristoranti sono un'opzione sempre valida
          suitability += 5;
        }
      }
      
      // Assicurati che il valore sia compreso tra 0 e 100
      suitability = Math.max(0, Math.min(100, suitability));
      
      result.push({
        name: activity.name,
        type: activity.type,
        suitability,
        temperature,
        humidity,
        windSpeed,
        icon: activity.icon
      });
    });
    
    // Ordina per idoneità decrescente
    return result.sort((a, b) => b.suitability - a.suitability);
  };

  const generateFallbackData = (weather: WeatherActivityCorrelationProps['weatherData']): Activity[] => {
    // Dati fittizi che simulano la correlazione tra attività e meteo
    const { temperature } = weather;
    return ACTIVITIES.map(activity => {
      let baseSuitability = 50;
      
      // Simula idoneità basata sul tipo di attività e temperatura
      if (activity.type === 'outdoor') {
        baseSuitability = temperature > 20 ? 75 : 40;
      } else {
        baseSuitability = temperature > 25 ? 65 : 70;
      }
      
      // Aggiungi un po' di variabilità casuale
      const randomVariation = Math.floor(Math.random() * 20) - 10;
      const suitability = Math.max(0, Math.min(100, baseSuitability + randomVariation));
      
      return {
        name: activity.name,
        type: activity.type,
        suitability,
        temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        icon: activity.icon
      };
    }).sort((a, b) => b.suitability - a.suitability);
  };

  const chartData = {
    datasets: [
      {
        label: 'Attività Indoor',
        data: activities
          .filter(activity => activity.type === 'indoor')
          .map(activity => ({
            x: activity.temperature,
            y: activity.suitability,
            r: activity.suitability / 5, // Dimensione del punto proporzionale all'idoneità
            activity: activity.name,
            icon: activity.icon
          })),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
      },
      {
        label: 'Attività Outdoor',
        data: activities
          .filter(activity => activity.type === 'outdoor')
          .map(activity => ({
            x: activity.temperature,
            y: activity.suitability,
            r: activity.suitability / 5,
            activity: activity.name,
            icon: activity.icon
          })),
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
      }
    ]
  };

  const chartOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Temperatura (°C)'
        },
        min: Math.max(0, Math.floor(weatherData.temperature) - 10),
        max: Math.ceil(weatherData.temperature) + 10,
      },
      y: {
        title: {
          display: true,
          text: 'Idoneità (%)'
        },
        min: 0,
        max: 100
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = context.raw;
            return `${point.icon} ${point.activity}: ${point.y}% compatibilità a ${point.x}°C`;
          }
        }
      },
      legend: {
        position: 'bottom' as const
      }
    },
    maintainAspectRatio: false
  };
  
  const renderActivitiesList = () => (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {activities.slice(0, 6).map((activity, idx) => (
        <div 
          key={activity.name} 
          className={`flex items-center p-2 rounded-lg ${
            activity.suitability >= 70 ? 'bg-green-100 text-green-800' :
            activity.suitability >= 50 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}
        >
          <span className="text-xl mr-2">{activity.icon}</span>
          <div>
            <span className="font-medium">{activity.name}</span>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full ${
                  activity.suitability >= 70 ? 'bg-green-500' :
                  activity.suitability >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${activity.suitability}%` }}
              />
            </div>
          </div>
          <span className="ml-auto font-semibold">{activity.suitability}%</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[var(--color-highlight)]" />
          Correlazione Attività-Meteo
        </h3>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <FontAwesomeIcon icon={faSync} spin className="text-3xl text-[var(--color-highlight)]" />
        </div>
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-64 text-red-500">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl mb-2" />
          <p className="text-center">{error}</p>
        </div>
      ) : (
        <>
          <div className="h-64 mb-4">
            <Scatter data={chartData} options={chartOptions} />
          </div>
          
          <h4 className="text-md font-medium mb-2">Attività consigliate oggi</h4>
          {renderActivitiesList()}
          
          <p className="mt-4 text-xs text-gray-500 text-right italic">
            Basato su temperatura attuale di {weatherData.temperature}°C, 
            umidità {weatherData.humidity}% e vento {weatherData.windSpeed} km/h
          </p>
        </>
      )}
    </div>
  );
};

export default WeatherActivityCorrelation;
