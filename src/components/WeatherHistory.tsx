import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHistory, faSync, faCalendarAlt, faSearch, 
  faTrash, faSave, faTags, faTemperatureHigh, 
  faCloudRain, faWind, faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  getWeatherSnapshots, 
  saveWeatherSnapshot, 
  updateWeatherSnapshot, 
  deleteWeatherSnapshot,
  WeatherSnapshot 
} from '../services/weatherHistoryService';
import { WeatherData } from '../services/weatherService';
import { getAIInsight } from '../services/aiService';

interface WeatherHistoryProps {
  currentWeatherData?: WeatherData;
  className?: string;
}

const WeatherHistory: React.FC<WeatherHistoryProps> = ({ currentWeatherData, className }) => {
  const [snapshots, setSnapshots] = useState<WeatherSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<WeatherSnapshot | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiComparison, setAiComparison] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Carica gli snapshot al caricamento del componente
  useEffect(() => {
    loadSnapshots();
  }, []);

  // Carica gli snapshot dalla cache
  const loadSnapshots = async () => {
    setLoading(true);
    
    try {
      const data = await getWeatherSnapshots();
      setSnapshots(data);
    } catch (error) {
      console.error('Errore nel caricamento degli snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtra gli snapshot in base alla ricerca e ai tag
  const filteredSnapshots = snapshots.filter(snapshot => {
    // Filtro per tag
    if (filterTag && (!snapshot.tags || !snapshot.tags.includes(filterTag))) {
      return false;
    }
    
    // Filtro per ricerca testuale
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const location = snapshot.weatherData.location.toLowerCase();
      const condition = snapshot.weatherData.condition.toLowerCase();
      const note = snapshot.note ? snapshot.note.toLowerCase() : '';
      const tags = snapshot.tags ? snapshot.tags.join(' ').toLowerCase() : '';
      
      return location.includes(query) || 
             condition.includes(query) || 
             note.includes(query) || 
             tags.includes(query);
    }
    
    return true;
  });

  // Salva uno snapshot del meteo corrente
  const handleSaveCurrentWeather = async () => {
    if (!currentWeatherData) return;
    
    setSaving(true);
    
    try {
      // Prepara i tag
      const tagsList = saveTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Salva lo snapshot
      await saveWeatherSnapshot(
        currentWeatherData,
        saveNote || undefined,
        tagsList.length > 0 ? tagsList : undefined
      );
      
      // Resetta form e ricarica snapshot
      setSaveNote('');
      setSaveTags('');
      await loadSnapshots();
    } catch (error) {
      console.error('Errore nel salvataggio dello snapshot:', error);
    } finally {
      setSaving(false);
    }
  };

  // Elimina uno snapshot
  const handleDeleteSnapshot = async (id: string) => {
    try {
      await deleteWeatherSnapshot(id);
      
      // Se lo snapshot eliminato era quello selezionato, deselezionalo
      if (selectedSnapshot && selectedSnapshot.id === id) {
        setSelectedSnapshot(null);
        setComparisonMode(false);
      }
      
      // Ricarica la lista
      await loadSnapshots();
    } catch (error) {
      console.error('Errore nell\'eliminazione dello snapshot:', error);
    }
  };

  // Aggiorna note o tag di uno snapshot
  const handleUpdateSnapshot = async (
    id: string, 
    updates: { note?: string; tags?: string[] }
  ) => {
    try {
      const updated = await updateWeatherSnapshot(id, updates);
      
      // Aggiorna lo snapshot selezionato se è quello modificato
      if (updated && selectedSnapshot && selectedSnapshot.id === id) {
        setSelectedSnapshot(updated);
      }
      
      // Ricarica la lista
      await loadSnapshots();
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello snapshot:', error);
    }
  };

  // Genera confronto AI tra meteo attuale e snapshot selezionato
  const generateAiComparison = async () => {
    if (!selectedSnapshot || !currentWeatherData) return;
    
    setAiLoading(true);
    setAiComparison(null);
    
    try {
      const snapshotDate = new Date(selectedSnapshot.timestamp);
      const formattedSnapshotDate = format(snapshotDate, 'dd MMMM yyyy', { locale: it });
      
      const prompt = `
        Confronta queste due situazioni meteorologiche e genera una breve analisi divertente in stile canaro:
        
        METEO SALVATO (${formattedSnapshotDate}):
        Località: ${selectedSnapshot.weatherData.location}
        Condizioni: ${selectedSnapshot.weatherData.condition}
        Temperatura: ${selectedSnapshot.weatherData.temperature}°C
        Umidità: ${selectedSnapshot.weatherData.humidity}%
        Vento: ${selectedSnapshot.weatherData.windSpeed} km/h
        
        METEO ATTUALE:
        Località: ${currentWeatherData.location}
        Condizioni: ${currentWeatherData.condition}
        Temperatura: ${currentWeatherData.temperature}°C
        Umidità: ${currentWeatherData.humidity}%
        Vento: ${currentWeatherData.windSpeed} km/h
        
        Evidenzia le differenze principali e fornisci brevi commenti divertenti e riflessioni. Usa uno stile canaro (inflessione e creatività canaria) con espressioni del tipo "caballo", "pisha", "mi niño".
      `;
      
      const insight = await getAIInsight(prompt);
      setAiComparison(insight);
    } catch (error) {
      console.error('Errore nella generazione del confronto AI:', error);
      setAiComparison('Scusami! Non sono riuscito a generare un confronto. Il mio cervello canaro è andato in vacanza. ¡Qué locura, caballo!');
    } finally {
      setAiLoading(false);
    }
  };

  // Formatta la data relativa
  const formatRelativeDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const hoursDiff = differenceInHours(now, date);
    const daysDiff = differenceInDays(now, date);
    
    if (hoursDiff < 24) {
      return `${hoursDiff} ${hoursDiff === 1 ? 'ora' : 'ore'} fa`;
    } else if (daysDiff < 7) {
      return `${daysDiff} ${daysDiff === 1 ? 'giorno' : 'giorni'} fa`;
    } else {
      return format(date, 'dd MMM yyyy', { locale: it });
    }
  };

  // Trova tutti i tag unici presenti negli snapshot
  const uniqueTags = Array.from(
    new Set(
      snapshots
        .filter(s => s.tags && s.tags.length > 0)
        .flatMap(s => s.tags || [])
    )
  ).sort();

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center">
          <FontAwesomeIcon icon={faHistory} className="mr-2 text-[var(--color-highlight)]" />
          Cronologia Meteo
        </h2>
        
        <button
          className="text-sm text-[var(--color-highlight)] hover:underline flex items-center"
          onClick={loadSnapshots}
        >
          <FontAwesomeIcon icon={faSync} className="mr-1" />
          Aggiorna
        </button>
      </div>
      
      {/* Sezione per salvare meteo corrente */}
      {currentWeatherData && (
        <div className="mb-4 p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-main)]">
          <h3 className="text-md font-medium mb-2 flex items-center">
            <FontAwesomeIcon icon={faSave} className="mr-2 text-[var(--color-highlight)]" />
            Salva meteo attuale
          </h3>
          
          <div className="space-y-2">
            <div>
              <label htmlFor="note" className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                Nota (opzionale)
              </label>
              <input
                type="text"
                id="note"
                className="w-full text-sm p-2 border border-[var(--color-border)] rounded"
                placeholder="Es: Prima di partire per Madrid"
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="tags" className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                Tag (separati da virgola)
              </label>
              <input
                type="text"
                id="tags"
                className="w-full text-sm p-2 border border-[var(--color-border)] rounded"
                placeholder="Es: estate, vacanza, caldo"
                value={saveTags}
                onChange={(e) => setSaveTags(e.target.value)}
              />
            </div>
            
            <button
              className="w-full flex items-center justify-center bg-[var(--color-highlight)] text-white py-2 px-4 rounded hover:bg-opacity-90 disabled:bg-opacity-60"
              onClick={handleSaveCurrentWeather}
              disabled={saving}
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSync} spin className="mr-2" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Salva meteo attuale
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Filtri e ricerca */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full p-2 pl-8 border border-[var(--color-border)] rounded text-sm"
            placeholder="Cerca per località, note, o tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
        </div>
        
        {uniqueTags.length > 0 && (
          <select
            className="p-2 border border-[var(--color-border)] rounded text-sm"
            value={filterTag || ''}
            onChange={(e) => setFilterTag(e.target.value || null)}
          >
            <option value="">Tutti i tag</option>
            {uniqueTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>
      
      {/* Lista snapshot */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <FontAwesomeIcon icon={faSync} spin className="text-2xl text-[var(--color-highlight)]" />
        </div>
      ) : filteredSnapshots.length === 0 ? (
        <div className="text-center py-6 text-[var(--color-text-secondary)]">
          {snapshots.length === 0 ? (
            <p>Nessuno snapshot salvato. Salva il meteo attuale per crearne uno!</p>
          ) : (
            <p>Nessuno snapshot corrisponde ai filtri selezionati.</p>
          )}
        </div>
      ) : (
        <>
          {/* Snapshot selezionato */}
          {selectedSnapshot && (
            <div className="mb-4 p-4 border-2 border-[var(--color-highlight)] rounded-lg bg-[var(--color-bg-main)]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">
                  {selectedSnapshot.weatherData.location}
                </h3>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {format(new Date(selectedSnapshot.timestamp), 'dd MMM yyyy HH:mm', { locale: it })}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex-1 min-w-[120px] p-2 bg-white rounded border border-[var(--color-border)]">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faTemperatureHigh} className="mr-1 text-red-500" />
                    <span>{selectedSnapshot.weatherData.temperature}°C</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-[120px] p-2 bg-white rounded border border-[var(--color-border)]">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faCloudRain} className="mr-1 text-blue-500" />
                    <span>{selectedSnapshot.weatherData.humidity}%</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-[120px] p-2 bg-white rounded border border-[var(--color-border)]">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faWind} className="mr-1 text-gray-500" />
                    <span>{selectedSnapshot.weatherData.windSpeed} km/h</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-3 text-sm">
                <p className="font-medium mb-1">Condizioni:</p>
                <p>{selectedSnapshot.weatherData.condition}</p>
              </div>
              
              {selectedSnapshot.note && (
                <div className="mb-3 text-sm">
                  <p className="font-medium mb-1">Note:</p>
                  <p>{selectedSnapshot.note}</p>
                </div>
              )}
              
              {selectedSnapshot.tags && selectedSnapshot.tags.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Tag:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSnapshot.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {currentWeatherData && (
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center text-sm bg-[var(--color-highlight)] text-white p-2 rounded hover:bg-opacity-90"
                    onClick={() => {
                      setComparisonMode(!comparisonMode);
                      if (!comparisonMode) generateAiComparison();
                    }}
                  >
                    <FontAwesomeIcon icon={comparisonMode ? faHistory : faSync} className="mr-2" />
                    {comparisonMode ? 'Nascondi confronto' : 'Confronta con attuale'}
                  </button>
                  
                  <button
                    className="p-2 bg-red-100 text-red-500 rounded hover:bg-red-200"
                    onClick={() => handleDeleteSnapshot(selectedSnapshot.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )}
              
              {/* Confronto AI */}
              {comparisonMode && (
                <div className="mt-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <h4 className="text-sm font-medium mb-2">Confronto con meteo attuale:</h4>
                  
                  {aiLoading ? (
                    <div className="flex justify-center py-4">
                      <FontAwesomeIcon icon={faSync} spin className="text-[var(--color-highlight)]" />
                    </div>
                  ) : aiComparison ? (
                    <div className="text-sm">
                      {aiComparison.split('\n').map((line, i) => (
                        <p key={i} className={i === 0 ? 'font-medium' : ''}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center py-4">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-yellow-500" />
                      <span className="text-sm">Nessun confronto disponibile</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredSnapshots.map((snapshot) => (
              <div 
                key={snapshot.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedSnapshot?.id === snapshot.id
                    ? 'border-[var(--color-highlight)] bg-blue-50'
                    : 'border-[var(--color-border)] bg-white hover:bg-gray-50'
                }`}
                onClick={() => setSelectedSnapshot(snapshot)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{snapshot.weatherData.location}</h3>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {formatRelativeDate(snapshot.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center mt-1 text-sm">
                  <span className="text-lg mr-2">{getWeatherEmoji(snapshot.weatherData.condition)}</span>
                  <span>{snapshot.weatherData.condition}</span>
                  <span className="mx-2">•</span>
                  <span>{snapshot.weatherData.temperature}°C</span>
                </div>
                
                {snapshot.note && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] truncate">
                    {snapshot.note}
                  </p>
                )}
                
                {snapshot.tags && snapshot.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {snapshot.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Funzione per ottenere emoji in base alle condizioni
const getWeatherEmoji = (condition: string): string => {
  const normalizedCondition = condition.toLowerCase();
  
  if (normalizedCondition.includes('pioggia') || normalizedCondition.includes('piovoso')) {
    return '🌧️';
  } else if (normalizedCondition.includes('neve') || normalizedCondition.includes('nevica')) {
    return '❄️';
  } else if (normalizedCondition.includes('nuvoloso') || normalizedCondition.includes('nuvole')) {
    return '☁️';
  } else if (normalizedCondition.includes('sereno') || normalizedCondition.includes('soleggiato')) {
    return '☀️';
  } else if (normalizedCondition.includes('nebbia') || normalizedCondition.includes('nebbioso')) {
    return '🌫️';
  } else if (normalizedCondition.includes('temporale')) {
    return '⛈️';
  } else if (normalizedCondition.includes('grandine')) {
    return '🌨️';
  } else if (normalizedCondition.includes('parzialmente nuvoloso')) {
    return '⛅';
  } else {
    return '🌤️';
  }
};

export default WeatherHistory;
