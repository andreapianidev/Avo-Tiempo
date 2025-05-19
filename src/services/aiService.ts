// AI Service to handle DeepSeek API calls
import { WeatherAlert } from './aemetService';
import { POI } from './osmService';
import cacheService, { CacheNamespace } from './cacheService';

const API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY || 'sk-69133b720ab34953a15d4f563870cae1'; // Default if not in .env
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Cache entry structure for AI insights
interface AICacheEntry {
  timestamp: number;
  result: string;
}

const AI_CACHE_TTL = 20 * 60 * 1000; // 20 minuti

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
const getCacheKey = (
  location: string, 
  condition: string, 
  temperature: number, 
  alerts?: WeatherAlert[], 
  pois?: POI[]
): string => {
  const alertsKey = alerts?.length ? alerts.map(a => a.id || 'unknown_alert').join('_') : 'noalerts';
  const poisKey = pois?.length ? pois.slice(0, 3).map(p => p.id || 'unknown_poi').join('_') : 'nopois';
  return `${location}_${condition}_${temperature}_${alertsKey}_${poisKey}`;
};

/**
 * Verifica se i parametri della richiesta sono validi
 */
const validateParams = (location: string, condition: string, temperature: number): boolean => {
  return Boolean(location && condition && typeof temperature === 'number' && !isNaN(temperature));
};

/**
 * Fallback function to generate insights when API fails or for invalid params
 */
export const getFallbackInsight = (
  location: string,
  condition: string,
  temperature: number,
  alerts?: WeatherAlert[],
  pois?: POI[]
): string => {
  if (!validateParams(location, condition, temperature)) {
    return 'Urca! Sembra che manchino alcuni dati per darti un consiglio come si deve. Controlla e riprova, mi niño!';
  }
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
  
  const otherInsights = [
    `Tiempo un poco raro hoy en ${location} con ${temperature}°C, ¿no? Bueno, mientras no sea una calima de esas que te dejan el coche hecho un cromo... ¡todo bien! Dale suave y disfruta.`
  ];

  let insight = '';

  // Select based on condition
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) {
    insight = sunnyInsights[Math.floor(Math.random() * sunnyInsights.length)];
  } else if (lowerCondition.includes('cloud')) {
    insight = cloudyInsights[Math.floor(Math.random() * cloudyInsights.length)];
  } else if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('storm')) {
    insight = rainyInsights[Math.floor(Math.random() * rainyInsights.length)];
  } else {
    insight = otherInsights[Math.floor(Math.random() * otherInsights.length)];
  }

  // Add alert messages if present
  if (alerts && alerts.length > 0) {
    const alertText = alerts[0].phenomenon;
    insight += ` Y pendiente a esa alerta de "${alertText}" que está más seria que mi madre cuando le digo que no quiero más papas arrugadas.`;
  }

  // Add POI suggestion if available
  if (pois && pois.length > 0) {
    const randomPoi = pois[Math.floor(Math.random() * Math.min(3, pois.length))];
    if (randomPoi && randomPoi.name) {
      if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) {
        insight += ` ¡Chacho! Aprovecha para visitar ${randomPoi.name}, que está cerquita y con este tiempo está más bonito que un timple nuevo.`;
      } else if (lowerCondition.includes('rain')) {
        insight += ` Con esta lluvia, mejor quédate en casa o date una vueltita por ${randomPoi.name} cuando escampe un poco.`;
      } else {
        insight += ` Ya que estás por ahí, date una vuelta por ${randomPoi.name}, que está a tiro de piedra.`;
      }
    }
  }
  return insight;
};

/**
 * Genera insight meteo utilizzando l'API DeepSeek con supporto per streaming, caching e prevenzione di loop
 */
export const getAIInsight = async (
  location: string,
  condition: string,
  temperature: number,
  alerts?: WeatherAlert[],
  pois?: POI[],
  onStreamUpdate?: (text: string) => void
): Promise<string> => {
  // Validazione parametri per prevenire chiamate con dati non validi
  if (!validateParams(location, condition, temperature)) {
    console.warn('Invalid parameters for AI insight, returning fallback.');
    const fallback = getFallbackInsight(location, condition, temperature, alerts, pois);
    if (onStreamUpdate) onStreamUpdate(fallback);
    return fallback;
  }

  const cacheKey = getCacheKey(location, condition, temperature, alerts, pois);

  // Controlla se abbiamo già una richiesta in corso per questi stessi parametri
  if (pendingRequests[cacheKey]) {
    const pending = pendingRequests[cacheKey];
    // Se la richiesta pendente è recente (meno di 30 secondi), ritorna la stessa promessa
    if (Date.now() - pending.timestamp < 30000) { // 30 secondi di tolleranza per richieste pendenti
      if (onStreamUpdate) onStreamUpdate('Recuperando richiesta precedente...');
      return pending.promise;
    }
  }

  // Controlla se abbiamo già una risposta in cache (persistente) per questi parametri
  const cachedEntry = cacheService.getCacheItem<AICacheEntry>(CacheNamespace.AI_INSIGHTS, cacheKey);
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < AI_CACHE_TTL)) {
    if (onStreamUpdate) {
      const content = cachedEntry.result;
      const chunks = Math.max(1, Math.ceil(content.length / 10)); // Evita chunks di 0
      let currentPosition = 0;
      onStreamUpdate('Generazione in corso (da cache)...');
      const streamInterval = setInterval(() => {
        const nextPosition = Math.min(currentPosition + chunks, content.length);
        onStreamUpdate(content.substring(0, nextPosition));
        currentPosition = nextPosition;
        if (currentPosition >= content.length) {
          clearInterval(streamInterval);
        }
      }, 100); // Intervallo più breve per streaming da cache
    }
    return cachedEntry.result;
  }

  // Crea una nuova promessa e tenla traccia come richiesta in corso
  const promise = (async () => {
    try {
      if (onStreamUpdate) {
        onStreamUpdate('Generazione in corso (da API)...');
      }

      let alertsText = '';
      if (alerts && alerts.length > 0) {
        alertsText = 'Allerte attive: ' + alerts.map(alert => alert.phenomenon).join(', ') + '. ';
      }

      let poisText = '';
      if (pois && pois.length > 0) {
        poisText = 'Punti di interesse nelle vicinanze: ';
        const poisByCategory: Record<string, POI[]> = {};
        pois.forEach(poi => {
          const category = poi.category || 'other';
          if (!poisByCategory[category]) {
            poisByCategory[category] = [];
          }
          poisByCategory[category].push(poi);
        });
        Object.entries(poisByCategory).forEach(([category, categoryPois]) => {
          const categoryName = {
            'shop': 'Negozi', 'tourism': 'Turismo', 'historic': 'Storici',
            'natural': 'Natura', 'food': 'Cibo', 'sport': 'Sport',
            'leisure': 'Ocio', 'amenity': 'Servicios', 'other': 'Altri'
          }[category] || category;
          poisText += `${categoryName}: ${categoryPois.slice(0, 3).map(p => p.name).join(', ')}. `;
        });
      }

      const prompt = `Eres un auténtico canario de toda la vida que da consejos sobre el tiempo y actividades en las islas.
      Información actual:
      - Ubicación: ${location}
      - Temperatura: ${temperature}°C
      - Condizione: ${condition}
      ${alertsText ? `- ${alertsText}
` : ''}${poisText ? `- ${poisText}
` : ''}
      Regole per la risposta:
      1. Tono umoristico e colloquiale, come se parlassi con un amico canario.
      2. Usa espressioni tipiche canarie (es. mi niño, chacho, agüita, etc.).
      3. Sii breve e conciso.
      4. Non inventare informazioni, basati solo sui dati forniti.
      5. Se ci sono allerte, menziona la più importante in modo canario.
      6. Se ci sono POI, suggerisci uno o due POI adatti al meteo.
      7. Limita tu risposta a 3-4 frasi cortas e con molta personalità canaria.
      8. NO uses lenguaje artificial o académico, parla come un autentico canario de barrio.`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          stream: !!onStreamUpdate, // Converti a booleano
          max_tokens: 150,
          temperature: 0.7 // Un po' di creatività
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }

      let result = '';
      if (onStreamUpdate && response.body && response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let partialText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6);
              if (jsonStr.trim() === '[DONE]') break;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  partialText += parsed.choices[0].delta.content;
                  onStreamUpdate(partialText);
                }
              } catch (e) { /* console.warn('Error parsing stream fragment:', e, jsonStr); */ }
            }
          }
          result = partialText; // Aggiorna result ad ogni frammento valido
        }
      } else {
        const data = await response.json();
        result = data.choices[0].message.content;
        if (onStreamUpdate) onStreamUpdate(result);
      }

      if (!result.trim()) { // Se il risultato è vuoto o solo spazi bianchi
        throw new Error('API returned empty insight');
      }

      cacheService.setCacheItem<AICacheEntry>(
        CacheNamespace.AI_INSIGHTS,
        cacheKey,
        { timestamp: Date.now(), result },
        AI_CACHE_TTL
      );
      return result;
    } catch (error: any) {
      console.error('Error getting AI insight from API:', error.message);
      const fallback = getFallbackInsight(location, condition, temperature, alerts, pois);
      if (onStreamUpdate) onStreamUpdate(fallback + ' (da fallback)');
      cacheService.setCacheItem<AICacheEntry>(
        CacheNamespace.AI_INSIGHTS,
        cacheKey,
        { timestamp: Date.now(), result: fallback }, // Cache fallback on error
        AI_CACHE_TTL
      );
      return fallback;
    } finally {
      delete pendingRequests[cacheKey];
    }
  })();

  pendingRequests[cacheKey] = {
    promise,
    timestamp: Date.now()
  };
  return promise;
};
