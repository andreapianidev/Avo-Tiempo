/**
 * Capacitor Service
 * 
 * Questo servizio fornisce un'interfaccia unificata per le funzionalità Capacitor,
 * supportando sia l'ambiente web che le piattaforme native (iOS/Android).
 * 
 * Rileva automaticamente l'ambiente e utilizza l'implementazione appropriata.
 */

import { createError, ErrorType } from './errorService';
import { Capacitor } from '@capacitor/core';

// Utilizziamo import dinamici per evitare errori di TypeScript
// Queste importazioni saranno gestite a runtime quando necessario

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
 * Rileva automaticamente se siamo in un ambiente nativo o web.
 */
export const initCapacitorServices = async (): Promise<boolean> => {
  const isNative = Capacitor.isNativePlatform();
  console.log(`[Capacitor] initCapacitorServices chiamato (ambiente ${isNative ? 'nativo' : 'web'})`);
  
  if (isNative) {
    try {
      // Richiedi i permessi necessari per le notifiche su piattaforme native
      if (Capacitor.getPlatform() === 'ios') {
        try {
          // Import dinamico del modulo delle notifiche
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          await LocalNotifications.requestPermissions();
        } catch (e) {
          console.warn('[Capacitor] Modulo notifiche non disponibile:', e);
        }
      }
      return true;
    } catch (error) {
      console.error('[Capacitor] Errore nell\'inizializzazione dei servizi nativi:', error);
      return false;
    }
  }
  
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
 * Ottiene la posizione corrente utilizzando Capacitor su piattaforme native
 * o l'API di geolocalizzazione del browser su web.
 */
export const getCurrentPosition = async (): Promise<Position> => {
  if (isNativePlatform()) {
    try {
      // Import dinamico del modulo di geolocalizzazione
      const { Geolocation } = await import('@capacitor/geolocation');
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000
      });
      
      // Converti il formato Capacitor nel formato Position standard
      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        },
        timestamp: position.timestamp
      } as Position;
    } catch (error) {
      throw createError(ErrorType.LOCATION, `Errore di geolocalizzazione nativa: ${error}`);
    }
  } else {
    // Implementazione browser
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
  }
};

/**
 * Avvia il tracciamento in background.
 * Su piattaforme native utilizza i plugin Capacitor, su web simula l'operazione.
 */
export const startBackgroundTracking = async (): Promise<void> => {
  if (isNativePlatform()) {
    try {
      // In un'implementazione reale, qui utilizzeremmo un plugin specifico per il tracciamento in background
      // Ad esempio, potremmo utilizzare un plugin di geolocalizzazione in background
      console.log('[Capacitor] Avvio tracciamento in background su piattaforma nativa');
      // Implementazione da completare con plugin specifico
    } catch (error) {
      console.error('[Capacitor] Errore nell\'avvio del tracciamento in background:', error);
      throw createError(ErrorType.CAPACITOR, 'Errore nell\'avvio del tracciamento in background');
    }
  } else {
    console.log('[Capacitor] Stub: startBackgroundTracking chiamato (ambiente web)');
  }
};

/**
 * Ferma il tracciamento in background.
 * Su piattaforme native utilizza i plugin Capacitor, su web simula l'operazione.
 */
export const stopBackgroundTracking = async (): Promise<void> => {
  if (isNativePlatform()) {
    try {
      // In un'implementazione reale, qui fermeremmo il plugin di tracciamento in background
      console.log('[Capacitor] Arresto tracciamento in background su piattaforma nativa');
      // Implementazione da completare con plugin specifico
    } catch (error) {
      console.error('[Capacitor] Errore nell\'arresto del tracciamento in background:', error);
      throw createError(ErrorType.CAPACITOR, 'Errore nell\'arresto del tracciamento in background');
    }
  } else {
    console.log('[Capacitor] Stub: stopBackgroundTracking chiamato (ambiente web)');
  }
};

/**
 * Invia una notifica locale.
 * Su piattaforme native utilizza il plugin LocalNotifications di Capacitor,
 * su web usa l'API Notification del browser se disponibile.
 */
export const sendLocalNotification = async (title: string, body: string): Promise<void> => {
  if (isNativePlatform()) {
    try {
      // Import dinamico del modulo delle notifiche
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now() + 1000) }
          }
        ]
      });
    } catch (error) {
      console.error('[Capacitor] Errore nell\'invio della notifica nativa:', error);
      throw createError(ErrorType.CAPACITOR, 'Errore nell\'invio della notifica');
    }
  } else {
    console.log('[Capacitor] Invio notifica in ambiente web', { title, body });
    
    // Usa l'API Notification del browser se disponibile
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      } catch (error) {
        console.error('[Capacitor] Errore nell\'invio della notifica web:', error);
      }
    }
  }
};

/**
 * Verifica se l'app è in esecuzione in un ambiente nativo.
 * Utilizza l'API Capacitor per determinare l'ambiente.
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Mostra un messaggio di conferma.
 * Su piattaforme native utilizza i dialoghi nativi,
 * su web usa window.confirm.
 */
export const showConfirmAlert = async (title: string, message: string): Promise<boolean> => {
  if (isNativePlatform()) {
    try {
      // In un'implementazione reale, qui utilizzeremmo un plugin per i dialoghi nativi
      // Per ora, utilizziamo window.confirm anche su piattaforme native
      return window.confirm(message);
      
      // Esempio di implementazione futura con plugin Dialog:
      // const { value } = await Dialog.confirm({
      //   title: title,
      //   message: message,
      //   okButtonTitle: 'Conferma',
      //   cancelButtonTitle: 'Annulla'
      // });
      // return value;
    } catch (error) {
      console.error('[Capacitor] Errore nella visualizzazione del dialogo di conferma:', error);
      return window.confirm(message); // Fallback
    }
  } else {
    return window.confirm(message);
  }
};
