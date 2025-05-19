import { WeatherTrend } from '../services/trendService';
import { WEATHER_MAP } from './WeatherChartTypes';

// Funzione per determinare il colore in base alla temperatura
export const getTempColor = (temp: number): string => {
  if (temp < 5) return 'rgba(0, 164, 235, 0.7)'; // Blu freddo
  if (temp < 15) return 'rgba(92, 207, 229, 0.7)'; // Azzurro fresco
  if (temp < 25) return 'rgba(76, 175, 80, 0.7)'; // Verde temperato
  if (temp < 30) return 'rgba(255, 193, 7, 0.7)'; // Giallo caldo
  return 'rgba(244, 67, 54, 0.7)'; // Rosso molto caldo
};

// Calcola l'idoneità per ogni attività in base alle condizioni
export const calculateActivityScores = (trendData: WeatherTrend[]) => {
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

// Calcola la distribuzione delle condizioni meteo
export const calculateWeatherDistribution = (trendData: WeatherTrend[]) => {
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

// Crea dati per il grafico radar delle attività
export const createActivitiesChartData = (trendData: WeatherTrend[]) => {
  const activityScores = calculateActivityScores(trendData);
  
  return {
    labels: ['Escursionismo', 'Spiaggia', 'Ciclismo', 'Corsa', 'Giardinaggio'],
    datasets: [
      {
        label: 'Oggi',
        data: [
          activityScores.hiking[0] || 60,
          activityScores.beach[0] || 70,
          activityScores.cycling[0] || 65,
          activityScores.running[0] || 55,
          activityScores.gardening[0] || 70
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 0.8)',
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
      },
      {
        label: 'Domani',
        data: [
          activityScores.hiking[1] || 65,
          activityScores.beach[1] || 50,
          activityScores.cycling[1] || 70,
          activityScores.running[1] || 60,
          activityScores.gardening[1] || 75
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 0.8)',
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
      }
    ]
  };
};

// Crea dati per il polar area chart della distribuzione meteo
export const createWeatherDistributionData = (trendData: WeatherTrend[]) => {
  const weatherDistribution = calculateWeatherDistribution(trendData);
  
  return {
    labels: Object.keys(weatherDistribution).map(condition => {
      // Formatta l'etichetta con emoji e testo capitalizzato
      const emoji = WEATHER_MAP[condition]?.emoji || WEATHER_MAP['default'].emoji;
      const label = condition.charAt(0).toUpperCase() + condition.slice(1);
      return `${emoji} ${label}`;
    }),
    datasets: [
      {
        data: Object.values(weatherDistribution),
        backgroundColor: Object.keys(weatherDistribution).map(condition => 
          WEATHER_MAP[condition]?.color || WEATHER_MAP['default'].color
        ),
        borderWidth: 1,
        borderColor: '#fff'
      }
    ]
  };
};
