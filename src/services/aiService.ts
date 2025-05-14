// AI Service to handle DeepSeek API calls
const API_KEY = 'sk-69133b720ab34953a15d4f563870cae1';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Cache per evitare chiamate ripetute con gli stessi parametri
interface CacheEntry {
  timestamp: number;
  result: string;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minuti

// Flag per tenere traccia delle richieste in corso
interface PendingRequest {
  promise: Promise<string>;
  timestamp: number;
}
const pendingRequests: Record<string, PendingRequest> = {};

/**
 * Generate AI weather insights using DeepSeek API
 * @param location - City name
 * @param condition - Weather condition (sunny, cloudy, etc.)
 * @param temperature - Current temperature in °C
 * @param alerta - Weather alert if any
 * @returns Promise with AI-generated insight
 */
/**
 * Genera un ID univoco per la cache basato sui parametri di input
 */
const getCacheKey = (location: string, condition: string, temperature: number, alerta?: string): string => {
  return `${location}_${condition}_${temperature}_${alerta || 'noalert'}`;
};

/**
 * Verifica se i parametri della richiesta sono validi
 */
const validateParams = (location: string, condition: string, temperature: number): boolean => {
  return Boolean(location && condition && temperature !== undefined);
};

/**
 * Genera insight meteo utilizzando l'API DeepSeek con supporto per streaming, caching e prevenzione di loop
 */
export const getAIInsight = async (
  location: string, 
  condition: string, 
  temperature: number, 
  alerta?: string,
  onStreamUpdate?: (text: string) => void
): Promise<string> => {
  // Validazione parametri per prevenire chiamate con dati non validi
  if (!validateParams(location, condition, temperature)) {
    console.warn('Invalid parameters for AI insight');
    return 'Generazione non possibile: parametri mancanti.';
  }
  
  const cacheKey = getCacheKey(location, condition, temperature, alerta);
  
  // Controlla se abbiamo già una richiesta in corso per questi stessi parametri
  if (pendingRequests[cacheKey]) {
    const pending = pendingRequests[cacheKey];
    // Se la richiesta pendente è recente (meno di 30 secondi), ritorna la stessa promessa
    if (Date.now() - pending.timestamp < 30000) {
      return pending.promise;
    }
  }
  
  // Controlla se abbiamo già una risposta in cache per questi parametri
  if (cache[cacheKey]) {
    const entry = cache[cacheKey];
    // Se la cache è ancora valida (non più vecchia di TTL), ritorna il risultato
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      // Se è richiesto lo streaming, simula aggiornamenti progressivi del testo in cache
      if (onStreamUpdate) {
        const content = entry.result;
        const chunks = Math.ceil(content.length / 10);
        let currentPosition = 0;
        
        // Prima chiamata con messaggio iniziale
        onStreamUpdate('Generazione in corso...');
        
        // Simula lo streaming con piccoli ritardi
        const streamInterval = setInterval(() => {
          const nextPosition = Math.min(currentPosition + chunks, content.length);
          onStreamUpdate(content.substring(0, nextPosition));
          currentPosition = nextPosition;
          
          if (currentPosition >= content.length) {
            clearInterval(streamInterval);
          }
        }, 150);
      }
      return entry.result;
    }
  }
  
  // Crea una nuova promessa e tenla traccia come richiesta in corso
  const promise = (async () => {
    try {
      // Invia messaggio iniziale se richiesto lo streaming
      if (onStreamUpdate) {
        onStreamUpdate('Generazione in corso...');
      }
      
      const prompt = `Eres un canario simpático. Describe el clima en ${location} con ${temperature} grados y condición: ${condition}. ${alerta ? `Hay alerta: ${alerta}.` : 'No hay alertas.'} Sé gracioso y usa expresiones típicas canarias.`;
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          stream: Boolean(onStreamUpdate) // Abilita lo streaming se richiesto
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      let result = '';
      
      // Gestione dello streaming se supportato e richiesto
      if (onStreamUpdate && response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream reader not available');
        
        let partialText = '';
        
        // Leggi lo stream a blocchi
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decodifica i dati e aggiungi al testo parziale
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsedData = JSON.parse(data);
                const content = parsedData.choices?.[0]?.delta?.content || '';
                if (content) {
                  partialText += content;
                  onStreamUpdate(partialText);
                  result = partialText;
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
              }
            }
          }
        }
      } else {
        // Fallback al metodo standard se lo streaming non è supportato
        const data = await response.json();
        result = data.choices[0].message.content;
        if (onStreamUpdate) onStreamUpdate(result);
      }
      
      // Salva il risultato in cache
      cache[cacheKey] = {
        timestamp: Date.now(),
        result
      };
      
      return result;
    } catch (error) {
      console.error('Error getting AI insight:', error);
      const fallback = getFallbackInsight(location, condition, temperature, alerta);
      
      // Aggiorna lo streaming con il fallback se richiesto
      if (onStreamUpdate) onStreamUpdate(fallback);
      
      // Salva anche il fallback in cache per evitare richieste ripetute
      cache[cacheKey] = {
        timestamp: Date.now(),
        result: fallback
      };
      
      return fallback;
    } finally {
      // Rimuovi questa richiesta dall'elenco delle richieste in corso
      delete pendingRequests[cacheKey];
    }
  })();
  
  // Registra la promessa come richiesta in corso
  pendingRequests[cacheKey] = {
    promise,
    timestamp: Date.now()
  };
  
  return promise;
};

/**
 * Fallback function to generate insights when API fails
 */
export const getFallbackInsight = (
  location: string,
  condition: string,
  temperature: number,
  alerta?: string
): string => {
  // Pre-generated funny insights for different weather conditions
  const sunnyInsights = [
    `¡Ay mi niño! Hoy en ${location} tenemos un solecito de ${temperature}°C que te va a dejar más moreno que un guanche en la playa. ¡Ponte cremita o vas a acabar como una papa asada!`,
    `¡Madre mía qué calor, mi arma! ${temperature}°C en ${location} y un sol que pega más fuerte que mi abuela con la chancleta. ¡No te me olvides el agüita!`
  ];

  const cloudyInsights = [
    `¡Echa un vistazo a ese cielo, mi niño! ${temperature}°C en ${location} y está más nublado que el futuro de la UD Las Palmas. Pero tranqui, que aquí el gofio y el sol siempre vuelven.`,
    `¡Achísss! En ${location} estamos con ${temperature}°C y unas nubes que parecen algodón de azúcar. No te preocupes que en Canarias las nubes son pasajeras, como los turistas en chanclas y calcetines.`
  ];

  const rainyInsights = [
    `¡Cuidadito, mi niño! En ${location} está cayendo más agua que cuando mi vecina riega las plantas del balcón. Con ${temperature}°C y esta lluvia, si sales a la calle vas a volver más empapado que un escaldón de gofio.`,
    `¡Madre mía la que está cayendo en ${location}! ${temperature}°C y una lluvia que no es calima ni es na'. Coge el chubasquero o vas a acabar más mojado que un mojo picón.`
  ];

  let insight = '';
  
  // Select based on condition
  if (condition.includes('sunny') || condition.includes('clear')) {
    insight = sunnyInsights[Math.floor(Math.random() * sunnyInsights.length)];
  } else if (condition.includes('cloud')) {
    insight = cloudyInsights[Math.floor(Math.random() * cloudyInsights.length)];
  } else {
    insight = rainyInsights[Math.floor(Math.random() * rainyInsights.length)];
  }
  
  // Add alert message if present
  if (alerta) {
    insight += ` Y pendiente a esa alerta de "${alerta}" que está más seria que mi madre cuando le digo que no quiero más papas arrugadas.`;
  }
  
  return insight;
};
