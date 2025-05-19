import { redact, log } from '../logger';

// Mock di console.log/warn/error
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

describe('Logger utils', () => {
  beforeEach(() => {
    // Setup console mocks
    console.log = mockLog;
    console.warn = mockWarn;
    console.error = mockError;
    // Clear mocks before each test
    mockLog.mockClear();
    mockWarn.mockClear();
    mockError.mockClear();
    // Reset map di messaggi recenti (access private map via any)
    (global as any).recentLogMessages = new Map();
  });

  afterAll(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('redact function', () => {
    test('should redact API key from URL', () => {
      const url = 'https://api.openweathermap.org/data/2.5/weather?q=Madrid&appid=b33c9835879f888134e97c6d58d6e4a7&units=metric';
      const redactedUrl = redact(url);
      
      // Verifico che la chiave API sia stata nascosta
      expect(redactedUrl).toContain('appid=***');
      expect(redactedUrl).not.toContain('b33c9835879f888134e97c6d58d6e4a7');
      
      // Verifico che il resto dell'URL sia rimasto intatto
      expect(redactedUrl).toContain('https://api.openweathermap.org/data/2.5/weather');
      expect(redactedUrl).toContain('q=Madrid');
      expect(redactedUrl).toContain('units=metric');
    });
    
    test('should handle URLs without API keys', () => {
      const url = 'https://api.example.com/data/get?param=value';
      const redactedUrl = redact(url);
      
      // L'URL dovrebbe rimanere invariato
      expect(redactedUrl).toEqual(url);
    });
    
    test('should handle empty or undefined input', () => {
      expect(redact('')).toEqual('');
      expect(redact(undefined as any)).toBeUndefined();
    });
    
    test('should handle multiple API keys in the URL', () => {
      const url = 'https://api.example.com/data?appid=key1&user=test&anotherappid=key2';
      const redactedUrl = redact(url);
      
      expect(redactedUrl).toContain('appid=***');
      expect(redactedUrl).toContain('anotherappid=key2'); // Solo il parametro esatto viene nascosto
      expect(redactedUrl).not.toContain('key1');
    });
  });

  // Test per la deduplicazione dei log
  describe('log deduplication', () => {
    test('should not log duplicate messages within suppression interval', () => {
      // Prima chiamata - dovrebbe essere loggata
      log('TEST', 'Messaggio di test', 'info');
      expect(mockLog).toHaveBeenCalledTimes(1);
      
      // Seconda chiamata con lo stesso messaggio - dovrebbe essere soppressa
      log('TEST', 'Messaggio di test', 'info');
      expect(mockLog).toHaveBeenCalledTimes(1); // Ancora solo 1 chiamata
      
      // Messaggio diverso - dovrebbe essere loggato
      log('TEST', 'Altro messaggio', 'info');
      expect(mockLog).toHaveBeenCalledTimes(2);
      
      // Stessa categoria ma messaggio diverso - dovrebbe essere loggato
      log('TEST', 'Terzo messaggio', 'info');
      expect(mockLog).toHaveBeenCalledTimes(3);
      
      // Messaggio identico ma categoria diversa - dovrebbe essere loggato
      log('ALTRA', 'Messaggio di test', 'info');
      expect(mockLog).toHaveBeenCalledTimes(4);
    });
    
    test('should log with appropriate level', () => {
      log('TEST', 'Info message', 'info');
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledTimes(0);
      expect(mockError).toHaveBeenCalledTimes(0);
      
      log('TEST', 'Warning message', 'warn');
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledTimes(0);
      
      log('TEST', 'Error message', 'error');
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledTimes(1);
    });
    
    test('should handle optional data parameter', () => {
      const testData = { value: 42 };
      log('TEST', 'Message with data', 'info', testData);
      expect(mockLog).toHaveBeenCalledWith('[TEST] Message with data', testData);
    });
  });
});
