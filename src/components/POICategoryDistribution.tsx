import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartPie, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { osmService, POI } from '../services/osmService';
import { generateCategoryColors, formatCategoryName, getCategoryEmoji } from '../utils/poiAnalytics';

// Registriamo i componenti necessari di Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface POICategoryDistributionProps {
  lat: number;
  lon: number;
  radius: number;
  className?: string;
}

const POICategoryDistribution: React.FC<POICategoryDistributionProps> = ({ lat, lon, radius, className = '' }) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchPOIs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedPOIs = await osmService.getPOIs(lat, lon, radius);
        setPois(fetchedPOIs);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error fetching POIs for category distribution:', err);
        setError('Non è stato possibile caricare i dati dei POI');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPOIs();
  }, [lat, lon, radius]);

  const prepareChartData = () => {
    // Raggruppa i POI per categoria
    const categoryCounts: Record<string, number> = {};
    
    pois.forEach(poi => {
      const category = poi.category || 'altro';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Ordina per conteggio decrescente e prendi le prime 6 categorie
    // Le restanti vengono raggruppate in "Altro"
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1]);
    
    // Prendi le prime 5 categorie
    const topCategories = sortedCategories.slice(0, 5);
    
    // Calcola il totale per "Altro"
    const otherCount = sortedCategories.slice(5).reduce((acc, [_, count]) => acc + count, 0);
    
    // Prepara le categorie e i conteggi finali
    const categories = topCategories.map(([category]) => category);
    if (otherCount > 0) categories.push('altro');
    
    const counts = topCategories.map(([_, count]) => count);
    if (otherCount > 0) counts.push(otherCount);
    
    // Genera colori per le categorie
    const colors = generateCategoryColors(categories);
    
    // Formatta le etichette con emoji
    const labels = categories.map(category => 
      `${getCategoryEmoji(category)} ${formatCategoryName(category)}`
    );
    
    return {
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: categories.map(category => colors[category]),
          borderWidth: 1,
          borderColor: categories.map(category => colors[category].replace('0.7', '1')),
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${value} POI (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      <h3 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center">
        <FontAwesomeIcon icon={faChartPie} className="mr-2 text-[var(--color-highlight)]" />
        Distribuzione POI per Categoria
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
          <Pie data={prepareChartData()} options={chartOptions} />
        )}
      </div>
      
      {lastUpdated && !isLoading && !error && pois.length > 0 && (
        <div className="mt-2 text-right">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Basato su {pois.length} POI · Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
          </p>
        </div>
      )}
    </div>
  );
};

export default POICategoryDistribution;
