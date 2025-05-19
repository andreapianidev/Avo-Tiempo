import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkedAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { osmService, POI } from '../services/osmService';
import { calculatePOIDensityByDirection } from '../utils/poiAnalytics';
import { Radar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  RadialLinearScale, 
  PointElement, 
  LineElement, 
  Filler, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Registriamo i componenti necessari di Chart.js
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface POIDensityMapProps {
  lat: number;
  lon: number;
  radius: number;
  className?: string;
}

const POIDensityMap: React.FC<POIDensityMapProps> = ({ lat, lon, radius, className = '' }) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Implementiamo un sistema di caching
  const cacheKey = `poi_density_${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}`;
  
  useEffect(() => {
    const checkCache = () => {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          // Se i dati sono stati aggiornati negli ultimi 30 minuti
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setPois(data);
            setLastUpdated(new Date(timestamp));
            setIsLoading(false);
            return true;
          }
        } catch (err) {
          console.error('Error parsing cached POI density data', err);
        }
      }
      return false;
    };
    
    const fetchPOIs = async () => {
      if (checkCache()) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedPOIs = await osmService.getPOIs(lat, lon, radius);
        setPois(fetchedPOIs);
        const now = Date.now();
        setLastUpdated(new Date(now));
        
        // Salviamo in cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: fetchedPOIs,
          timestamp: now
        }));
      } catch (err) {
        console.error('Error fetching POIs for density map:', err);
        setError('Non è stato possibile caricare i dati dei POI');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPOIs();
  }, [lat, lon, radius, cacheKey]);

  const prepareChartData = () => {
    // Calcola la densità dei POI per direzione
    const densityData = calculatePOIDensityByDirection(pois, lat, lon);
    
    // Prepara le direzioni come etichette
    const directions = Object.keys(densityData);
    
    return {
      labels: directions,
      datasets: [
        {
          label: 'Densità POI',
          data: Object.values(densityData),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          fill: true,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true,
        },
        suggestedMin: 0,
      },
    },
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
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center">
        <FontAwesomeIcon icon={faMapMarkedAlt} className="mr-2 text-[var(--color-highlight)]" />
        Distribuzione Direzionale POI
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
        ) : pois.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Nessun punto di interesse trovato in questa zona
            </p>
          </div>
        ) : (
          <Radar data={prepareChartData()} options={chartOptions} />
        )}
      </div>
      
      {lastUpdated && !isLoading && !error && pois.length > 0 && (
        <div className="mt-2 text-right">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Basato su {pois.length} POI entro {(radius/1000).toFixed(1)} km · Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
          </p>
        </div>
      )}
      
      {!isLoading && !error && pois.length > 0 && (
        <div className="mt-3 text-center text-xs text-[var(--color-text-secondary)]">
          <p>Il grafico mostra la concentrazione di punti di interesse in diverse direzioni cardinali rispetto alla tua posizione</p>
        </div>
      )}
    </div>
  );
};

export default POIDensityMap;
