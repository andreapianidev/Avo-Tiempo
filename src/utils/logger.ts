/**
 * Logger utility to handle logging with sensible defaults
 * and security-conscious behavior
 */

interface LogConfig {
  suppressDuplicateInterval: number; // milliseconds
}

// --- patch: configurazione per la gestione dei log
const LOG_CONFIG: LogConfig = {
  suppressDuplicateInterval: 30000, // 30 secondi
};

// Cache per i messaggi recenti
const recentLogMessages: Map<string, number> = new Map();

/**
 * Removes sensitive information from URLs
 * @param url The URL to redact
 * @returns Redacted URL
 */
// --- patch: redact() per nascondere le API key nei log
export const redact = (url: string): string => {
  if (!url) return url;
  
  // Redact OpenWeather API key
  const redactedUrl = url.replace(/appid=[^&]+/g, 'appid=***');
  
  // Redact any other API key patterns if needed
  return redactedUrl;
};

/**
 * Log a message with proper formatting and redaction
 * Suppresses duplicate messages within configured time interval
 */
// --- patch: sistema avanzato di logging con deduplicazione
export const log = (
  category: string, 
  message: string, 
  type: 'info' | 'warn' | 'error' = 'info',
  data?: any
): void => {
  // Create a unique key for this log message
  const messageKey = `${category}:${message}`;
  const now = Date.now();
  
  // Check if this is a duplicate message within suppress interval
  if (recentLogMessages.has(messageKey)) {
    const lastTime = recentLogMessages.get(messageKey)!;
    if (now - lastTime < LOG_CONFIG.suppressDuplicateInterval) {
      // Skip duplicate log
      return;
    }
  }
  
  // Update timestamp for this message
  recentLogMessages.set(messageKey, now);
  
  // Clean old entries from the map
  cleanOldLogEntries();
  
  // Format the output
  const formattedMessage = `[${category}] ${message}`;
  
  // Log with appropriate level
  switch (type) {
    case 'warn':
      console.warn(formattedMessage, data ? data : '');
      break;
    case 'error':
      console.error(formattedMessage, data ? data : '');
      break;
    default:
      console.log(formattedMessage, data ? data : '');
  }
};

// Keep map size under control by cleaning old entries
const cleanOldLogEntries = (): void => {
  const now = Date.now();
  
  // Remove entries older than 2x the suppress interval
  recentLogMessages.forEach((timestamp, key) => {
    if (now - timestamp > LOG_CONFIG.suppressDuplicateInterval * 2) {
      recentLogMessages.delete(key);
    }
  });
};

// Overloaded versions of log for convenience
export const logInfo = (category: string, message: string, data?: any): void => {
  log(category, message, 'info', data);
};

export const logWarning = (category: string, message: string, data?: any): void => {
  log(category, message, 'warn', data);
};

export const logError = (category: string, message: string, data?: any): void => {
  log(category, message, 'error', data);
};

/**
 * Log an HTTP request with sensitive information redacted
 */
// --- patch: log per richieste HTTP con redaction
export const logRequest = (url: string, method = 'GET'): void => {
  logInfo('HTTP', `${method} ${redact(url)}`);
};

// Export default module
export default {
  log,
  logInfo,
  logWarning, 
  logError,
  logRequest,
  redact
};
