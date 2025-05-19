import { WeatherTrend } from '../services/trendService';

export interface WeatherChartsProps {
  trendData: WeatherTrend[];
  chartType?: 'temperature' | 'precipitation' | 'comfort' | 'activities' | 'weatherDistribution' | 'all';
  className?: string;
}

// Definizione dei colori per i grafici
export const CHART_COLORS = {
  tempMax: 'rgba(255, 159, 64, 0.8)',
  tempMin: 'rgba(54, 162, 235, 0.8)',
  precipitation: 'rgba(77, 148, 255, 0.6)',
  humidity: 'rgba(110, 220, 160, 0.6)',
  uvIndex: 'rgba(255, 130, 100, 0.8)',
  wind: 'rgba(118, 118, 255, 0.5)',
  activity: {
    hiking: 'rgba(142, 204, 96, 0.8)',
    beach: 'rgba(250, 187, 61, 0.8)',
    cycling: 'rgba(77, 166, 255, 0.8)',
    running: 'rgba(255, 128, 64, 0.8)',
    gardening: 'rgba(116, 198, 140, 0.8)'
  },
  gradient: {
    tempMax: ['rgba(255, 159, 64, 0.8)', 'rgba(255, 159, 64, 0.1)'],
    tempMin: ['rgba(54, 162, 235, 0.8)', 'rgba(54, 162, 235, 0.1)']
  }
};

// Mappa delle condizioni meteo a emoji e categorie
export const WEATHER_MAP: Record<string, { emoji: string; color: string }> = {
  'clear': { emoji: '☀️', color: '#f9d71c' },
  'partly cloudy': { emoji: '⛅', color: '#97b1cd' },
  'cloudy': { emoji: '☁️', color: '#8aacce' },
  'rain': { emoji: '🌧️', color: '#5b94c5' },
  'thunderstorm': { emoji: '⛈️', color: '#294c70' },
  'snow': { emoji: '❄️', color: '#e0e0e0' },
  'fog': { emoji: '🌫️', color: '#c0c0c0' },
  'default': { emoji: '🌈', color: '#a5a5a5' }
};
