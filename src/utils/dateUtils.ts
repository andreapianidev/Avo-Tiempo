/**
 * Utility per la gestione di date e orari
 */

/**
 * Restituisce il momento della giornata in base all'ora
 * @param hour - L'ora del giorno (0-23)
 * @returns Il momento della giornata (morning, afternoon, evening, night)
 */
export const getTimeOfDay = (hour: number): string => {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else if (hour >= 18 && hour < 22) {
    return 'evening';
  } else {
    return 'night';
  }
};

/**
 * Formatta una data in formato locale italiano o spagnolo
 * @param date - La data da formattare
 * @param locale - La lingua (default: 'es-ES')
 * @param options - Opzioni di formattazione
 * @returns La data formattata
 */
export const formatDate = (
  date: Date, 
  locale: 'es-ES' | 'it-IT' = 'es-ES',
  options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }
): string => {
  return date.toLocaleDateString(locale, options);
};

/**
 * Formatta un'ora in formato locale italiano o spagnolo
 * @param date - La data da cui estrarre l'ora
 * @param locale - La lingua (default: 'es-ES')
 * @param options - Opzioni di formattazione
 * @returns L'ora formattata
 */
export const formatTime = (
  date: Date,
  locale: 'es-ES' | 'it-IT' = 'es-ES',
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
): string => {
  return date.toLocaleTimeString(locale, options);
};

/**
 * Verifica se una data è un giorno festivo nelle Canarie
 * @param date - La data da verificare
 * @returns true se è un giorno festivo
 */
export const isHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();
  
  // Festività fisse
  const fixedHolidays = [
    { month: 0, day: 1 },    // 1 gennaio
    { month: 0, day: 6 },    // 6 gennaio (Epifania)
    { month: 4, day: 1 },    // 1 maggio
    { month: 4, day: 30 },   // 30 maggio (Giorno delle Canarie)
    { month: 7, day: 15 },   // 15 agosto
    { month: 9, day: 12 },   // 12 ottobre (Festa nazionale spagnola)
    { month: 10, day: 1 },   // 1 novembre
    { month: 11, day: 6 },   // 6 dicembre (Costituzione)
    { month: 11, day: 8 },   // 8 dicembre (Immacolata)
    { month: 11, day: 25 },  // 25 dicembre
  ];
  
  // Controlla festività fisse
  for (const holiday of fixedHolidays) {
    if (month === holiday.month && day === holiday.day) {
      return true;
    }
  }
  
  // Aggiungere qui il calcolo per festività mobili come Pasqua
  // Per semplicità, ignoriamo le festività mobili in questo esempio
  
  return false;
};

/**
 * Verifica se è un giorno lavorativo
 * @param date - La data da verificare
 * @returns true se è un giorno lavorativo
 */
export const isWorkday = (date: Date): boolean => {
  const dayOfWeek = date.getDay(); // 0-6, dove 0 è domenica
  // Non è un weekend (sabato o domenica) e non è un giorno festivo
  return dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(date);
};
