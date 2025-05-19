import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { osmService, POI } from '../services/osmService';
import { groupPOIsByDistanceRange } from '../utils/poiAnalytics';

// Registriamo i componenti necessari di Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface POIDistanceDistributionProps {
  lat: number;
  lon: number;
  radius: number;
  className?: string;
}

const POIDistanceDistribution: React.FC<POIDistanceDistributionProps> = ({ lat, lon, radius, className = '' }) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Definiamo un sistema di cache per evitare troppe chiamate API
  useEffect(() => {
    const cacheKey = `poi_distance_${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        // Controlliamo se i dati sono recenti (ultimi 30 minuti)
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          setPois(data);
          setLastUpdated(new Date(timestamp));
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing cached POI data', e);
      }
    }
    
    const fetchPOIs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedPOIs = await osmService.getPOIs(lat, lon, radius);
        setPois(fetchedPOIs);
        const now = Date.now();
        setLastUpdated(new Date(now));
        
        // Salviamo i dati in cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: fetchedPOIs,
          timestamp: now
        }));
      } catch (err) {
        console.error('Error fetching POIs for distance distribution:', err);
        setError('Non è stato possibile caricare i dati dei POI');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPOIs();
  }, [lat, lon, radius]);

  // Dati fittizi per quando non ci sono dati reali disponibili
  const getMockDistanceData = (): Record<string, number> => {
    return {
      '0-500m': 25,
      '500m-1km': 18,
      '1km-2km': 32,
      '2km-5km': 45,
      '5km-10km': 28,
      '10km+': 14
    };
  };

  const prepareChartData = () => {
    // Colori per le barre
    const barColors = [
      'rgba(54, 162, 235, 0.7)',  // Blu
      'rgba(75, 192, 192, 0.7)',  // Turchese
      'rgba(255, 206, 86, 0.7)',  // Giallo
      'rgba(255, 159, 64, 0.7)',  // Arancione
      'rgba(255, 99, 132, 0.7)',  // Rosa
      'rgba(153, 102, 255, 0.7)', // Viola
    ];
    
    // Se non ci sono POI, usa dati fittizi
    if (pois.length === 0) {
      const mockData = getMockDistanceData();
      
      return {
        labels: Object.keys(mockData),
        datasets: [
          {
            label: 'Numero di POI (simulazione)',
            data: Object.values(mockData),
            backgroundColor: barColors,
            borderColor: barColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1,
            borderRadius: 5,
            barPercentage: 0.8,
            categoryPercentage: 0.9,
          },
        ],
      };
    }
    
    // Altrimenti usa i dati reali
    // Raggruppa i POI per fascia di distanza
    const distanceRanges = groupPOIsByDistanceRange(pois);
    
    return {
      labels: Object.keys(distanceRanges),
      datasets: [
        {
          label: 'Numero di POI',
          data: Object.values(distanceRanges),
          backgroundColor: barColors,
          borderColor: barColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
          borderRadius: 5,
          barPercentage: 0.8,
          categoryPercentage: 0.9,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.raw} POI`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
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
        <FontAwesomeIcon icon={faChartBar} className="mr-2 text-[var(--color-highlight)]" />
        Distribuzione POI per Distanza
      </h3>
      
      <div className="h-64 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-[var(--color-highlight)]" />
          </div>
        ) : (
          <>
            <Bar data={prepareChartData()} options={chartOptions} />
            {error && (
              <div className="absolute bottom-0 left-0 right-0 bg-yellow-50 rounded-b-lg p-2 text-center">
                <p className="text-xs text-amber-600">
                  <small>⚠️ Dati simulati: {error}</small>
                </p>
              </div>
            )}
          </>
        )}
      </div>
      
      {!isLoading && (error || pois.length > 0) && (
        <div className="mt-2 text-right">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {error ? (
              <>Dati simulati · {new Date().toLocaleTimeString('it-IT')}</>
            ) : (
              <>Basato su {pois.length} POI · Aggiornato: {lastUpdated?.toLocaleTimeString('it-IT') || new Date().toLocaleTimeString('it-IT')}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default POIDistanceDistribution;
