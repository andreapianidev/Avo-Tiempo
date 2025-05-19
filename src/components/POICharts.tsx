import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  PieController,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Radar } from 'react-chartjs-2';
import { POI } from '../services/osmService';
import { 
  countPOIsByCategory, 
  generateCategoryColors, 
  formatCategoryName,
  getCategoryEmoji,
  calculatePOIDensityByDirection,
  groupPOIsByDistanceRange
} from '../utils/poiAnalytics';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartPie, faChartBar, faChartLine, faCompass } from '@fortawesome/free-solid-svg-icons';

// Registriamo i componenti di Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

interface POIChartsProps {
  pois: POI[];
  currentLat: number;
  currentLon: number;
}

const POICharts: React.FC<POIChartsProps> = ({ pois, currentLat, currentLon }) => {
  const [activeChart, setActiveChart] = useState<'category' | 'distance' | 'direction'>('category');
  
  // Dati per il grafico a torta delle categorie
  const generateCategoryChartData = () => {
    const categoryCounts = countPOIsByCategory(pois);
    const categories = Object.keys(categoryCounts);
    const categoryColors = generateCategoryColors(categories);
    
    return {
      labels: categories.map(cat => `${getCategoryEmoji(cat)} ${formatCategoryName(cat)}`),
      datasets: [
        {
          data: Object.values(categoryCounts),
          backgroundColor: categories.map(cat => categoryColors[cat]),
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Dati per il grafico a barre delle distanze
  const generateDistanceChartData = () => {
    const distanceRanges = groupPOIsByDistanceRange(pois);
    
    return {
      labels: Object.keys(distanceRanges),
      datasets: [
        {
          label: 'Numero di POI',
          data: Object.values(distanceRanges),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    };
  };
  
  // Dati per il grafico radar delle direzioni
  const generateDirectionChartData = () => {
    const directions = calculatePOIDensityByDirection(pois, currentLat, currentLon);
    
    return {
      labels: Object.keys(directions),
      datasets: [
        {
          label: 'Densità POI',
          data: Object.values(directions),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
        },
      ],
    };
  };
  
  // Opzioni per il grafico a torta
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          font: {
            size: 10
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
  
  // Opzioni per il grafico a barre
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Distribuzione POI per distanza',
        font: {
          size: 14
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };
  
  // Opzioni per il grafico radar
  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Distribuzione POI per direzione',
        font: {
          size: 14
        }
      }
    },
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0
      }
    }
  };
  
  // Funzione per renderizzare il grafico attivo
  const renderActiveChart = () => {
    if (pois.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <FontAwesomeIcon icon={faChartPie} className="text-4xl mb-2" />
          <p>Nessun POI disponibile per generare grafici</p>
        </div>
      );
    }
    
    switch (activeChart) {
      case 'category':
        return <Pie data={generateCategoryChartData()} options={pieOptions} />;
      case 'distance':
        return <Bar data={generateDistanceChartData()} options={barOptions} />;
      case 'direction':
        return <Radar data={generateDirectionChartData()} options={radarOptions} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4 text-center">Analisi Punti di Interesse</h2>
      
      {/* Selettore del tipo di grafico */}
      <div className="flex justify-center mb-4 space-x-2">
        <button
          className={`px-3 py-2 rounded-md flex items-center ${
            activeChart === 'category' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setActiveChart('category')}
        >
          <FontAwesomeIcon icon={faChartPie} className="mr-2" />
          <span className="text-sm">Categorie</span>
        </button>
        <button
          className={`px-3 py-2 rounded-md flex items-center ${
            activeChart === 'distance' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setActiveChart('distance')}
        >
          <FontAwesomeIcon icon={faChartBar} className="mr-2" />
          <span className="text-sm">Distanze</span>
        </button>
        <button
          className={`px-3 py-2 rounded-md flex items-center ${
            activeChart === 'direction' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setActiveChart('direction')}
        >
          <FontAwesomeIcon icon={faCompass} className="mr-2" />
          <span className="text-sm">Direzioni</span>
        </button>
      </div>
      
      {/* Area del grafico */}
      <div className="h-64">
        {renderActiveChart()}
      </div>
      
      {/* Statistiche riassuntive */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium mb-2">Statistiche rapide:</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-gray-100 p-2 rounded-md">
            <div className="font-bold">{pois.length}</div>
            <div className="text-xs text-gray-600">Totale POI</div>
          </div>
          <div className="bg-gray-100 p-2 rounded-md">
            <div className="font-bold">
              {Object.keys(countPOIsByCategory(pois)).length}
            </div>
            <div className="text-xs text-gray-600">Categorie</div>
          </div>
          <div className="bg-gray-100 p-2 rounded-md">
            <div className="font-bold">
              {pois.length > 0 
                ? `${Math.round(pois.reduce((sum, poi) => sum + poi.distance, 0) / pois.length / 100) / 10} km` 
                : '0 km'}
            </div>
            <div className="text-xs text-gray-600">Distanza media</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POICharts;
