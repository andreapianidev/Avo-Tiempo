import { POI } from '../services/osmService';

/**
 * Raggruppa i POI per categoria e conta quanti ce ne sono per ogni categoria
 * @param pois Array di POI da analizzare
 * @returns Un oggetto con le categorie come chiavi e il conteggio come valori
 */
export const countPOIsByCategory = (pois: POI[]): Record<string, number> => {
  const categoryCounts: Record<string, number> = {};
  
  pois.forEach(poi => {
    const category = poi.category || 'altro';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  return categoryCounts;
};

/**
 * Calcola la distanza media dei POI dalla posizione corrente
 * @param pois Array di POI da analizzare
 * @returns La distanza media in metri
 */
export const calculateAverageDistance = (pois: POI[]): number => {
  if (pois.length === 0) return 0;
  
  const totalDistance = pois.reduce((sum, poi) => sum + (poi.distance || 0), 0);
  return totalDistance / pois.length;
};

/**
 * Trova i POI più rilevanti in base alla distanza e all'interesse
 * @param pois Array di POI da analizzare
 * @param limit Numero massimo di POI da restituire
 * @returns Array di POI ordinati per rilevanza
 */
export const getTopRatedPOIs = (pois: POI[], limit: number = 5): POI[] => {
  return [...pois]
    .filter(poi => poi.isInteresting) // Filtriamo solo i POI interessanti
    .sort((a, b) => {
      // Ordiniamo prima per interesse, poi per distanza
      if (a.isInteresting !== b.isInteresting) {
        return a.isInteresting ? -1 : 1;
      }
      // A parità di interesse, ordiniamo per distanza (più vicini prima)
      return a.distance - b.distance;
    })
    .slice(0, limit);
};

/**
 * Raggruppa i POI per fascia di distanza
 * @param pois Array di POI da analizzare
 * @returns Un oggetto con le fasce di distanza come chiavi e il conteggio come valori
 */
export const groupPOIsByDistanceRange = (pois: POI[]): Record<string, number> => {
  const distanceRanges: Record<string, number> = {
    '0-500m': 0,
    '500m-1km': 0,
    '1km-2km': 0,
    '2km-5km': 0,
    '5km-10km': 0,
    '10km+': 0
  };
  
  pois.forEach(poi => {
    const distance = poi.distance || 0;
    
    if (distance < 500) {
      distanceRanges['0-500m']++;
    } else if (distance < 1000) {
      distanceRanges['500m-1km']++;
    } else if (distance < 2000) {
      distanceRanges['1km-2km']++;
    } else if (distance < 5000) {
      distanceRanges['2km-5km']++;
    } else if (distance < 10000) {
      distanceRanges['5km-10km']++;
    } else {
      distanceRanges['10km+']++;
    }
  });
  
  return distanceRanges;
};

/**
 * Calcola la densità dei POI in diverse direzioni (nord, sud, est, ovest)
 * @param pois Array di POI da analizzare
 * @param currentLat Latitudine corrente
 * @param currentLon Longitudine corrente
 * @returns Un oggetto con le direzioni come chiavi e il conteggio come valori
 */
export const calculatePOIDensityByDirection = (
  pois: POI[], 
  currentLat: number, 
  currentLon: number
): Record<string, number> => {
  const directions: Record<string, number> = {
    'Nord': 0,
    'Nord-Est': 0,
    'Est': 0,
    'Sud-Est': 0,
    'Sud': 0,
    'Sud-Ovest': 0,
    'Ovest': 0,
    'Nord-Ovest': 0
  };
  
  pois.forEach(poi => {
    const lat = poi.lat;
    const lon = poi.lon;
    
    // Calcola l'angolo tra la posizione corrente e il POI
    const angle = Math.atan2(lat - currentLat, lon - currentLon) * (180 / Math.PI);
    
    // Converti l'angolo in una direzione
    if (angle >= -22.5 && angle < 22.5) {
      directions['Est']++;
    } else if (angle >= 22.5 && angle < 67.5) {
      directions['Nord-Est']++;
    } else if (angle >= 67.5 && angle < 112.5) {
      directions['Nord']++;
    } else if (angle >= 112.5 && angle < 157.5) {
      directions['Nord-Ovest']++;
    } else if (angle >= 157.5 || angle < -157.5) {
      directions['Ovest']++;
    } else if (angle >= -157.5 && angle < -112.5) {
      directions['Sud-Ovest']++;
    } else if (angle >= -112.5 && angle < -67.5) {
      directions['Sud']++;
    } else if (angle >= -67.5 && angle < -22.5) {
      directions['Sud-Est']++;
    }
  });
  
  return directions;
};

/**
 * Genera colori per le categorie di POI
 * @param categories Array di categorie
 * @returns Un oggetto con le categorie come chiavi e i colori come valori
 */
export const generateCategoryColors = (categories: string[]): Record<string, string> => {
  const baseColors = [
    '#FF6384', // rosa
    '#36A2EB', // blu
    '#FFCE56', // giallo
    '#4BC0C0', // turchese
    '#9966FF', // viola
    '#FF9F40', // arancione
    '#C9CBCF', // grigio
    '#7FD13B', // verde
    '#EA5545', // rosso
    '#87BC45', // verde lime
    '#27AEEF', // azzurro
    '#B33DC6'  // magenta
  ];
  
  const categoryColors: Record<string, string> = {};
  
  categories.forEach((category, index) => {
    categoryColors[category] = baseColors[index % baseColors.length];
  });
  
  return categoryColors;
};

/**
 * Formatta il nome della categoria per la visualizzazione
 * @param category Nome della categoria
 * @returns Nome formattato
 */
export const formatCategoryName = (category: string): string => {
  // Rimuovi i trattini e sostituiscili con spazi
  let formatted = category.replace(/-/g, ' ');
  
  // Capitalizza la prima lettera di ogni parola
  formatted = formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return formatted;
};

/**
 * Ottiene l'emoji appropriata per una categoria di POI
 * @param category Nome della categoria
 * @returns Emoji corrispondente
 */
export const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    'restaurant': '🍽️',
    'cafe': '☕',
    'bar': '🍸',
    'hotel': '🏨',
    'supermarket': '🛒',
    'pharmacy': '💊',
    'hospital': '🏥',
    'school': '🏫',
    'bank': '🏦',
    'atm': '💰',
    'fuel': '⛽',
    'parking': '🅿️',
    'bus_stop': '🚏',
    'train_station': '🚉',
    'subway_entrance': '🚇',
    'airport': '✈️',
    'place_of_worship': '⛪',
    'police': '👮',
    'post_office': '📮',
    'library': '📚',
    'cinema': '🎬',
    'theatre': '🎭',
    'museum': '🏛️',
    'attraction': '🎡',
    'park': '🌳',
    'beach': '🏖️',
    'sports_centre': '🏊',
    'viewpoint': '🔭',
    'information': 'ℹ️',
    'toilets': '🚻',
    'drinking_water': '🚰',
    'shop': '🛍️',
    'bakery': '🥖',
    'butcher': '🥩',
    'clothes': '👕',
    'hairdresser': '💇',
    'doctor': '👨‍⚕️',
    'dentist': '🦷',
    'veterinary': '🐾',
    'bicycle_rental': '🚲',
    'car_rental': '🚗',
    'fast_food': '🍔',
    'ice_cream': '🍦',
    'pub': '🍺',
    'nightclub': '💃',
    'swimming_pool': '🏊',
    'gym': '🏋️',
    'stadium': '🏟️',
    'playground': '🛝',
    'marketplace': '🛒',
    'convenience': '🏪',
    'department_store': '🏬',
    'mall': '🛍️',
    'altro': '📍'
  };
  
  return emojiMap[category] || '📍';
};
