import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus, faBell, faTimes, faCheck, faCloudSun } from '@fortawesome/free-solid-svg-icons';
import { ActivityCategory, RatedActivity } from '../types/activities';
import { WeatherData } from '../services/weatherService';

interface ActivitySchedulerProps {
  activity: RatedActivity;
  weather: WeatherData;
  onClose: () => void;
}

const ActivityScheduler: React.FC<ActivitySchedulerProps> = ({ activity, weather, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedTime, setSelectedTime] = useState<string>("10:00");
  const [reminderTime, setReminderTime] = useState<string>("1h");
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  
  // Genera un array di date disponibili per i prossimi 7 giorni
  const availableDates = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Genera un punteggio di idoneità casuale per ogni giorno basato sul meteo
    // In una versione reale, questo verrebbe calcolato usando dati meteo futuri
    const suitabilityScore = Math.floor(Math.random() * 100);
    
    return {
      value: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(date),
      suitability: suitabilityScore
    };
  });
  
  // Determina le fasce orarie consigliate in base al tipo di attività
  const suggestedTimeSlots = () => {
    if (activity.category === ActivityCategory.NATURA || activity.category === ActivityCategory.SPORT) {
      return ["08:00", "09:00", "10:00", "16:00", "17:00"];
    } else if (activity.category === ActivityCategory.CULTURA) {
      return ["10:00", "11:00", "15:00", "16:00", "17:00"];
    } else if (activity.category === ActivityCategory.GASTRONOMIA) {
      return ["12:30", "13:30", "19:30", "20:30"];
    } else {
      return ["10:00", "14:00", "16:00"];
    }
  };
  
  const handleSchedule = () => {
    // In una vera implementazione, qui salveremmo l'evento nel calendario
    // e imposteremmo un promemoria nel sistema di notifiche
    
    // Per ora simuliamo l'operazione
    setIsScheduled(true);
    
    // Qui potremmo utilizzare l'API di notifica del browser
    if ("Notification" in window && Notification.permission === "granted") {
      // Simula una notifica futura
      console.log(`Attività "${activity.name}" pianificata per ${selectedDate} alle ${selectedTime}`);
    }
  };
  
  // Formatta la data in formato leggibile
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }).format(date);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Pianifica Attività</h3>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <p className="mt-1">{activity.name}</p>
        </div>
        
        {isScheduled ? (
          // Mostra conferma
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faCheck} className="text-green-500 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">Attività Pianificata!</h3>
            <p className="text-gray-600 mb-4">
              Hai pianificato <span className="font-semibold">{activity.name}</span> per<br />
              {formatDate(selectedDate)} alle {selectedTime}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Riceverai un promemoria {reminderTime} prima dell'inizio
            </p>
            <button 
              onClick={onClose}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90"
            >
              Chiudi
            </button>
          </div>
        ) : (
          // Mostra form di pianificazione
          <div className="p-4">
            {/* Selezione data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scegli il giorno migliore
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {availableDates.slice(0, 6).map((date) => (
                  <button
                    key={date.value}
                    className={`relative p-2 border rounded-lg text-center ${
                      selectedDate === date.value 
                        ? 'border-[var(--color-highlight)] bg-[var(--color-highlight)] bg-opacity-10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDate(date.value)}
                  >
                    <div className="text-xs">{date.label}</div>
                    <div 
                      className="absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: date.suitability > 70 
                          ? '#10B981' 
                          : date.suitability > 40 
                            ? '#F59E0B' 
                            : '#EF4444'
                      }}
                      title={`Condizioni: ${date.suitability > 70 
                        ? 'Ottime' 
                        : date.suitability > 40 
                          ? 'Discrete' 
                          : 'Non ideali'}`}
                    />
                  </button>
                ))}
              </div>
              
              <div className="flex items-center my-3">
                <div className="flex items-center mr-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Ottimo</span>
                </div>
                <div className="flex items-center mr-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Discreto</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Non ideale</span>
                </div>
              </div>
            </div>
            
            {/* Selezione ora */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scegli orario consigliato
              </label>
              <div className="grid grid-cols-3 gap-2">
                {suggestedTimeSlots().map((time) => (
                  <button
                    key={time}
                    className={`p-2 border rounded-lg text-center ${
                      selectedTime === time 
                        ? 'border-[var(--color-highlight)] bg-[var(--color-highlight)] bg-opacity-10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Promemoria */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faBell} className="mr-2 text-[var(--color-highlight)]" />
                Imposta un promemoria
              </label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              >
                <option value="15m">15 minuti prima</option>
                <option value="30m">30 minuti prima</option>
                <option value="1h">1 ora prima</option>
                <option value="3h">3 ore prima</option>
                <option value="1d">1 giorno prima</option>
              </select>
            </div>
            
            {/* Previsioni meteo */}
            <div className="mb-5 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faCloudSun} className="text-blue-500 mr-2" />
                <div className="text-sm">
                  <div className="font-medium text-gray-800">Meteo previsto per il {formatDate(selectedDate)}</div>
                  <div className="text-gray-600">Simile a oggi: {weather.condition}, {weather.temperature}°C</div>
                </div>
              </div>
            </div>
            
            {/* Pulsante di salvataggio */}
            <button
              onClick={handleSchedule}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
              Pianifica Attività
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityScheduler;
