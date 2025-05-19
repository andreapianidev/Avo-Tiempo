import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faChartLine, faHistory, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { WeatherData } from '../services/weatherService';
import { analyzeWeatherPatterns, compareWithHistoricalData, WeatherPatternResult, HistoricalComparison } from '../services/weatherPatternsService';

interface WeatherPatternAnalysisProps {
  weatherData: WeatherData;
  location: string;
  className?: string;
}

const WeatherPatternAnalysis: React.FC<WeatherPatternAnalysisProps> = ({ weatherData, location, className }) => {
  const [patternData, setPatternData] = useState<WeatherPatternResult | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch pattern analysis and historical comparison
        const [patternResult, historyResult] = await Promise.all([
          analyzeWeatherPatterns(weatherData, location),
          compareWithHistoricalData(weatherData, location)
        ]);
        
        setPatternData(patternResult);
        setHistoricalData(historyResult);
      } catch (err) {
        console.error('Error analyzing weather patterns:', err);
        setError('Si è verificato un errore durante l\'analisi dei pattern meteorologici.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [weatherData, location]);

  if (loading) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className || ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[var(--color-highlight)]" />
            Analisi Pattern Meteorologici
          </h3>
        </div>
        <div className="flex justify-center items-center h-40">
          <FontAwesomeIcon icon={faSync} spin className="text-3xl text-[var(--color-highlight)]" />
        </div>
      </div>
    );
  }

  if (error || !patternData || !historicalData) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className || ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center">
            <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[var(--color-highlight)]" />
            Analisi Pattern Meteorologici
          </h3>
        </div>
        <div className="flex flex-col justify-center items-center h-40 text-red-500">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl mb-2" />
          <p className="text-center">{error || 'Impossibile ottenere l\'analisi dei pattern meteorologici.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg shadow ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[var(--color-highlight)]" />
          Analisi Pattern Meteorologici
        </h3>
      </div>
      
      {/* Pattern Meteorologico */}
      <div className="mb-4 p-4 rounded-lg bg-[var(--color-bg-main)]">
        <div className="flex items-center mb-2">
          <span className="text-xl mr-2">{patternData.trendIcon}</span>
          <h4 className="font-medium text-[var(--color-text-primary)]">{patternData.pattern}</h4>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            {patternData.confidence}% confidenza
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">{patternData.description}</p>
        
        <div className="mt-3 text-sm">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-[var(--color-highlight)]" />
            <span className="font-medium">Tendenza: </span>
            <span className="ml-2">{patternData.trendDescription}</span>
          </div>
        </div>
        
        {patternData.anomalies && patternData.anomalies.length > 0 && (
          <div className="mt-3">
            <h5 className="text-sm font-medium mb-1">Anomalie rilevate:</h5>
            <div className="space-y-1">
              {patternData.anomalies.map((anomaly, index) => (
                <div 
                  key={index} 
                  className={`text-xs p-2 rounded-lg ${
                    anomaly.severity > 7 ? 'bg-red-100 text-red-800' : 
                    anomaly.severity > 4 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{anomaly.type}</span>
                    <span>Severità: {anomaly.severity}/10</span>
                  </div>
                  <p>{anomaly.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Comparazione Storica */}
      <div className="mb-2">
        <div className="flex items-center mb-2">
          <FontAwesomeIcon icon={faHistory} className="mr-2 text-[var(--color-highlight)]" />
          <h4 className="text-md font-medium">Confronto con dati storici</h4>
        </div>
        
        <div className={`p-3 rounded-lg ${
          historicalData.isUnusual ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
        }`}>
          <div className="flex items-center mb-2">
            <span className="text-xl mr-2">{historicalData.comparisonIcon}</span>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Oggi: {historicalData.currentTemperature}°C</span>
                <span className="text-sm">Media storica: {historicalData.historicalAverage}°C</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  className={`h-1.5 rounded-full ${
                    historicalData.deviation > 2 ? 'bg-red-500' : 
                    historicalData.deviation < -2 ? 'bg-blue-500' : 
                    'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, Math.max(0, 50 + historicalData.deviationPercentage))}%`,
                    marginLeft: historicalData.deviation < 0 ? 'auto' : '0'
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">{historicalData.comparisonText}</p>
        </div>
      </div>
      
      {/* Date Storiche Simili */}
      {patternData.similarHistoricalDates && patternData.similarHistoricalDates.length > 0 && (
        <div className="mt-3">
          <h5 className="text-xs text-[var(--color-text-secondary)] mb-1">Date storiche con condizioni simili:</h5>
          <div className="flex flex-wrap gap-1">
            {patternData.similarHistoricalDates.map((date, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
              >
                {date}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <p className="mt-3 text-xs text-[var(--color-text-secondary)] text-right italic">
        Analisi basata su dati storici e pattern meteorologici rilevati
      </p>
    </div>
  );
};

export default WeatherPatternAnalysis;
