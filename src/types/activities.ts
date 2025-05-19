/**
 * Interfacce per le attività
 */

// Categoria dell'attività
export enum ActivityCategory {
  SPORT = 'sport',
  CULTURA = 'cultura',
  NATURA = 'natura',
  GASTRONOMIA = 'gastronomia',
  FAMIGLIA = 'famiglia'
}

// Interfaccia per un'attività
export interface Activity {
  id: string;
  name: string;
  description: string;
  category: ActivityCategory;
  icon: string; // Nome dell'icona FontAwesome
  image?: string; // URL dell'immagine
  poiType?: string; // Tipo di POI correlato
  weatherConditions: {
    ideal: string[]; // Condizioni meteo ideali (es. ["clear", "partly cloudy"])
    acceptable: string[]; // Condizioni meteo accettabili
    avoid: string[]; // Condizioni meteo da evitare
  };
  temperatureRange: {
    min: number;
    max: number;
  };
  seasonality: {
    spring: number;  // Punteggio da 0 a 10 per stagionalità
    summer: number;
    autumn: number;
    winter: number;
  };
  tags: string[]; // Tag per la ricerca
  estimatedDuration: number; // Durata stimata in ore
  difficulty: number; // Difficoltà da 1 a 5
}

// Interfaccia per un'attività con valutazione contestuale (in base al meteo e altri fattori)
export interface RatedActivity extends Activity {
  score: number; // Punteggio da 0 a 100 in base alle condizioni attuali
  reasons: string[]; // Motivazioni per il punteggio
  recommendation: string; // Raccomandazione specifica per il giorno
}

// Interfaccia per il contesto di valutazione delle attività
export interface ActivityContext {
  currentWeather: {
    condition: string;
    temperature: number;
    windSpeed: number;
    humidity: number;
    precipitation: number;
    uvIndex?: number;
  };
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  date: Date;
  preferredCategories?: ActivityCategory[]; // Preferenze utente se disponibili
}
