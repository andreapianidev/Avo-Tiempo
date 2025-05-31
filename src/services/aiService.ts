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

interface DailyActivitySuggestionResponse {
  title: string;
  description: string;
  poiSuggestions: string[];
  poiDetails?: {
    name: string;
    category: string;
    description: string;
    distance: number;
    bestTimeToVisit?: string;
  }[];
  weatherTip?: string;
  activityDuration?: string;
  alternativeActivity?: string;
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
 * Overloaded per supportare sia richieste formattate che prompt diretti
 */
export async function getAIInsight(prompt: string): Promise<string>;
export async function getAIInsight(
  location: string,
  condition: string,
  temperature: number,
  alerts?: WeatherAlert[],
  pois?: POI[],
  onStreamUpdate?: (text: string) => void
): Promise<string>;
export async function getAIInsight(
  locationOrPrompt: string,
  condition?: string,
  temperature?: number,
  alerts?: WeatherAlert[],
  pois?: POI[],
  onStreamUpdate?: (text: string) => void
): Promise<string> {
  // Verifica se è una chiamata con prompt diretto
  if (condition === undefined && temperature === undefined) {
    const prompt = locationOrPrompt;
    const cacheKey = `direct_prompt_${prompt.substring(0, 50).replace(/\s+/g, '_')}`;
    
    // Verifica nella cache
    const cachedInsight = cacheService.getCacheItem<AICacheEntry>(CacheNamespace.AI_INSIGHTS, cacheKey);
    if (cachedInsight && Date.now() - cachedInsight.timestamp < 3600000) { // 1 ora di cache
      console.log('Servito insight AI dalla cache per prompt diretto');
      return cachedInsight.result;
    }
    
    try {
      // Richiedi insight da DeepSeek
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'Sei un assistente meteo amichevole che parla in stile canaro, utilizzando espressioni tipiche delle Isole Canarie come "mi niño", "chacho", "guagua", "papa", "mojo", "gofio". Mantieni sempre questo stile distintivo e divertente.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`Errore API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || 'Non sono riuscito a generare un insight, mi niño.';
      
      // Salva nella cache
      const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 ore in millisecondi
      cacheService.setCacheItem(CacheNamespace.AI_INSIGHTS, cacheKey, {
        timestamp: Date.now(),
        result
      }, CACHE_TTL);
      
      return result;
    } catch (error) {
      console.error('Errore nella generazione dell\'insight AI da prompt diretto:', error);
      return 'Mi dispiace, c\'è stato un problema a generare l\'insight. Riprova più tardi, mi niño!';
    }
  }
  
  // Se non è un prompt diretto, usa il comportamento originale
  // Validazione parametri per prevenire chiamate con dati non validi
  if (!validateParams(locationOrPrompt, condition!, temperature!)) {
    console.warn('Invalid parameters for AI insight, returning fallback.');
    const fallback = getFallbackInsight(locationOrPrompt, condition!, temperature!, alerts, pois);
    if (onStreamUpdate) onStreamUpdate(fallback);
    return fallback;
  }

  const cacheKey = getCacheKey(locationOrPrompt, condition!, temperature!, alerts, pois);

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
      - Ubicación: ${locationOrPrompt}
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
      const fallback = getFallbackInsight(locationOrPrompt, condition!, temperature!, alerts, pois);
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

/**
 * Genera suggerimenti di attività giornaliere basati su meteo, ora del giorno e POI disponibili
 * Utilizza DeepSeek API per generare consigli personalizzati in stile canaro
 */
// Genera durata consigliata per l'attività
const getFallbackActivityDuration = (condition: string, timeOfDay: string): string => {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain')) {
    return "1-2 ore";
  }
  
  if (timeOfDay === 'morning') {
    return "3-4 ore";
  }
  
  if (timeOfDay === 'afternoon') {
    return "2-3 ore";
  }
  
  if (timeOfDay === 'evening') {
    return "2-3 ore";
  }
  
  return "1-2 ore";
};

// Genera attività alternativa in caso di cambio meteo
const getFallbackAlternativeActivity = (condition: string, timeOfDay: string): string => {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    return "Si empieza a llover, siempre puedes refugiarte en algún museo o centro comercial cerquita, mi niño. ¡Las Canarias están llenas de rinconcitos por descubrir!";
  }
  
  if (conditionLower.includes('rain')) {
    return "Si para de llover, aprovecha para darte un paseíto rápido por alguna zona con techo, como una galería comercial o un paseo marítimo cubierto, chacho.";
  }
  
  if (conditionLower.includes('cloud')) {
    if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
      return "Si el sol se decide a salir entre las nubes, no desaproveches y vete a una terracita o a una playita cercana, mi niño.";
    } else {
      return "Si las nubes se ponen más feas, mejor busca un bar o restaurante acogedor y disfruta de la gastronomía local, chacho.";
    }
  }
  
  return "Si el tiempo cambia, siempre puedes adaptarte. ¡Esa es la magia de las Canarias, mi niño!";
};

// Genera dettagli sui POI consigliati
const getFallbackPOIDetails = (pois: any[], condition: string, timeOfDay: string): any[] => {
  if (!pois || pois.length === 0) {
    const defaultPOIs = [];
    
    // POI di default basati su meteo e ora del giorno
    if (condition.includes('clear')) {
      if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
        defaultPOIs.push({
          name: "Parque Nacional del Teide",
          category: "Parco Nazionale",
          description: "¡Un paraíso pa' los amantes de la naturaleza, mi niño! Con vistas que te dejan sin palabras y senderos para todos los niveles.",
          distance: 15.7,
          bestTimeToVisit: "Prima mattina"
        });
        
        defaultPOIs.push({
          name: "Playa de Las Teresitas",
          category: "Spiaggia",
          description: "Arena doradita traída del Sahara, palmeras y agüita tranquila. ¡Un cachito de paraíso pa' relajarte, chacho!",
          distance: 4.2,
          bestTimeToVisit: "Pomeriggio"
        });
      } else {
        defaultPOIs.push({
          name: "Mirador de la Concepción",
          category: "Punto panoramico",
          description: "Las luces de la ciudad a tus pies, mi niño. De noche este sitio es más romántico que una telenovela venezolana.",
          distance: 2.5,
          bestTimeToVisit: "Tramonto"
        });
      }
    } else if (condition.includes('rain')) {
      defaultPOIs.push({
        name: "Museo de la Naturaleza y el Hombre",
        category: "Museo",
        description: "Pa' cuando llueve no hay nada mejor que un poquito de cultura, chacho. Aquí tienes momias guanches y to'.",
        distance: 1.8,
        bestTimeToVisit: "Qualsiasi ora"
      });
      
      defaultPOIs.push({
        name: "Centro Comercial Meridiano",
        category: "Centro commerciale",
        description: "Tienditas, restaurantes y cine, todo bajo un mismo techo. Para refugiarse de la lluvia y hacer tiempito, mi niño.",
        distance: 3.2,
        bestTimeToVisit: "Pomeriggio"
      });
    } else {
      defaultPOIs.push({
        name: "Sendero de Anaga",
        category: "Sentiero naturale",
        description: "Un bosquito de laurisilva que parece sacado de una película de fantasía, chacho. La vegetación más antigua de Europa, ¡nada menos!",
        distance: 8.5,
        bestTimeToVisit: "Mattina"
      });
    }
    
    return defaultPOIs;
  }
  
  // Se ci sono POI disponibili, arricchisci i dati
  return pois.slice(0, 3).map(poi => ({
    name: poi.name,
    category: poi.category,
    description: getRandomPOIDescription(poi.category),
    distance: poi.distance,
    bestTimeToVisit: getBestTimeToVisit(poi.category, timeOfDay)
  }));
};

// Helper per generare descrizioni casuali per i POI
const getRandomPOIDescription = (category: string): string => {
  const descriptions: Record<string, string[]> = {
    beach: [
      "Una playita con un agua más clara que mis ideas un lunes por la mañana, mi niño. ¡Paraíso puro!",
      "Arena fina, agüita cristalina y un solecito que te deja más moreno que un canario en agosto, chacho."
    ],
    park: [
      "Un cachito de naturaleza en medio del bullicio, con plantitas y pajaritos que te alegran el día, mi niño.",
      "Más verde que una papaya y más tranquilo que una siesta después del puchero, ¡un gustito pa' los sentidos!"
    ],
    restaurant: [
      "Aquí se come de rechupete, mi niño. Las papas arrugás y el mojo te dejan con ganas de repetir.",
      "Un sitio pa' chuparse los dedos con comidita canaria que te deja más contento que un niño con un helado."
    ],
    museum: [
      "Culturita pa' los días de lluvia, chacho. Aunque no seas muy de museos, este tiene su puntito.",
      "Historia de las islitas en un edificio bien chulo. Pa' presumir luego de culturizado, mi niño."
    ],
    viewpoint: [
      "Vistas que te quitan el habla, mi niño. Trae la cámara porque esto ni el mejor filtro de Instagram lo mejora.",
      "Desde aquí ves la isla enterita, chacho. Más bonito que un atardecer en postal turística."
    ],
    default: [
      "Un sitio más auténtico que el gofio, mi niño. De esos que no salen en las guías pero merecen la pena.",
      "Un lugarcito con encanto canario del bueno, chacho. De los que luego recuerdas con una sonrisita."
    ]
  };
  
  const options = descriptions[category as keyof typeof descriptions] || descriptions.default;
  return options[Math.floor(Math.random() * options.length)];
};

// Helper per determinare il momento migliore per visitare un POI
const getBestTimeToVisit = (category: string, currentTimeOfDay: string): string => {
  switch(category) {
    case 'beach':
      return currentTimeOfDay === 'morning' ? 'Mattina presto o tardo pomeriggio' : 'Mattina presto';
    case 'park':
      return 'Tutto il giorno';
    case 'restaurant':
      return currentTimeOfDay === 'morning' ? 'Pranzo o cena' : 'Adesso';
    case 'museum':
      return 'Mattina (meno affollato)';
    case 'viewpoint':
      return 'Tramonto';
    default:
      return 'Qualsiasi ora è buona';
  }
};

export const generateDailyActivitySuggestion = async (
  context: {
    weather: {
      condition: string;
      temperature: number;
      humidity: number;
      windSpeed: number;
    };
    location: string;
    time: {
      hour: number;
      timeOfDay: string;
      isWeekend: boolean;
    };
    availablePOIs: {
      name: string;
      category: string;
      distance: number;
      type: string;
    }[];
  }
): Promise<DailyActivitySuggestionResponse> => {
  const { weather, location, time, availablePOIs } = context;
  
  // Genera una cache key unica basata sui parametri principali
  const cacheKey = `daily_activity_${location}_${weather.condition}_${time.timeOfDay}_${time.isWeekend ? 'weekend' : 'weekday'}`;
  
  // Verifica se esiste una versione in cache
  const cachedSuggestion = cacheService.getCacheItem<{
    timestamp: number;
    result: DailyActivitySuggestionResponse;
  }>(CacheNamespace.AI_INSIGHTS, cacheKey);
  
  if (cachedSuggestion && (Date.now() - cachedSuggestion.timestamp < AI_CACHE_TTL)) {
    return cachedSuggestion.result;
  }
  
  // Verifica se c'è una richiesta pendente con gli stessi parametri
  if (pendingRequests[cacheKey]) {
    const pending = pendingRequests[cacheKey];
    if (Date.now() - pending.timestamp < 30000) { // 30 secondi di timeout
      return pending.promise as unknown as DailyActivitySuggestionResponse;
    }
    delete pendingRequests[cacheKey];
  }
  
  // Crea una nuova richiesta
  const promise = (async () => {
    try {
      // Prepara il testo dei POI
      let poisText = '';
      if (availablePOIs && availablePOIs.length > 0) {
        const categoryMap: Record<string, Array<typeof availablePOIs[0]>> = {};
        
        availablePOIs.forEach(poi => {
          const category = poi.category || 'altro';
          if (!categoryMap[category]) categoryMap[category] = [];
          categoryMap[category].push(poi);
        });
        
        Object.entries(categoryMap).forEach(([category, pois]) => {
          const categoryName = {
            'restaurant': 'Restaurantes',
            'attraction': 'Atracciones',
            'beach': 'Playas',
            'museum': 'Museos',
            'park': 'Parques',
            'viewpoint': 'Miradores',
            'shop': 'Tiendas',
            'hotel': 'Hoteles',
            'bar': 'Bares',
            'cafe': 'Cafeterías'
          }[category] || category;
          
          poisText += `${categoryName}: ${pois.slice(0, 3).map(p => 
            `${p.name} (a ${(p.distance / 1000).toFixed(1)} km)`
          ).join(', ')}. `;
        });
      }

      const prompt = `Sei un assistente turistico delle Isole Canarie esperto e umoristico, che fornisce consigli sulle attività da fare durante la giornata in base al meteo e all'ora.

Informazioni attuali:
- Luogo: ${location}
- Meteo: ${weather.condition}, temperatura ${weather.temperature}°C, umidità ${weather.humidity}%, vento ${weather.windSpeed} km/h
- Orario: ${time.hour}:00 (${time.timeOfDay}), ${time.isWeekend ? 'weekend' : 'giorno feriale'}
${poisText ? `- POI disponibili: ${poisText}` : '- Nessun POI specifico disponibile nelle vicinanze'}

Compito: Genera un consiglio dettagliato sulle attività da fare oggi in base a meteo, ora e luoghi disponibili.
Usa un tono umoristico e amichevole in stile canaro (dialetto delle Canarie), con espressioni tipiche come "mi niño", "chacho", ecc.

Risposta necessaria in formato JSON con questi campi:
{
  "title": "Titolo accattivante per il suggerimento",
  "description": "Descrizione divertente e utile dell'attività consigliata in stile canaro",
  "poiSuggestions": ["Lista di 2-4 luoghi specifici consigliati tra quelli disponibili"],
  "poiDetails": [
    {
      "name": "Nome del POI",
      "category": "Categoria (es. parco, spiaggia, ristorante)",
      "description": "Breve descrizione attraente del luogo in stile canaro",
      "distance": 2.5,
      "bestTimeToVisit": "Periodo ideale della giornata per visitare questo luogo"
    }
  ],
  "weatherTip": "Consiglio specifico sul tempo meteorologico (cosa portare, come vestirsi)",
  "activityDuration": "Suggerimento sulla durata ideale dell'attività (es. mezza giornata, 2-3 ore)",
  "alternativeActivity": "Un'attività alternativa in caso di cambiamento del meteo o altre circostanze"
}

Esempio di risposta:
{
  "title": "¡Dale al senderismo con este solito, chacho!",
  "description": "Con 18°C y un cielito limpio como el cristal de la abuela, es hora de estirar las patas y darse una vuelta por la naturaleza. El viento fresco te hará sentir como si volaras, mi niño, ¡pero sin necesidad de alas!",
  "poiSuggestions": ["Parque Nacional del Teide", "Sendero de los Sentidos", "Bosque de la Esperanza"],
  "poiDetails": [
    {
      "name": "Parque Nacional del Teide",
      "category": "Parco Nazionale",
      "description": "¡Un paraíso pa' los amantes de la naturaleza, mi niño! Con vistas que te dejan sin palabras y senderos para todos los niveles.",
      "distance": 15.7,
      "bestTimeToVisit": "Prima mattina"
    }
  ],
  "weatherTip": "Lleva una chaquetita ligera que en altura refresca, y no te olvides la cremita solar que el sol canario engaña, chacho.",
  "activityDuration": "3-4 ore",
  "alternativeActivity": "Si el cuerpo no te pide mucho movimiento, una vuelta por el jardín botánico tampoco está mal, mi niño."
}

NOTA: Usa nomi POI specifici dalla lista fornita. Ogni campo è importante, ma poiDetails deve contenere almeno 2-3 luoghi con descrizioni originali e pertinenti. Se non ci sono abbastanza POI, generalizza ma mantieni uno stile autentico canario. La risposta deve essere in formato JSON valido.`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      let result = data.choices[0].message.content;
      
      // Rimuovi eventuali markdown code blocks
      result = result.replace(/```json\n/g, '').replace(/```/g, '');
      
      // Parsing della risposta JSON
      let parsedResponse: DailyActivitySuggestionResponse;
      try {
        // Pre-processo del risultato per gestire casi comuni di JSON malformato
        // Rimuove eventuali caratteri non JSON all'inizio e alla fine
        const cleanedResult = result.trim()
          .replace(/^[\s\S]*?\{/, '{') // Trova la prima parentesi graffa
          .replace(/\}[\s\S]*$/, '}'); // Rimuovi tutto dopo l'ultima parentesi graffa
        
        console.log('AI Service: JSON pulito da processare:', cleanedResult);
        
        try {
          parsedResponse = JSON.parse(cleanedResult);
        } catch (parseError) {
          // Se fallisce ancora, prova a riparare la stringa JSON più aggressivamente
          console.error('Primo tentativo di parsing fallito, provo a riparare:', parseError);
          
          // Mostra i primi e ultimi 100 caratteri per debug
          const startChars = cleanedResult.substring(0, 100);
          const endChars = cleanedResult.substring(cleanedResult.length - 100);
          console.error(`Inizio JSON: ${startChars}...`);
          console.error(`Fine JSON: ...${endChars}`);
          
          // Fallback finale: genera una risposta di fallback
          throw new Error('JSON malformato, impossibile riparare');
        }
        
        // Verifica che tutti i campi siano presenti
        if (!parsedResponse.title || !parsedResponse.description) {
          console.error('Campi mancanti nella risposta:', parsedResponse);
          throw new Error('Risposta incompleta');
        }
        
        // Assicurati che poiSuggestions sia un array
        if (!Array.isArray(parsedResponse.poiSuggestions)) {
          console.warn('poiSuggestions non è un array, inizializzato vuoto');
          parsedResponse.poiSuggestions = [];
        }
      } catch (err) {
        console.error('Error parsing AI response:', err);
        // Type check per assicurarsi che err sia un Error object
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`Impossibile analizzare la risposta AI: ${errorMessage}`);
      }
      
      // Salva in cache
      cacheService.setCacheItem(
        CacheNamespace.AI_INSIGHTS,
        cacheKey,
        { timestamp: Date.now(), result: parsedResponse },
        AI_CACHE_TTL
      );
      
      return parsedResponse;
    } catch (error: any) {
      console.error('Error getting activity suggestion from API:', error.message);
      
      // Fallback response con dati più dettagliati
      const fallbackResponse: DailyActivitySuggestionResponse = {
        title: getFallbackTitle(weather.condition, time.timeOfDay),
        description: getFallbackDescription(weather.condition, time.timeOfDay, weather.temperature, location),
        poiSuggestions: getFallbackPOISuggestions(availablePOIs, weather.condition, time.timeOfDay),
        weatherTip: getFallbackWeatherTip(weather.condition, weather.temperature, time.timeOfDay),
        activityDuration: getFallbackActivityDuration(weather.condition, time.timeOfDay),
        alternativeActivity: getFallbackAlternativeActivity(weather.condition, time.timeOfDay),
        poiDetails: getFallbackPOIDetails(availablePOIs, weather.condition, time.timeOfDay)
      };
      
      // Cache fallback response
      cacheService.setCacheItem(
        CacheNamespace.AI_INSIGHTS,
        cacheKey,
        { timestamp: Date.now(), result: fallbackResponse },
        AI_CACHE_TTL
      );
      
      return fallbackResponse;
    } finally {
      delete pendingRequests[cacheKey];
    }
  })();
  
  pendingRequests[cacheKey] = {
    promise: promise as unknown as Promise<string>,
    timestamp: Date.now()
  };
  
  return promise;
};

/**
 * Genera un titolo di fallback basato su meteo e ora del giorno
 */
const getFallbackTitle = (condition: string, timeOfDay: string): string => {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    if (timeOfDay === 'morning') return '¡Buenos días con sol radiante!';
    if (timeOfDay === 'afternoon') return '¡Tarde perfecta para disfrutar!';
    if (timeOfDay === 'evening') return '¡Noche estrellada para salir!';
    return '¡Día perfecto para aventuras!';
  }
  
  if (conditionLower.includes('cloud')) {
    return '¡Un día tranquilo para explorar!';
  }
  
  if (conditionLower.includes('rain')) {
    return '¡Día de planes bajo techo, mi niño!';
  }
  
  return '¡Aprovecha el día, chacho!';
};

/**
 * Genera una descrizione di fallback basata su meteo e ora del giorno
 */
const getFallbackDescription = (condition: string, timeOfDay: string, temperature: number, location: string): string => {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    if (timeOfDay === 'morning') {
      return `¡Despierta y brilla, mi niño! Con ${temperature}°C y este sol en ${location}, es el momento perfecto para un desayunito en una terraza y después una caminata por la costa. ¡Ponte cremita que quemas!`;
    }
    if (timeOfDay === 'afternoon') {
      return `¡Chacho, qué tarde más buena en ${location}! Con ${temperature}°C y este solecito, yo me iría a una playita o a tomar algo en una terraza con vistas. ¡La vida es para disfrutarla!`;
    }
    return `La noche está estupenda en ${location}, con ${temperature}°C y cielo despejado. Perfecta para cenar fuera y dar un paseíto después. ¡Que la noche es joven, mi niño!`;
  }
  
  if (conditionLower.includes('cloud')) {
    return `Hoy en ${location} hay unas nubecitas con ${temperature}°C, pero no pasa nada. Es un día perfecto para conocer museos, ir de shopping o sentarte en un café a ver pasar a la gente. ¡Tú tranqui!`;
  }
  
  if (conditionLower.includes('rain')) {
    return `¡Ains mi niño! Está cayendo agüita en ${location} con ${temperature}°C. Día perfecto para probar un restaurante típico, visitar un museo o ver una peli. ¡La lluvia también tiene su encanto, chacho!`;
  }
  
  return `Día interesante en ${location} con ${temperature}°C. Yo aprovecharía para descubrir algún sitio nuevo o tomar algo tranquilamente. ¡La vida hay que vivirla, mi niño!`;
};

/**
 * Genera suggerimenti meteo specifici basati sulle condizioni del tempo
 */
const getFallbackWeatherTip = (condition: string, temperature: number, timeOfDay: string): string => {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain')) {
    return 'Llévate el paraguitas y un calzado que aguante agua, mi niño. Y una chaquetita impermeable nunca está de más, chacho.';
  } else if (conditionLower.includes('clear')) {
    if (temperature > 25) {
      return 'Protector solar factor 50 como mínimo, mi niño. El sol canario no perdona, y un sombrerito y agua pa’ no deshidratarse, chacho.';
    } else if (timeOfDay === 'night') {
      return 'Aunque estemos en Canarias, por la noche refresca. Una rebequita ligera te vendrá de perlas, chacho.';
    } else {
      return 'Un poco de protector solar y agua suficiente. El día está perfecto para andar sin preocupaciones, mi niño.';
    }
  } else if (conditionLower.includes('cloud')) {
    return 'Con estas nubecitas el sol juega al escondite, pero no te confíes. Lleva protección solar y una chaquetita por si refresca, chacho.';
  } else if (conditionLower.includes('wind')) {
    return 'Con este vientecito mejor no llevar sombrero que se vuela, mi niño. Y una chaquetita cortavientos te hará sentir como en casa.';
  } else {
    return 'Vestimenta cómoda y ligera, botella de agua y mucha actitud positiva, ¡así se disfruta Canarias, chacho!';
  }
};

/**
 * Genera suggerimenti POI di fallback basati su meteo e ora del giorno
 */
const getFallbackPOISuggestions = (
  availablePOIs: {
    name: string;
    category: string;
    distance: number;
    type: string;
  }[],
  condition: string, 
  timeOfDay: string
): string[] => {
  if (!availablePOIs || availablePOIs.length === 0) {
    return [];
  }
  
  const conditionLower = condition.toLowerCase();
  const suggestions: string[] = [];
  
  // Filtra POI in base a meteo e ora
  if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
    // Con bel tempo, suggerisci spiagge, parchi, punti panoramici
    const outdoorPOIs = availablePOIs.filter(poi => 
      ['beach', 'park', 'viewpoint', 'attraction'].includes(poi.category)
    );
    
    // Aggiungi fino a 2 POI all'aperto
    outdoorPOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .forEach(poi => suggestions.push(`${poi.name} (${poi.category})`));
    
    // Aggiungi anche un ristorante o bar per il dopo
    const foodPOI = availablePOIs.find(poi => ['restaurant', 'bar', 'cafe'].includes(poi.category));
    if (foodPOI) suggestions.push(`${foodPOI.name} (${foodPOI.category})`);
  } else {
    // Con brutto tempo, suggerisci musei, ristoranti, negozi
    const indoorPOIs = availablePOIs.filter(poi => 
      ['museum', 'restaurant', 'shop', 'bar', 'cafe'].includes(poi.category)
    );
    
    // Aggiungi fino a 3 POI al chiuso
    indoorPOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .forEach(poi => suggestions.push(`${poi.name} (${poi.category})`));
  }
  
  // Se non abbiamo abbastanza suggerimenti, aggiungi qualsiasi POI vicino
  if (suggestions.length < 2) {
    availablePOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3 - suggestions.length)
      .forEach(poi => {
        if (!suggestions.some(s => s.includes(poi.name))) {
          suggestions.push(`${poi.name} (${poi.category})`);
        }
      });
  }
  
  return suggestions;
};
