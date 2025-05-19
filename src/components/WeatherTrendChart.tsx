import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faSpinner, faSun, faCloud, faCloudRain, faSnowflake } from '@fortawesome/free-solid-svg-icons';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { fetchWeeklyTrend, WeatherTrend } from '../services/trendService';
import { CHART_COLORS } from '../components/WeatherChartTypes';
import { convertTemperature, getTemperatureUnit, getUserSettings } from '../services/settingsService';

// Registriamo i componenti necessari di Chart.js
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

interface WeatherTrendChartProps {
  lat: number;
  lon: number;
  location: string;
  className?: string;
}

const WeatherTrendChart: React.FC<WeatherTrendChartProps> = ({ lat, lon, location, className = '' }) => {
  const [trendData, setTrendData] = useState<WeatherTrend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Otteniamo le preferenze dell'utente
  const { units } = getUserSettings();
  const tempUnit = getTemperatureUnit(units);

  // Dati fittizi per quando non ci sono dati meteo reali disponibili
  const getMockWeatherTrendData = (): WeatherTrend[] => {
    const currentDate = new Date();
    const trends: WeatherTrend[] = [];
    
    // Generiamo 7 giorni di previsioni fittizie
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentDate);
      day.setDate(day.getDate() + i);
      
      // Condizioni meteo casuali
      const conditions = ['clear', 'partly cloudy', 'cloudy', 'rain', 'thunderstorm'];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      
      // Temperature casuali realistiche per Tenerife
      const maxTemp = 22 + Math.floor(Math.random() * 8); // 22-30°C
      const minTemp = 15 + Math.floor(Math.random() * 5); // 15-20°C
      
      // Precipitazioni casuali (più probabili con condizioni di pioggia)
      let precipitation = Math.floor(Math.random() * 20);
      if (randomCondition === 'rain') precipitation += 40;
      if (randomCondition === 'thunderstorm') precipitation += 70;
      
      trends.push({
        day: day.toISOString().split('T')[0], // formato YYYY-MM-DD
        maxTemp,
        minTemp,
        condition: randomCondition,
        precipitation,
        humidity: 50 + Math.floor(Math.random() * 30),
        windSpeed: 5 + Math.floor(Math.random() * 15)
      });
    }
    
    return trends;
  };

  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedTrends = await fetchWeeklyTrend(location);
        if (fetchedTrends && fetchedTrends.length > 0) {
          setTrendData(fetchedTrends);
        } else {
          // Se non ci sono dati, usa dati fittizi
          console.log('Nessun dato meteo disponibile, usando dati fittizi');
          setTrendData(getMockWeatherTrendData());
        }
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error fetching weather trend data:', err);
        // In caso di errore, usa dati fittizi
        console.log('Errore nel recupero dati meteo, usando dati fittizi');
        setTrendData(getMockWeatherTrendData());
        setError('Dati stimati (modalità offline)');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrendData();
  }, [lat, lon, location]);

  const getWeatherIcon = (condition: string) => {
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return faCloudRain;
    } else if (condition.includes('cloud')) {
      return faCloud;
    } else if (condition.includes('snow')) {
      return faSnowflake;
    } else {
      return faSun;
    }
  };

  const prepareChartData = () => {
    // Prepara le etichette (giorni della settimana) in formato abbreviato
    const labels = trendData.map(day => {
      const date = new Date(day.day);
      return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: `Temperatura massima (${tempUnit})`,
          data: trendData.map(day => convertTemperature(day.maxTemp, units)),
          borderColor: CHART_COLORS.tempMax,
          backgroundColor: CHART_COLORS.tempMax,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: `Temperatura minima (${tempUnit})`,
          data: trendData.map(day => convertTemperature(day.minTemp, units)),
          borderColor: CHART_COLORS.tempMin,
          backgroundColor: CHART_COLORS.tempMin,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Precipitazioni (mm)',
          data: trendData.map(day => day.precipitation),
          borderColor: CHART_COLORS.precipitation,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          yAxisID: 'y1',
        }
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 10,
          padding: 10,
          font: {
            size: 10
          }
        }
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            if (!trendData[index]?.day) return '';
            
            // Assicuriamoci che la data sia in un formato corretto
            try {
              const date = new Date(trendData[index].day);
              // Verifica che la data sia valida
              if (isNaN(date.getTime())) {
                console.error('Data non valida:', trendData[index].day);
                return 'Data non valida';
              }
              return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
            } catch (error) {
              console.error('Errore nella conversione della data:', error);
              return trendData[index].day; // Restituisce la stringa originale come fallback
            }
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.datasetIndex === 2) {
                label += context.parsed.y + ' mm';
              } else {
                label += context.parsed.y + tempUnit;
              }
            }
            return label;
          },
          afterLabel: function(context: any) {
            const index = context.dataIndex;
            if (context.datasetIndex < 2 && trendData[index]) {
              return `Condizioni: ${trendData[index].condition}`;
            }
            return undefined;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: `Temperatura (${tempUnit})`,
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Precipitazioni (mm)',
          font: {
            size: 10
          }
        },
        min: 0,
        max: Math.max(...trendData.map(day => day.precipitation), 10) + 5,
        grid: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center">
        <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[var(--color-highlight)]" />
        Previsioni Meteo Settimanali
      </h3>
      
      <div className="h-64 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-[var(--color-highlight)]" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        ) : (
          <Line data={prepareChartData()} options={chartOptions} />
        )}
      </div>
      
      {/* Legenda delle condizioni meteo */}
      {!isLoading && !error && trendData.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {Array.from(new Set(trendData.map(day => day.condition))).map((condition, index) => (
            <div key={index} className="flex items-center text-xs text-[var(--color-text-secondary)]">
              <FontAwesomeIcon 
                icon={getWeatherIcon(condition)} 
                className="mr-1 text-[var(--color-highlight)]" 
              />
              <span>{condition}</span>
            </div>
          ))}
        </div>
      )}
      
      {lastUpdated && !isLoading && !error && trendData.length > 0 && (
        <div className="mt-2 text-right">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
          </p>
        </div>
      )}
    </div>
  );
};

export default WeatherTrendChart;
