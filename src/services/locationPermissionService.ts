import { logAppError } from './appStateService';
import { Coordinates } from './appStateService';

/**
 * Service per gestire i permessi di geolocalizzazione su diverse piattaforme
 * Supporta sia il browser web che le piattaforme native (iOS/Android) via Capacitor
 */

// Determina se l'app è in esecuzione come app nativa
export const isNativePlatform = (): boolean => {
  // Verifica se il contesto è un'app Capacitor
  return (
    typeof window !== 'undefined' &&
    window.hasOwnProperty('Capacitor') &&
    // @ts-ignore - Capacitor è disponibile a runtime
    window.Capacitor?.isNativePlatform()
  );
};

/**
 * Chiede il permesso di geolocalizzazione all'utente
 * Gestisce sia browser che piattaforme native
 * @returns Promise<boolean> - true se il permesso è concesso, false altrimenti
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (isNativePlatform()) {
      // Se siamo su piattaforma nativa, dobbiamo usare i plugin di Capacitor
      try {
        // Tentiamo di importare dinamicamente il plugin (evitando errori se non installato)
        // @ts-ignore - Import dinamico
        const { Geolocation, Permissions } = await import('@capacitor/core');
        
        // Su iOS/Android, dobbiamo prima chiedere il permesso
        if (Permissions) {
          const permissionStatus = await Permissions.query({ name: 'geolocation' });
          if (permissionStatus.state === 'denied' || permissionStatus.state === 'never_ask_again') {
            return false;
          }
          
          if (permissionStatus.state === 'prompt') {
            const requestResult = await Permissions.request({ name: 'geolocation' });
            return requestResult.state === 'granted';
          }
          
          return permissionStatus.state === 'granted';
        }
        
        // Fallback: proviamo a usare direttamente la geolocalizzazione
        await Geolocation.getCurrentPosition();
        return true;
      } catch (error) {
        logAppError('requestLocationPermission', {
          message: 'Errore durante la richiesta del permesso di geolocalizzazione nativa',
          details: error
        });
        return false;
      }
    } else {
      // Su browser, il permesso viene richiesto automaticamente quando utilizziamo l'API
      if (!navigator.geolocation) {
        return false;
      }
      
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (error) => {
            logAppError('requestLocationPermission', {
              message: 'Permesso di geolocalizzazione negato',
              code: error.code,
              details: error.message
            });
            resolve(false);
          },
          { timeout: 5000 }
        );
      });
    }
  } catch (error) {
    logAppError('requestLocationPermission', error);
    return false;
  }
};

/**
 * Ottiene le coordinate correnti dell'utente con gestione migliorata dei permessi
 * Funziona su browser, iOS e Android
 * @param options Opzioni aggiuntive (accuracy, timeout, ecc)
 * @returns Promise<Coordinates | null> - Coordinate o null se non disponibili
 */
export const getDeviceLocation = async (options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<Coordinates | null> => {
  try {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };

    // Verifica se abbiamo il permesso
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      logAppError('getDeviceLocation', 'Permesso di geolocalizzazione non concesso');
      return null;
    }

    // Utilizzare l'implementazione appropriata in base alla piattaforma
    if (isNativePlatform()) {
      try {
        // @ts-ignore - Import dinamico
        const { Geolocation } = await import('@capacitor/core');
        const position = await Geolocation.getCurrentPosition(defaultOptions);
        
        return {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
      } catch (error) {
        logAppError('getDeviceLocation', {
          message: 'Errore durante il recupero della posizione nativa',
          details: error
        });
        return null;
      }
    } else {
      // Implementazione browser
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
          },
          (error) => {
            let errorMessage = 'Errore sconosciuto durante il recupero della geolocalizzazione.';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Permesso di geolocalizzazione negato dall\'utente.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Informazioni sulla posizione non disponibili.';
                break;
              case error.TIMEOUT:
                errorMessage = 'Timeout durante il tentativo di recuperare la posizione.';
                break;
            }
            
            logAppError('getDeviceLocation', {
              message: errorMessage,
              code: error.code,
              details: error.message
            });
            resolve(null);
          },
          defaultOptions
        );
      });
    }
  } catch (error) {
    logAppError('getDeviceLocation', error);
    return null;
  }
};

/**
 * Visualizza un messaggio utente per guidare l'attivazione della geolocalizzazione
 * in base alla piattaforma (iOS, Android o browser)
 * @returns Stringa con istruzioni specifiche per la piattaforma
 */
export const getLocationPermissionHelp = (): string => {
  if (!isNativePlatform()) {
    // Browser web
    return "Per utilizzare la geolocalizzazione, accetta il permesso nel prompt del browser. Se l'hai negato in precedenza, puoi ripristinarlo dalle impostazioni del sito.";
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.indexOf('iphone') > -1 || userAgent.indexOf('ipad') > -1 || userAgent.indexOf('ipod') > -1) {
    // iOS
    return "Per attivare la geolocalizzazione su iOS, vai in Impostazioni > Privacy > Servizi di localizzazione > AVOWeather e seleziona 'Mentre usi l'app'.";
  } else {
    // Android o altro
    return "Per attivare la geolocalizzazione su Android, vai in Impostazioni > App > AVOWeather > Autorizzazioni > Posizione e seleziona 'Consenti'.";
  }
};
