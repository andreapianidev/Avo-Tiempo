import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler,
  RadialLinearScale,
  ArcElement,
  PolarAreaController,
  RadarController
} from 'chart.js';
import { Line, Bar, Chart } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faTemperatureHigh, faUmbrella, faWind, faSun } from '@fortawesome/free-solid-svg-icons';
import { getUserSettings, getTemperatureUnit } from '../services/settingsService';
import { WeatherChartsProps, CHART_COLORS } from './WeatherChartTypes';
import { createActivitiesChartData, createWeatherDistributionData } from './WeatherChartUtils';

// Registriamo i componenti di Chart.js necessari
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler,
  RadialLinearScale,
  ArcElement,
  PolarAreaController,
  RadarController
);

const WeatherCharts: React.FC<WeatherChartsProps> = ({ 
  trendData, 
  chartType = 'temperature',
  className = ''
}) => {
  // Calcoliamo l'idoneità per ogni attività in base alle condizioni
  const calculateActivityScores = () => {
    return {
      hiking: trendData.map(day => {
        // Punteggio basato su condizione, temperatura e vento
        let score = 100;
        if (day.condition === 'rain' || day.condition === 'thunderstorm') score -= 70;
        if (day.condition === 'cloudy') score -= 20;
        if (day.condition === 'fog') score -= 40;
        if (Number(day.maxTemp) > 30) score -= (Number(day.maxTemp) - 30) * 5;
        if (Number(day.maxTemp) < 10) score -= (10 - Number(day.maxTemp)) * 5;
        if (Number(day.windSpeed || 0) > 30) score -= (Number(day.windSpeed || 0) - 30) * 2;
        return Math.max(0, Math.min(100, score));
      }),
      beach: trendData.map(day => {
        // Spiaggia: ideale quando è caldo e soleggiato
        let score = 100;
        if (day.condition === 'rain' || day.condition === 'thunderstorm') score -= 90;
        if (day.condition === 'cloudy') score -= 40;
        if (day.condition === 'fog') score -= 60;
        if (Number(day.maxTemp) < 25) score -= (25 - Number(day.maxTemp)) * 5;
        if (Number(day.windSpeed || 0) > 20) score -= (Number(day.windSpeed || 0) - 20) * 3;
        return Math.max(0, Math.min(100, score));
      }),
      cycling: trendData.map(day => {
        // Ciclismo: condizioni moderate preferite
        let score = 100;
        if (day.condition === 'rain' || day.condition === 'thunderstorm') score -= 80;
        if (day.condition === 'fog') score -= 50;
        if (Number(day.maxTemp) > 32) score -= (Number(day.maxTemp) - 32) * 5;
        if (Number(day.maxTemp) < 8) score -= (8 - Number(day.maxTemp)) * 6;
        if (Number(day.windSpeed || 0) > 25) score -= (Number(day.windSpeed || 0) - 25) * 4;
        return Math.max(0, Math.min(100, score));
      }),
      running: trendData.map(day => {
        // Corsa: preferibile con temperature fresche
        let score = 100;
        if (day.condition === 'rain' || day.condition === 'thunderstorm') score -= 60;
        if (Number(day.maxTemp) > 28) score -= (Number(day.maxTemp) - 28) * 7;
        if (Number(day.maxTemp) < 5) score -= (5 - Number(day.maxTemp)) * 8;
        if (Number(day.windSpeed || 0) > 35) score -= (Number(day.windSpeed || 0) - 35) * 2;
        if (Number(day.humidity || 50) > 80) score -= (Number(day.humidity || 50) - 80) * 2;
        return Math.max(0, Math.min(100, score));
      }),
      gardening: trendData.map(day => {
        // Giardinaggio: ideale con tempo mite e un po' di umidità
        let score = 100;
        if (day.condition === 'thunderstorm') score -= 70;
        if (day.condition === 'rain') score -= 40;
        if (Number(day.maxTemp) > 35) score -= (Number(day.maxTemp) - 35) * 6;
        if (Number(day.maxTemp) < 5) score -= (5 - Number(day.maxTemp)) * 10;
        if (Number(day.humidity || 50) < 30) score -= (30 - Number(day.humidity || 50)) * 2;
        return Math.max(0, Math.min(100, score));
      })
    };
  };

  // Calcoliamo la distribuzione delle condizioni meteo
  const calculateWeatherDistribution = () => {
    const distribution: Record<string, number> = {
      'clear': 0,
      'partly cloudy': 0,
      'cloudy': 0,
      'rain': 0,
      'thunderstorm': 0,
      'snow': 0,
      'fog': 0
    };

    trendData.forEach(day => {
      if (distribution[day.condition] !== undefined) {
        distribution[day.condition]++;
      } else {
        distribution['partly cloudy']++; // Fallback
      }
    });

    return distribution;
  };

  const { units } = getUserSettings();
  const tempUnit = getTemperatureUnit(units);

  // Prepariamo i dati per i grafici
  const labels = trendData.map(day => day.day.slice(0, 3));

  // Dati per il grafico delle temperature
  const temperatureData = {
    labels,
    datasets: [
      {
        label: `Massima ${tempUnit}`,
        data: trendData.map(day => day.maxTemp),
        borderColor: CHART_COLORS.tempMax,
        backgroundColor: CHART_COLORS.tempMax,
        tension: 0.3,
        fill: false
      },
      {
        label: `Minima ${tempUnit}`,
        data: trendData.map(day => day.minTemp),
        borderColor: CHART_COLORS.tempMin,
        backgroundColor: CHART_COLORS.tempMin,
        tension: 0.3,
        fill: false
      }
    ]
  };

  // Dati per il grafico delle precipitazioni
  const precipitationData = {
    labels,
    datasets: [
      {
        label: 'Precipitazioni %',
        data: trendData.map(day => day.precipitation),
        backgroundColor: CHART_COLORS.precipitation,
        borderRadius: 5,
        borderColor: 'rgba(77, 148, 255, 0.9)',
        borderWidth: 1
      }
    ]
  };

  // Punteggi attività
  const activityScores = calculateActivityScores();

  // Dati per il radar chart delle attività
  const activitiesData = createActivitiesChartData(trendData);

  // Dati per il polar area chart della distribuzione meteo
  const weatherDistributionData = createWeatherDistributionData(trendData);
  
  // Dati per il grafico dell'indice di comfort
  const comfortData = {
    labels,
    datasets: [
      {
        label: 'Umidità (%)',
        data: trendData.map(day => day.humidity || 50),
        borderColor: CHART_COLORS.humidity,
        backgroundColor: CHART_COLORS.humidity,
        borderRadius: 5,
        categoryPercentage: 0.7,
        barPercentage: 0.8,
        yAxisID: 'yHumidity',
        type: 'bar' as const
      },
      {
        label: 'Indice UV',
        data: trendData.map(day => day.uvIndex || 
          // Simuliamo valori UV quando non disponibili, basati sulla temperatura e condizione
          (day.condition === 'clear' ? Math.min(9, day.maxTemp / 4) : 
           day.condition === 'partly cloudy' ? Math.min(6, day.maxTemp / 5) : 
           Math.min(3, day.maxTemp / 7))
        ),
        borderColor: CHART_COLORS.uvIndex,
        backgroundColor: CHART_COLORS.uvIndex,
        type: 'line' as const,
        yAxisID: 'yUV',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3
      },
      {
        label: 'Velocità vento (km/h)',
        data: trendData.map(day => day.windSpeed || 
          // Simuliamo valori vento quando non disponibili
          Math.floor(Math.random() * 20) + 5
        ),
        borderColor: CHART_COLORS.wind,
        backgroundColor: CHART_COLORS.wind,
        type: 'line' as const,
        yAxisID: 'yWind',
        borderDash: [5, 5],
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 2
      }
    ]
  };

  // Opzioni per il grafico delle temperature
  const temperatureOptions = {
    responsive: true,
    aspectRatio: 1.5,
    scales: {
      y: {
        suggestedMin: Math.min(...trendData.map(day => day.minTemp)) - 2,
        suggestedMax: Math.max(...trendData.map(day => day.maxTemp)) + 2,
        grid: {
          color: 'rgba(200, 200, 200, 0.2)'
        },
        ticks: {
          callback: function(value: any) {
            return value + tempUnit;
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Opzioni per il grafico delle precipitazioni
  const precipitationOptions = {
    responsive: true,
    aspectRatio: 1.5,
    scales: {
      y: {
        suggestedMin: 0,
        suggestedMax: 100,
        grid: {
          color: 'rgba(200, 200, 200, 0.2)'
        },
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Opzioni per il radar chart delle attività
  const activitiesOptions = {
    responsive: true,
    aspectRatio: 1.5,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          showLabelBackdrop: false,
          font: {
            size: 8
          }
        },
        pointLabels: {
          font: {
            size: 10
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: {
            size: 10
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return context.dataset.label + ': ' + context.raw + '/100';
          }
        }
      }
    }
  };

  // Opzioni per il polar area chart della distribuzione meteo
  const weatherDistributionOptions = {
    responsive: true,
    aspectRatio: 1.3,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 9
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${value} giorni (${percentage}%)`;
          }
        }
      }
    }
  };
  
  // Opzioni per il grafico dell'indice di comfort
  const comfortOptions = {
    responsive: true,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          font: {
            size: 10
          }
        }
      }
    },
    scales: {
      yHumidity: {
        type: 'linear' as const,
        position: 'left' as const,
        suggestedMin: 0,
        suggestedMax: 100,
        grid: {
          color: 'rgba(200, 200, 200, 0.2)'
        },
        title: {
          display: true,
          text: 'Umidità (%)',
          font: {
            size: 10
          }
        }
      },
      yUV: {
        type: 'linear' as const,
        position: 'right' as const,
        suggestedMin: 0,
        suggestedMax: 12,
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Indice UV',
          font: {
            size: 10
          }
        }
      },
      yWind: {
        type: 'linear' as const,
        position: 'right' as const,
        suggestedMin: 0,
        suggestedMax: 60,
        grid: {
          display: false
        },
        display: false
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Funzione per rendere il grafico appropriato in base al tipo
  const renderChart = () => {
    switch(chartType) {
      case 'temperature':
        return (
          <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
            <h3 className="text-base font-medium mb-3 flex items-center">
              <FontAwesomeIcon icon={faTemperatureHigh} className="text-amber-500 mr-2" />
              Temperature della settimana
            </h3>
            <Line data={temperatureData} options={temperatureOptions} />
            <div className="mt-2 text-xs text-gray-500">
              La linea superiore mostra la temperatura massima, quella inferiore la minima giornaliera.
            </div>
          </div>
        );
      case 'precipitation':
        return (
          <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
            <h3 className="text-base font-medium mb-3 flex items-center">
              <FontAwesomeIcon icon={faUmbrella} className="text-blue-500 mr-2" />
              Probabilità precipitazioni
            </h3>
            <Bar data={precipitationData} options={precipitationOptions} />
            <div className="mt-2 text-xs text-gray-500">
              I valori indicano la probabilità di precipitazioni giornaliere.
            </div>
          </div>
        );
      case 'comfort':
        return (
          <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
            <h3 className="text-base font-medium mb-3 flex items-center">
              <FontAwesomeIcon icon={faSun} className="text-amber-500 mr-2" />
              Indici di comfort
            </h3>
            <Chart type="bar" data={comfortData} options={comfortOptions} />
            <div className="mt-2 text-xs text-gray-500">
              Umidità, indice UV e velocità del vento influenzano il comfort percepito.
            </div>
          </div>
        );
      case 'activities':
        return (
          <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
            <h3 className="text-base font-medium mb-3 flex items-center">
              <FontAwesomeIcon icon={faWind} className="text-green-500 mr-2" />
              Idoneità attività all'aperto
            </h3>
            <Chart type="radar" data={activitiesData} options={activitiesOptions} />
            <div className="mt-2 text-xs text-gray-500">
              Punteggi di idoneità per varie attività oggi e domani (scala 0-100).
            </div>
          </div>
        );
      case 'weatherDistribution':
        return (
          <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
            <h3 className="text-base font-medium mb-3 flex items-center">
              <FontAwesomeIcon icon={faChartLine} className="text-purple-500 mr-2" />
              Distribuzione condizioni meteo
            </h3>
            <Chart type="polarArea" data={weatherDistributionData} options={weatherDistributionOptions} />
            <div className="mt-2 text-xs text-gray-500">
              Distribuzione delle condizioni meteo previste nei prossimi giorni.
            </div>
          </div>
        );
      case 'all':
        return (
          <>
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
              <h3 className="text-base font-medium mb-3 flex items-center">
                <FontAwesomeIcon icon={faTemperatureHigh} className="text-amber-500 mr-2" />
                Temperature
              </h3>
              <Line data={temperatureData} options={temperatureOptions} />
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
              <h3 className="text-base font-medium mb-3 flex items-center">
                <FontAwesomeIcon icon={faUmbrella} className="text-blue-500 mr-2" />
                Precipitazioni
              </h3>
              <Bar data={precipitationData} options={precipitationOptions} />
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
              <h3 className="text-base font-medium mb-3 flex items-center">
                <FontAwesomeIcon icon={faSun} className="text-amber-500 mr-2" />
                Indici di comfort
              </h3>
              <Chart type="bar" data={comfortData} options={comfortOptions} />
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
              <h3 className="text-base font-medium mb-3 flex items-center">
                <FontAwesomeIcon icon={faWind} className="text-green-500 mr-2" />
                Idoneità attività all'aperto
              </h3>
              <Chart type="radar" data={activitiesData} options={activitiesOptions} />
            </div>
            <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
              <h3 className="text-base font-medium mb-3 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="text-purple-500 mr-2" />
                Distribuzione condizioni meteo
              </h3>
              <Chart type="polarArea" data={weatherDistributionData} options={weatherDistributionOptions} />
            </div>
          </>
        );
      default:
        return (
          <div className="p-4 bg-white rounded-lg shadow-sm mb-4">
            <h3 className="text-base font-medium mb-3">Dati non disponibili</h3>
            <p className="text-sm text-gray-500">Impossibile visualizzare il grafico richiesto.</p>
          </div>
        );
    }
  };

  // Renderizziamo un messaggio di fallback se non ci sono dati
  if (!trendData || trendData.length === 0) {
    return (
      <div className={`weather-charts ${className} p-4 bg-white rounded-lg shadow-sm`}>
        <p className="text-center text-gray-500">
          Dati insufficienti per generare i grafici.
        </p>
      </div>
    );
  }

  return (
    <div className={`weather-charts ${className}`}>
      {renderChart()}
    </div>
  );
};

export default WeatherCharts;
