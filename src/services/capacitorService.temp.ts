/**
 * Capacitor Service (Versione stub)
 * 
 * Questo servizio fornisce stub per le funzionalità Capacitor, permettendo
 * all'app di funzionare in ambiente web senza dipendenze native.
 * 
 * In produzione, sostituire con implementazioni reali che usano i moduli Capacitor.
 */

import { createError, ErrorType } from './errorService';

// Tipi per TypeScript
export interface Position {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
}

export interface BackgroundTrackingSettings {
  enabled: boolean;
  highAccuracy: boolean;
  notifyOnWeatherChanges: boolean;
  notifyOnAirQualityChanges: boolean;
  notifyOnLocationChanges: boolean;
  checkInterval: number; // Intervallo in millisecondi
}

// Chiave per localStorage
const TRACKING_SETTINGS_KEY = 'avo_tracking_settings';

// Impostazioni predefinite
const DEFAULT_TRACKING_SETTINGS: BackgroundTrackingSettings = {
  enabled: false,
  highAccuracy: false,
  notifyOnWeatherChanges: true,
  notifyOnAirQualityChanges: true,
  notifyOnLocationChanges: true,
  checkInterval: 15 * 60 * 1000 // 15 minuti
};

/**
 * Inizializza i servizi Capacitor.
 * Questa è una funzione stub per ambienti web.
 */
export const initCapacitorServices = async (): Promise<boolean> => {
  console.log('[Capacitor] Stub: initCapacitorServices chiamato (ambiente web)');
  return false;
};

/**
 * Ottiene le impostazioni del tracciamento in background.
 */
export const getBackgroundTrackingSettings = async (): Promise<BackgroundTrackingSettings> => {
  try {
    const savedSettings = localStorage.getItem(TRACKING_SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings) as BackgroundTrackingSettings;
    }
  } catch (error) {
    console.error('[Capacitor] Errore nel caricamento delle impostazioni:', error);
  }
  return DEFAULT_TRACKING_SETTINGS;
};

/**
 * Salva le impostazioni del tracciamento in background.
 */
export const saveBackgroundTrackingSettings = async (settings: BackgroundTrackingSettings): Promise<void> => {
  try {
    localStorage.setItem(TRACKING_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[Capacitor] Errore nel salvataggio delle impostazioni:', error);
    throw createError(ErrorType.STORAGE, 'Errore nel salvataggio delle impostazioni');
  }
};

/**
 * Ottiene la posizione corrente utilizzando l'API di geolocalizzazione del browser.
 */
export const getCurrentPosition = async (): Promise<Position> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(createError(ErrorType.LOCATION, 'Geolocalizzazione non supportata in questo browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position as Position),
      (error) => reject(createError(ErrorType.LOCATION, `Errore di geolocalizzazione: ${error.message}`)),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000
      }
    );
  });
};

/**
 * Avvia il tracciamento in background.
 * Versione stub che simula l'operazione.
 */
export const startBackgroundTracking = async (): Promise<void> => {
  console.log('[Capacitor] Stub: startBackgroundTracking chiamato');
};

/**
 * Ferma il tracciamento in background.
 * Versione stub che simula l'operazione.
 */
export const stopBackgroundTracking = async (): Promise<void> => {
  console.log('[Capacitor] Stub: stopBackgroundTracking chiamato');
};

/**
 * Invia una notifica locale.
 * In ambiente web, usa l'API Notification se disponibile.
 */
export const sendLocalNotification = async (title: string, body: string): Promise<void> => {
  console.log('[Capacitor] Stub: sendLocalNotification chiamato', { title, body });
  
  // Usa l'API Notification del browser se disponibile
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, { body });
    }
  }
};

/**
 * Verifica se l'app è in esecuzione in un ambiente nativo.
 * Questa versione stub restituisce sempre false.
 */
export const isNativePlatform = (): boolean => {
  return false;
};

/**
 * Mostra un messaggio di conferma.
 * In ambiente web, usa window.confirm.
 */
export const showConfirmAlert = async (title: string, message: string): Promise<boolean> => {
  return window.confirm(message);
};
