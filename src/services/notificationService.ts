import { createError, ErrorType } from './errorService';

/**
 * Interface for notification permission status
 */
export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Enum for weather alert severity
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ALERT = 'alert',
  SEVERE = 'severe'
}

/**
 * Interface for weather alert
 */
export interface WeatherAlert {
  id: string;
  title: string;
  message: string;
  location: string;
  severity: AlertSeverity;
  timestamp: number;
  expires?: number;
  read?: boolean;
}

// Storage key for notifications
const NOTIFICATIONS_STORAGE_KEY = 'avo_weather_notifications';

/**
 * Check if browser supports notifications
 */
export const areNotificationsSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Request permission to show notifications
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!areNotificationsSupported()) {
    throw createError(
      ErrorType.VALIDATION,
      'Las notificaciones no son compatibles con este navegador',
      null,
      'Esta función requiere un navegador que soporte notificaciones web'
    );
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw createError(
      ErrorType.VALIDATION,
      'Error al solicitar permisos de notificación',
      error,
      'Es posible que tu navegador bloquee las solicitudes de permisos o que la función no esté disponible'
    );
  }
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!areNotificationsSupported()) {
    return 'denied';
  }
  
  return Notification.permission as NotificationPermission;
};

/**
 * Save alert to local storage
 */
export const saveAlert = (alert: WeatherAlert): void => {
  try {
    // Validazione dell'alert
    if (!alert || !alert.id || !alert.title || !alert.message || !alert.location) {
      throw createError(
        ErrorType.VALIDATION, 
        'Datos de alerta inválidos',
        { alert },
        'La alerta debe contener id, título, mensaje y ubicación'
      );
    }
    
    const alerts = getAlerts();
    
    // Check if alert with same ID exists
    const existingAlertIndex = alerts.findIndex(a => a.id === alert.id);
    
    if (existingAlertIndex >= 0) {
      // Update existing alert
      alerts[existingAlertIndex] = alert;
    } else {
      // Add new alert
      alerts.push(alert);
    }
    
    // Store alerts sorted by timestamp (newest first)
    const sortedAlerts = alerts.sort((a, b) => b.timestamp - a.timestamp);
    
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(sortedAlerts));
  } catch (error: any) {
    console.error('Error saving alert:', error);
    
    // Non propaghiamo l'errore ma lo logghiamo
    if (error.type) {
      // È già un AppError, lo gestiamo direttamente
      console.error(`[${error.type}] ${error.message}`, error.detail || '');
    } else {
      // Creiamo un errore AppError
      const appError = createError(
        ErrorType.STORAGE,
        'Error al guardar la alerta',
        error,
        'No se pudo guardar la alerta en el almacenamiento local'
      );
      console.error(`[${appError.type}] ${appError.message}`, appError.detail || '');
    }
  }
};

/**
 * Get all alerts from local storage
 */
export const getAlerts = (): WeatherAlert[] => {
  try {
    const alertsJson = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!alertsJson) return [];
    
    // Validazione dati prima di restituirli
    const parsedAlerts = JSON.parse(alertsJson);
    
    // Verifica che sia un array
    if (!Array.isArray(parsedAlerts)) {
      throw createError(
        ErrorType.STORAGE, 
        'Formato de alertas inválido',
        { found: typeof parsedAlerts },
        'Se esperaba un array de alertas'
      );
    }
    
    // Rimuovi le allerte non valide
    const validAlerts = parsedAlerts.filter(alert => 
      alert && 
      typeof alert === 'object' && 
      typeof alert.id === 'string' && 
      typeof alert.title === 'string'
    );
    
    // Se abbiamo perso delle allerte, aggiorna lo storage
    if (validAlerts.length < parsedAlerts.length) {
      console.warn(`Removed ${parsedAlerts.length - validAlerts.length} invalid alerts`);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(validAlerts));
    }
    
    return validAlerts;
  } catch (error: any) {
    console.error('Error loading alerts:', error);
    
    // In caso di errore, ripristina l'array vuoto
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
    } catch (storageError) {
      console.error('Error resetting alerts storage:', storageError);
    }
    
    return [];
  }
};

/**
 * Mark alert as read
 */
export const markAlertAsRead = (alertId: string): void => {
  try {
    const alerts = getAlerts();
    const updatedAlerts = alerts.map(alert => {
      if (alert.id === alertId) {
        return { ...alert, read: true };
      }
      return alert;
    });
    
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedAlerts));
  } catch (error) {
    console.error('Error marking alert as read:', error);
  }
};

/**
 * Delete alert from storage
 */
export const deleteAlert = (alertId: string): void => {
  try {
    const alerts = getAlerts();
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
    
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedAlerts));
  } catch (error) {
    console.error('Error deleting alert:', error);
  }
};

/**
 * Get unread alerts count
 */
export const getUnreadCount = (): number => {
  try {
    const alerts = getAlerts();
    return alerts.filter(alert => !alert.read).length;
  } catch (error) {
    console.error('Error counting unread alerts:', error);
    return 0;
  }
};

/**
 * Show notification using the Notification API
 */
export const showNotification = (alert: WeatherAlert): void => {
  if (!areNotificationsSupported()) {
    console.warn('Notifications are not supported in this browser');
    return;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }
  
  try {
    // Validazione dell'alert
    if (!alert || !alert.id || !alert.title || !alert.message) {
      throw createError(
        ErrorType.VALIDATION, 
        'Datos de alerta inválidos para mostrar notificación',
        { alert },
        'La alerta debe contener id, título y mensaje'
      );
    }
    
    // Save alert first
    saveAlert(alert);
    
    // If within a service worker context, use registration showNotification
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(alert.title, {
          body: alert.message,
          icon: '/logo192.png',
          badge: '/weather-badge.png',
          tag: alert.id,
          data: {
            url: '/',
            alertId: alert.id
          },
          requireInteraction: alert.severity === AlertSeverity.SEVERE || alert.severity === AlertSeverity.ALERT
        }).catch(error => {
          console.error('Error in service worker notification:', error);
          // Fallback to regular notifications
          new Notification(alert.title, {
            body: alert.message,
            icon: '/logo192.png'
          });
        });
      }).catch(error => {
        console.error('Error accessing service worker:', error);
        // Fallback to regular notifications
        new Notification(alert.title, {
          body: alert.message,
          icon: '/logo192.png'
        });
      });
    } else {
      // Fallback to regular notifications if service worker is not available
      new Notification(alert.title, {
        body: alert.message,
        icon: '/logo192.png'
      });
    }
  } catch (error: any) {
    console.error('Error showing notification:', error);
    
    if (!error.type) {
      const appError = createError(
        ErrorType.UNKNOWN,
        'Error al mostrar notificación',
        error,
        'No se pudo mostrar la notificación debido a un error desconocido'
      );
      console.error(`[${appError.type}] ${appError.message}`, appError.detail || '');
    }
  }
};

/**
 * Process and possibly show alerts based on weather data
 * @param location - The location name
 * @param alertText - The alert text from the weather API
 * @param condition - The weather condition
 */
export const processWeatherAlert = (
  location: string, 
  alertText?: string, 
  condition?: string
): void => {
  // Don't process if no alert and normal conditions
  if (!alertText && (!condition || ['sunny', 'clear', 'partly cloudy'].includes(condition.toLowerCase()))) {
    return;
  }
  
  // Create a unique ID based on location and current day (to avoid duplicates)
  const today = new Date().toISOString().split('T')[0];
  const alertId = `${location.replace(/\s+/g, '-').toLowerCase()}-${today}`;
  
  // Check if we already showed this alert today
  const existingAlerts = getAlerts();
  const hasAlertToday = existingAlerts.some(a => a.id === alertId);
  
  // Don't show duplicate alerts on the same day
  if (hasAlertToday) {
    return;
  }
  
  // Determine severity based on alert text and condition
  let severity = AlertSeverity.INFO;
  
  if (alertText) {
    // Check for severe conditions in alert text
    const severeTerms = ['severe', 'extreme', 'grave', 'peligro', 'severo', 'extremo'];
    const warningTerms = ['warning', 'alerta', 'aviso', 'precaución'];
    
    if (severeTerms.some(term => alertText.toLowerCase().includes(term))) {
      severity = AlertSeverity.SEVERE;
    } else if (warningTerms.some(term => alertText.toLowerCase().includes(term))) {
      severity = AlertSeverity.WARNING;
    } else {
      severity = AlertSeverity.ALERT;
    }
  } else if (condition) {
    // Check condition if no alert text
    if (['thunderstorm', 'tornado', 'hurricane'].includes(condition.toLowerCase())) {
      severity = AlertSeverity.SEVERE;
    } else if (['rain', 'snow', 'hail', 'fog', 'windy'].includes(condition.toLowerCase())) {
      severity = AlertSeverity.WARNING;
    }
  }
  
  // Create alert object
  const alert: WeatherAlert = {
    id: alertId,
    title: `Alerta meteorológica en ${location}`,
    message: alertText || `Condiciones de ${condition} detectadas en ${location}`,
    location,
    severity,
    timestamp: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    read: false
  };
  
  // Show notification and save alert
  if (getNotificationPermission() === 'granted') {
    showNotification(alert);
  } else {
    // Just save the alert without showing notification
    saveAlert(alert);
  }
};
