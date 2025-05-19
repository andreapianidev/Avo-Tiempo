import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import cacheService, { CacheNamespace } from '../services/cacheService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faExclamationTriangle, faWind, faMask } from '@fortawesome/free-solid-svg-icons';
// Funzione di formattazione data interna che non dipende da date-fns
const formatDate = (date: Date | string): string => {
  // Assicurati che date sia un oggetto Date
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Verifica che la data sia valida prima di procedere
  if (isNaN(dateObj.getTime())) {
    console.error('Data non valida:', date);
    return 'Data non valida';
  }
  
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const day = days[dateObj.getDay()];
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${day} ${hours}:${minutes}`;
};

// Registra i componenti necessari per Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface AirQualityTrendChartProps {
  lat: number;
  lon: number;
  currentAqi?: {
    value: number;
    category: string;
    pm25?: number;
    pm10?: number;
    o3?: number;
    no2?: number;
    pollen?: number;
  };
  className?: string;
}

interface AirQualityForecast {
  date: Date | string;
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  pollen?: number;
  category: string;
}

// Cache TTL in millisecondi (4 ore)
const CACHE_TTL = 4 * 60 * 60 * 1000;

// Mappatura dei livelli di qualità dell'aria
const AQI_CATEGORIES = [
  { max: 50, label: 'Ottima', color: 'rgba(0, 176, 80, 1)', bgColor: 'rgba(0, 176, 80, 0.2)' },
  { max: 100, label: 'Buona', color: 'rgba(255, 204, 0, 1)', bgColor: 'rgba(255, 204, 0, 0.2)' },
  { max: 150, label: 'Moderata', color: 'rgba(255, 153, 0, 1)', bgColor: 'rgba(255, 153, 0, 0.2)' },
  { max: 200, label: 'Scarsa', color: 'rgba(255, 0, 0, 1)', bgColor: 'rgba(255, 0, 0, 0.2)' },
  { max: 300, label: 'Malsana', color: 'rgba(153, 0, 153, 1)', bgColor: 'rgba(153, 0, 153, 0.2)' },
  { max: 500, label: 'Pericolosa', color: 'rgba(126, 0, 35, 1)', bgColor: 'rgba(126, 0, 35, 0.2)' }
];

const getAqiCategory = (aqi: number) => {
  for (const category of AQI_CATEGORIES) {
    if (aqi <= category.max) {
      return category;
    }
  }
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1]; // Il più alto se supera tutti i limiti
};

const AirQualityTrendChart: React.FC<AirQualityTrendChartProps> = ({ lat, lon, currentAqi, className }) => {
  const [forecast, setForecast] = useState<AirQualityForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPollutant, setSelectedPollutant] = useState<'aqi' | 'pm25' | 'pm10' | 'o3' | 'no2' | 'pollen'>('aqi');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Controlla la cache
        const cacheKey = `air_quality_trend_${lat.toFixed(2)}_${lon.toFixed(2)}`;
        const cachedData = cacheService.getCacheItem<AirQualityForecast[]>(CacheNamespace.AI_INSIGHTS, cacheKey);

        if (cachedData) {
          // Converti le stringhe date in oggetti Date quando si recuperano i dati dalla cache
          const processedData = cachedData.map(item => ({
            ...item,
            date: new Date(item.date)
          }));
          setForecast(processedData);
          setLoading(false);
          return;
        }

        // In un'app reale, qui andrebbe una chiamata API a un servizio di previsione qualità dell'aria
        // Ad esempio OpenWeather Air Pollution API o IQAir
        // Per questo esempio, generiamo dati di previsione simulati
        const forecastData = await simulateAirQualityForecast(lat, lon, currentAqi);
        
        // Salva i dati nella cache
        cacheService.setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, forecastData, CACHE_TTL);
        
        setForecast(forecastData);
      } catch (err) {
        console.error("Error fetching air quality trend data:", err);
        setError("Si è verificato un errore durante il recupero dei dati sulla qualità dell'aria.");
        
        // Usa dati fittizi in caso di errore
        setForecast(generateFallbackData(currentAqi));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lat, lon, currentAqi]);

  // Funzione che simula una chiamata API per le previsioni qualità dell'aria
  const simulateAirQualityForecast = async (
    lat: number, 
    lon: number, 
    currentAirQuality?: AirQualityTrendChartProps['currentAqi']
  ): Promise<AirQualityForecast[]> => {
    // Simula un breve delay come in una vera chiamata API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return generateFallbackData(currentAirQuality);
  };

  // Genera dati fittizi ma realistici per la qualità dell'aria
  const generateFallbackData = (currentAirQuality?: AirQualityTrendChartProps['currentAqi']): AirQualityForecast[] => {
    const result: AirQualityForecast[] = [];
    const now = new Date();
    
    // Valori di base (se non abbiamo dati attuali, usiamo valori tipici per una buona qualità dell'aria)
    const baseAqi = currentAirQuality?.value || 45;
    const basePm25 = currentAirQuality?.pm25 || 10;
    const basePm10 = currentAirQuality?.pm10 || 20;
    const baseO3 = currentAirQuality?.o3 || 60;
    const baseNo2 = currentAirQuality?.no2 || 25;
    const basePollen = currentAirQuality?.pollen || 15;
    
    // Genera previsioni per i prossimi 5 giorni
    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Aggiungi una variazione casuale ma coerente per simulare l'evoluzione dei valori
      // Usiamo un seed basato sul giorno per avere consistenza nelle fluttuazioni
      const daySeed = date.getDate() / 31; // valore tra 0 e 1
      const hourlyVariations = [];
      
      // Genera dati per ogni 6 ore del giorno
      for (let hour = 0; hour < 24; hour += 6) {
        const hourDate = new Date(date);
        hourDate.setHours(hour);
        
        // Calcola variazioni con un po' di rumore ma mantenendo un pattern
        // Valori più alti durante le ore di punta (mattina e pomeriggio)
        const timeOfDayFactor = hour >= 6 && hour <= 18 ? 1.2 : 0.8;
        
        // Aggiungi oscillazioni stagionali e giornaliere
        const dailyVariation = Math.sin(daySeed * Math.PI * 2) * 5;
        const hourlyVariation = Math.sin(hour / 24 * Math.PI * 2) * 8 * timeOfDayFactor;
        const randomNoise = (Math.random() - 0.5) * 10;
        
        const variationFactor = dailyVariation + hourlyVariation + randomNoise;
        
        // Applica le variazioni ai diversi inquinanti, con pattern leggermente diversi
        const aqi = Math.max(1, Math.round(baseAqi + variationFactor));
        const pm25 = Math.max(0.1, parseFloat((basePm25 + variationFactor * 0.5).toFixed(1)));
        const pm10 = Math.max(0.5, parseFloat((basePm10 + variationFactor * 0.8).toFixed(1)));
        const o3 = Math.max(1, Math.round(baseO3 + variationFactor * 1.5 * (hour >= 10 && hour <= 16 ? 1.5 : 0.8))); // Ozono più alto a mezzogiorno
        const no2 = Math.max(1, Math.round(baseNo2 + variationFactor * 0.9 * (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19 ? 1.4 : 0.7))); // NO2 più alto nelle ore di punta
        const pollen = Math.max(1, Math.round(basePollen + variationFactor * 0.7 * (hour >= 11 && hour <= 15 ? 1.3 : 0.8))); // Pollini più alti a metà giornata
        
        hourlyVariations.push({
          date: hourDate,
          aqi,
          pm25,
          pm10,
          o3,
          no2,
          pollen,
          category: getAqiCategory(aqi).label
        });
      }
      
      result.push(...hourlyVariations);
    }
    
    return result;
  };

  // Questa funzione è stata spostata in alto

  const pollutantLabels: Record<string, { name: string, unit: string, icon: any }> = {
    aqi: { name: 'Indice Qualità Aria', unit: '', icon: faWind },
    pm25: { name: 'PM2.5', unit: 'µg/m³', icon: faMask },
    pm10: { name: 'PM10', unit: 'µg/m³', icon: faMask },
    o3: { name: 'Ozono', unit: 'ppb', icon: faWind },
    no2: { name: 'Diossido di Azoto', unit: 'ppb', icon: faWind },
    pollen: { name: 'Pollini', unit: 'ppm', icon: faWind }
  };

  const chartData = {
    labels: forecast.map(item => formatDate(item.date)),
    datasets: [
      {
        label: pollutantLabels[selectedPollutant].name,
        data: forecast.map(item => item[selectedPollutant]),
        borderColor: selectedPollutant === 'aqi' 
          ? forecast.map(item => getAqiCategory(item.aqi).color)
          : 'rgba(53, 162, 235, 1)',
        backgroundColor: selectedPollutant === 'aqi'
          ? forecast.map(item => getAqiCategory(item.aqi).bgColor)
          : 'rgba(53, 162, 235, 0.2)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const yAxisMax = () => {
    switch (selectedPollutant) {
      case 'aqi': return 200;
      case 'pm25': return 50;
      case 'pm10': return 100;
      case 'o3': return 150;
      case 'no2': return 100;
      case 'pollen': return 50;
      default: return 100;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const unit = pollutantLabels[selectedPollutant].unit;
            return `${pollutantLabels[selectedPollutant].name}: ${value} ${unit}`;
          },
          footer: (tooltipItems: any) => {
            if (selectedPollutant === 'aqi') {
              const value = tooltipItems[0].raw;
              const category = getAqiCategory(value).label;
              return `Qualità: ${category}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Data e ora'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        title: {
          display: true,
          text: `${pollutantLabels[selectedPollutant].name} ${pollutantLabels[selectedPollutant].unit}`
        },
        min: 0,
        max: yAxisMax(),
        ticks: {
          stepSize: selectedPollutant === 'aqi' ? 50 : 10
        }
      }
    }
  };

  const renderPollutantSelector = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {Object.entries(pollutantLabels).map(([key, { name, icon }]) => (
        <button
          key={key}
          onClick={() => setSelectedPollutant(key as any)}
          className={`px-3 py-1 text-xs rounded-full flex items-center ${
            selectedPollutant === key
              ? 'bg-[var(--color-highlight)] text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FontAwesomeIcon icon={icon} className="mr-1" />
          {name}
        </button>
      ))}
    </div>
  );

  const renderCurrentAqi = () => {
    if (!currentAqi) return null;
    
    const aqiCategory = getAqiCategory(currentAqi.value);
    
    return (
      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: aqiCategory.bgColor }}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Qualità Aria Attuale</h4>
            <p className="text-sm" style={{ color: aqiCategory.color }}>
              {aqiCategory.label}
            </p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold" style={{ color: aqiCategory.color }}>
              {currentAqi.value}
            </span>
            <p className="text-xs text-gray-600">AQI</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FontAwesomeIcon icon={faWind} className="mr-2 text-[var(--color-highlight)]" />
          Trend Qualità dell'Aria
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
          {renderCurrentAqi()}
          {renderPollutantSelector()}
          
          <div className="h-64 mb-4">
            <Line data={chartData} options={chartOptions} />
          </div>
          
          <div className="mt-3 text-xs text-gray-600">
            <p className="font-medium">Legenda qualità dell'aria:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {AQI_CATEGORIES.map(category => (
                <span 
                  key={category.label}
                  className="px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: category.color }}
                >
                  {category.label}
                </span>
              ))}
            </div>
          </div>
          
          <p className="mt-3 text-xs text-gray-500 text-right italic">
            Previsione per i prossimi 5 giorni - Posizione: {lat.toFixed(2)}, {lon.toFixed(2)}
          </p>
        </>
      )}
    </div>
  );
};

export default AirQualityTrendChart;
