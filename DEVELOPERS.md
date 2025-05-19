# AVO Weather - Documentazione per Sviluppatori

## Panoramica del Progetto

AVO Weather è un'applicazione meteo progressive web app (PWA) progettata per fornire previsioni meteo per le Isole Canarie e altre località. L'app è costruita con React, TypeScript e TailwindCSS, e utilizza l'API OpenWeather per i dati meteorologici, con funzionalità AI avanzate tramite DeepSeek API.

### Struttura del Progetto

```
/Avo Tiempo
│
├── public/                  # Asset statici e file pubblici
│   ├── assets/              # Directory per risorse aggiuntive
│   │   └── logo.png         # Logo principale dell'applicazione
│   ├── favicon.ico          # Icona del sito
│   ├── index.html           # Template HTML principale
│   ├── logo192.png          # Logo per PWA
│   ├── logo512.png          # Logo per PWA (grande)
│   ├── manifest.json        # Manifest per PWA
│   ├── offline.html         # Pagina mostrata quando offline
│   ├── robots.txt           # File per istruzioni ai crawler
│   └── service-worker.js    # Service worker per caching e offline
│
├── src/                     # Codice sorgente principale
│   ├── components/          # Componenti React riutilizzabili
│   │   ├── AIInsight.tsx    # Visualizzazione degli insight AI
│   │   ├── AlertBox.tsx     # Componente per gli avvisi meteo
│   │   ├── DailyActivitySuggestion.tsx # Suggerimenti personalizzati attività giornaliere
│   │   ├── CategoryPOIRecommendations.tsx # Raccomandazioni POI per categoria
│   │   ├── ErrorFeedback.tsx # Gestione e visualizzazione errori
│   │   ├── ExternalLink.tsx  # Componente per link esterni
│   │   ├── FooterNav.tsx     # Barra di navigazione inferiore
│   │   ├── ForecastCard.tsx  # Card per le previsioni meteo
│   │   ├── LocationPOIRecommendations.tsx # Raccomandazioni POI per località
│   │   ├── POIMap.tsx        # Mappa interattiva con POI
│   │   ├── WeatherBox.tsx    # Componente principale meteo
│   │   └── WeatherDetails.tsx # Dettagli meteo estesi
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useConnectivity.ts # Hook per gestire lo stato della connessione
│   │   ├── useGeolocation.ts  # Hook per accedere alla posizione utente
│   │   └── useLocalStorage.ts # Hook per interagire con localStorage
│   │
│   ├── pages/               # Componenti pagina
│   │   ├── Home.tsx         # Pagina principale
│   │   ├── Locations.tsx    # Gestione delle località salvate
│   │   ├── Settings.tsx     # Impostazioni applicazione
│   │   └── Trends.tsx       # Analisi tendenze meteo
│   │
│   ├── services/            # Servizi e API
│   │   ├── aemetService.ts   # Integrazione con AEMET (allerte meteo)
│   │   ├── aiService.ts      # Servizio per generazione insight AI e suggerimenti attività
│   │   ├── appStateService.ts # Gestione stato globale dell'app
│   │   ├── cacheService.ts   # Gestione della cache
│   │   ├── connectivityService.ts # Gestione stato connessione
│   │   ├── errorService.ts   # Gestione centralizzata errori
│   │   ├── geolocationService.ts # Servizio geolocalizzazione
│   │   ├── locationService.ts # Gestione delle località
│   │   ├── notificationService.ts # Servizio notifiche push
│   │   ├── osmService.ts     # Integrazione con OpenStreetMap
│   │   ├── settingsService.ts # Gestione impostazioni utente
│   │   ├── themeService.ts   # Gestione tema (chiaro/scuro)
│   │   ├── trendService.ts   # Analisi tendenze meteo
│   │   └── weatherService.ts # Integrazione con OpenWeather API
│   │
│   ├── types/               # Definizioni di tipi TypeScript
│   │   ├── weather.ts       # Tipi per dati meteo
│   │   ├── location.ts      # Tipi per località
│   │   └── poi.ts           # Tipi per punti di interesse
│   │
│   ├── utils/               # Utilità e funzioni helper
│   │   ├── dateUtils.ts     # Funzioni per manipolazione date e calcolo momento della giornata
│   │   ├── formatUtils.ts   # Formattazione dati (temperatura, ecc.)
│   │   └── storageUtils.ts  # Utility per localStorage
│   │
│   ├── App.css              # Stili globali dell'app
│   ├── App.test.tsx         # Test per il componente App
│   ├── App.tsx              # Componente principale dell'app
│   ├── index.css            # Stili base
│   ├── index.tsx            # Punto di ingresso React
│   ├── logo.svg             # Logo SVG dell'app
│   ├── react-app-env.d.ts   # Dichiarazioni di ambiente per React
│   ├── reportWebVitals.ts   # Utility per reportistica Web Vitals
│   ├── serviceWorkerRegistration.ts # Registrazione service worker
│   └── setupTests.ts        # Configurazione per i test
│
├── android/                 # File specifici per Android (Capacitor)
│
├── ios/                     # File specifici per iOS (Capacitor)
│
├── build/                   # Directory di build (generata da npm run build)
│
├── .git/                    # Directory Git
├── .gitignore               # File di configurazione Git per ignorare file
├── DEVELOPERS.md            # Documentazione per sviluppatori (questo file)
├── README.md                # Documentazione generale del progetto
├── capacitor.config.ts      # Configurazione Capacitor per app mobile
├── package-lock.json        # Versioni esatte delle dipendenze npm
├── package.json             # Dipendenze npm e script
├── postcss.config.js        # Configurazione PostCSS
├── tailwind.config.js       # Configurazione TailwindCSS
└── tsconfig.json            # Configurazione TypeScript
```

## Tecnologie Principali

- **React** (17.x): Framework UI
- **TypeScript**: Linguaggio di programmazione tipizzato
- **TailwindCSS**: Framework CSS utility-first
- **FontAwesome**: Libreria di icone
- **PWA**: Funzionalità di Progressive Web App
- **OpenWeather API**: API per i dati meteorologici
- **DeepSeek API**: Per generazione di insight personalizzati
- **Mapbox**: Per visualizzazione mappe interattive
- **Overpass API (OpenStreetMap)**: Per dati POI (Points of Interest)
- **Capacitor**: Per la generazione di app native

## Dettaglio dei Componenti Principali

### Servizi Core

#### aiService.ts
Servizio per integrazione con DeepSeek API:
- Generazione di insight basati su meteo
- Generazione di suggerimenti attività personalizzati basati su meteo, ora e POI
- Caching per ridurre le chiamate API
- Supporto per streaming delle risposte
- Sistema di fallback locale quando l'API non è disponibile
- Template di risposta preformattati
- Funzione `generateDailyActivitySuggestion` per suggerimenti attività contestuali
- Risposta in formato JSON strutturato con titolo, descrizione e POI suggeritie duplicate
- Fallback locale in caso di errori API
- Generazione di prompt dinamici basati su:
  - Condizioni meteo
  - Temperatura
  - Allerte attive
  - POI nelle vicinanze
  - Preferenze utente

#### weatherService.ts
Integrazione con OpenWeather API:
- Recupero dati meteo attuali
- Previsioni a 5 giorni
- Caching dei risultati per ridurre le chiamate API
- Gestione degli errori con retry automatici
- Conversione dei dati in formato standardizzato

#### osmService.ts
Integrazione con Overpass API (OpenStreetMap):
- Ricerca di POI (Points of Interest) attorno a coordinate
- Filtro per categorie (ristoranti, attrazioni, ecc.)
- Caching dei risultati per località
- Gestione degli errori di rete

#### errorService.ts
Sistema centralizzato di gestione errori:
- Categorizzazione degli errori (API, rete, validazione, ecc.)
- Livelli di severità (bassa, media, alta)
- Azioni di recovery suggerite
- Logging centralizzato
- Messaggi utente localizzati

### Componenti UI Principali

#### LocationPOIRecommendations.tsx
Componente che integra dati meteo, POI e insight AI:
- Recupera POI nelle vicinanze di una località
- Genera raccomandazioni AI basate su meteo e POI
- Visualizza mappa interattiva con i POI
- Gestisce stati di caricamento ed errori
- Implementa caching per migliorare performance

#### CategoryPOIRecommendations.tsx
Componente per visualizzare POI filtrati per categoria:
- Filtro per tipologia (ristoranti, musei, parchi, ecc.)
- Integrazione con insight AI specifici per categoria
- Visualizzazione a lista o mappa
- Gestione errori con componente ErrorFeedback

#### AIInsight.tsx
Visualizzazione degli insight generati dall'AI:
- Supporto per streaming del testo generato
- Stili diversi in base al tipo di insight
- Animazioni di caricamento
- Fallback per modalità offline

#### DailyActivitySuggestion.tsx
Componente per suggerimenti attività giornaliere:
- Suggerimenti personalizzati basati su meteo, ora e POI
- Visualizzazione di attività consigliate per il momento della giornata
- Integrazione con insight AI per contestualizzare le attività
- Gestione errori con componente ErrorFeedback

## Flussi di Dati Principali

### Flusso Meteo
1. L'utente richiede dati per una località
2. `weatherService.ts` verifica se ci sono dati in cache
3. Se necessario, effettua chiamata a OpenWeather API
4. I dati vengono normalizzati e salvati in cache
5. `WeatherBox.tsx` visualizza i dati principali
6. `WeatherDetails.tsx` mostra dettagli aggiuntivi

### Flusso AI Insights
1. `LocationPOIRecommendations.tsx` raccoglie dati meteo e POI
2. Chiama `aiService.getAIInsight()` con i parametri raccolti
3. `aiService.ts` genera un prompt dinamico per DeepSeek
4. La risposta viene cachata e restituita (con supporto streaming)
5. `AIInsight.tsx` visualizza il testo generato con stile "canaro"
6. In caso di errore API, viene usato il generatore locale di fallback

### Flusso POI
1. L'utente espande una località o seleziona una categoria
2. `osmService.ts` recupera POI nelle vicinanze tramite Overpass API
3. I POI vengono filtrati e ordinati per rilevanza
4. `POIMap.tsx` visualizza i POI su mappa Mapbox
5. L'AI genera raccomandazioni basate sui POI e condizioni meteo

## Strategie di Caching

Il progetto implementa diverse strategie di caching per migliorare performance e supportare l'uso offline:

### Cache Dati Meteo
- **Durata**: 60 minuti
- **Implementazione**: LocalStorage via `cacheService.ts`
- **Namespace**: `weather_data`
- **Invalidazione**: Automatica basata su timestamp o manuale tramite "pull-to-refresh"

### Cache AI Insights
- **Durata**: 15 minuti
- **Implementazione**: In-memory in `aiService.ts` + LocalStorage per persistenza
- **Namespace**: `ai_insights`
- **Chiave**: Combinazione di località, condizioni, temperatura, allerte e POI

### Cache POI
- **Durata**: 24 ore

### Cache Suggerimenti Attività Giornaliere
- **Durata**: 60 minuti
- **Implementazione**: LocalStorage via `cacheService.ts`
- **Namespace**: `ai_insights` con prefisso `daily_activity_`
- **Chiave**: Combinazione di località, condizioni meteo, momento della giornata e tipo di giorno (weekend/feriale)

## Servizi e API Esterne

### OpenWeather API
- **API Key**: `b33c9835879f888134e97c6d58d6e4a7`
- **Base URL**: `https://api.openweathermap.org/data/2.5`
- **Endpoint principali**:
  - `/weather`: Dati meteo attuali
  - `/forecast`: Previsioni orarie
  - `/data/3.0/onecall`: Dati completi con previsioni e allerte (API 3.0)

### AEMET API (Agencia Estatal de Meteorología)
- **API Key**: `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmRyZWFwaWFuaS5kZXZAZ21haWwuY29tIiwianRpIjoiZTRiOGJhOWMtNmMyMS00ZmQ4LWI3ODEtMThmMTBiYzk1OTRiIiwiaXNzIjoiQUVNRVQiLCJpYXQiOjE3NDczMDUyOTksInVzZXJJZCI6ImU0YjhiYTljLTZjMjEtNGZkOC1iNzgxLTE4ZjEwYmM5NTk0YiIsInJvbGUiOiIifQ.vGLVP33tdCaeUPw0APaxiCHCSe3G9aGCxGDDqHvJUWk`
- **Base URL**: `https://opendata.aemet.es/opendata/api`
- **Endpoint principali**:
  - `/avisos_cap/`: Allerte meteo ufficiali per la Spagna
  - `/prediccion/especifica/municipio/diaria/{id}`: Previsioni per comuni specifici
- **Nota**: Le chiamate AEMET richiedono una doppia fetch - la prima restituisce un URL, la seconda ottiene i dati effettivi

### Overpass API (OpenStreetMap)
- **URL**: `https://overpass-api.de/api/interpreter`
- **Metodo**: POST con query Overpass QL
- **Funzionalità**: Recupero di punti di interesse (POI) nelle vicinanze dell'utente
- **Categorie supportate**: turismo, natura, svago, servizi

### Geolocation API
- L'app utilizza l'API geolocation del browser per ottenere la posizione dell'utente
- Fallback: Nominatim OpenStreetMap per la conversione delle coordinate in località

## Architettura dell'Applicazione

### Gestione dello Stato
- L'app utilizza un mix di React Context e LocalStorage per la gestione dello stato
- `appStateService.ts` coordina lo stato globale dell'app
- I dati meteo vengono memorizzati nella cache in LocalStorage per un'ora
- Le impostazioni utente vengono persistite in LocalStorage

### Servizi Principali

#### Servizi Meteo e Geolocalizzazione
- `weatherService.ts`: Integrazione con OpenWeather API per dati meteo
- `geolocationService.ts`: Gestione della posizione utente
- `aemetService.ts`: Integrazione con AEMET per allerte meteo ufficiali spagnole
- `osmService.ts`: Integrazione con OpenStreetMap per POI nelle vicinanze

#### Servizi AI e Analisi
- `aiService.ts`: Genera insight personalizzati basati su meteo, allerte e POI
- `trendService.ts`: Analisi delle tendenze meteo

#### Componenti Principali
- `WeatherBox.tsx`: Visualizzazione principale dei dati meteo
- `AlertBox.tsx`: Visualizzazione delle allerte meteo con livelli di gravità
- `DailyActivitySuggestion.tsx`: Suggerimenti attività giornaliere basate su meteo, orario e POI vicini
- `LocationPOIRecommendations.tsx`: Componente che integra dati meteo, POI e insight AI
- `CategoryPOIRecommendations.tsx`: Visualizzazione POI filtrati per categoria
- `POIMap.tsx`: Mappa interattiva con POI
- `AIInsight.tsx`: Visualizzazione degli insight generati dall'AI

### Gestione degli Errori
- Sistema centralizzato di gestione errori in `errorService.ts`
- Tipi di errori gestiti:
  - `API`: Errori nelle chiamate API
  - `NETWORK`: Problemi di connettività
  - `LOCATION`: Errori di geolocalizzazione
  - `PERMISSION`: Errori di permessi utente
  - `VALIDATION`: Errori di validazione dati
  - `UNKNOWN`: Errori non categorizzati
- Gli errori vengono registrati localmente e mostrati all'utente tramite il componente `ErrorFeedback`

### Modalità Offline
- Service worker configurato per il caching delle risorse statiche
- Strategia di caching "Network First" per i dati meteo
- Pagina offline personalizzata (`offline.html`)
- I dati meteo precedenti vengono serviti dalla cache quando offline

## Gestione Errori e Resilienza

Il sistema è progettato per essere resiliente a vari tipi di errori:

### Errori di Rete
- Rilevamento automatico dello stato offline
- Visualizzazione dati dalla cache quando offline
- Retry automatici con backoff esponenziale
- Feedback visivo all'utente tramite `ErrorFeedback.tsx`

### Errori API
- Gestione centralizzata in `errorService.ts`
- Fallback a dati cachati quando possibile
- Logging dettagliato per debugging
- Messaggi utente localizzati e comprensibili

### Errori AI
- Sistema di fallback locale in `aiService.ts`
- Generazione di risposte predefinite basate su modelli
- Caching aggressivo per ridurre dipendenza dall'API

### Sistema di Notifiche
- `notificationService.ts` gestisce le notifiche push
- Alerts meteo configurabili dall'utente
- Integrazione con il service worker per le notifiche in background

### Temi e Stili
- Supporto per temi chiari e scuri con `themeService.ts`
- Cambio automatico in base alle preferenze di sistema
- Tema predefinito: chiaro
- TailwindCSS con variabili CSS personalizzate per la consistenza dei colori

## Integrazione AI

L'integrazione con DeepSeek AI è un elemento chiave del progetto:

### Prompt Engineering
- Prompt dinamici generati in base al contesto
- Stile "canaro" (umoristico e localizzato)
- Inclusione di informazioni contestuali:
  - Condizioni meteo
  - Temperatura
  - Allerte attive
  - POI nelle vicinanze
  - Preferenze utente

### Ottimizzazione Costi
- Caching aggressivo per ridurre chiamate API
- Deduplicazione di richieste simili
- Sistema di fallback locale
- Limitazione della lunghezza dei prompt

### UX Considerations
- Streaming delle risposte per feedback immediato
- Animazioni durante la generazione
- Fallback graceful in caso di errori
- Possibilità di rigenerare risposte

## Cache e Performance

### Strategia di Cache
- **Dati Meteo**: Cachati per 1 ora
- **Località Usate**: Memorizzate permanentemente
- **Risorse Statiche**: Cachate dal service worker

### Limitazione delle Chiamate API
- Throttling implementato per limitare le chiamate all'API OpenWeather
- Feedback all'utente quando i dati sono serviti dalla cache

## Esecuzione dell'Applicazione

### Sviluppo
```bash
npm install
npm start
```

### Build per Produzione
```bash
npm run build
```

### Deploy come PWA
Dopo il build, i file nella cartella `build` possono essere deployati su qualsiasi hosting statico.

## Problemi Noti e Best Practices

### Problemi Noti
- Le notifiche push potrebbero non funzionare in Safari iOS
- Potrebbero esserci falsi positivi nella rilevazione dello stato offline
- Le chiamate dirette alle API AEMET e OpenStreetMap possono essere bloccate da CORS in ambiente di sviluppo
- L'API AEMET potrebbe essere lenta o non rispondere in alcuni momenti
- Limitazioni API gratuite di OpenWeather
- Performance della mappa su dispositivi mobili
- Consumo batteria con geolocalizzazione attiva

### Best Practices
- Testare sempre l'app in modalità offline per assicurarsi che funzioni correttamente
- Non modificare direttamente il service worker senza testare attentamente le modifiche
- Mantenere le chiamate API al minimo per evitare di superare i limiti di richieste
- Validare sempre i dati ricevuti dalle API prima dell'uso
- Utilizzare un proxy server per le chiamate API esterne per evitare problemi CORS
- Implementare sempre meccanismi di fallback per le API esterne
- Utilizzare i componenti esistenti per mantenere consistenza UI
- Seguire il pattern di gestione errori centralizzato
- Implementare caching per tutte le chiamate API
- Utilizzare TypeScript per type safety

### Aree di Miglioramento
- Implementare test automatici (Jest/React Testing Library)
- Migliorare la gestione dello stato con Context API o Redux
- Ottimizzare performance su dispositivi di fascia bassa
- Implementare sincronizzazione cross-device
- Espandere il supporto offline

## Guida all'Implementazione di Nuove Funzionalità

### Aggiungere un Nuovo Tipo di Dato Meteo
1. Estendere i tipi in `types/weather.ts`
2. Aggiornare `weatherService.ts` per recuperare e normalizzare i nuovi dati
3. Implementare il caching in `cacheService.ts`
4. Aggiornare i componenti UI per visualizzare i nuovi dati
5. Integrare i nuovi dati nei prompt AI in `aiService.ts`

### Implementare una Nuova Fonte di Dati
1. Creare un nuovo servizio in `services/`
2. Implementare caching e gestione errori
3. Integrare con `appStateService.ts` se necessario
4. Creare componenti UI dedicati
5. Aggiornare la documentazione

### Estendere le Funzionalità AI
1. Modificare i prompt in `aiService.ts`
2. Aggiornare il sistema di fallback locale
3. Ottimizzare il caching per i nuovi parametri
4. Aggiornare i componenti UI che visualizzano gli insight

## Risorse e Documentazione

### API Keys e Configurazione
- OpenWeather API: Configurata in `weatherService.ts`
- DeepSeek API: Configurata in `aiService.ts`
- Mapbox: Configurata in `POIMap.tsx`

### Documentazione Esterna
- [OpenWeather API Docs](https://openweathermap.org/api)
- [AEMET OpenData API Docs](https://opendata.aemet.es/centrodedescargas/inicio)
- [Overpass API Docs](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [DeepSeek API](https://api.deepseek.com/docs)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

### Strumenti di Sviluppo
- VSCode con estensioni per React/TypeScript
- Chrome DevTools per debugging PWA
- Lighthouse per performance audit
- Capacitor CLI per build mobile

---

Documento aggiornato il: 2025-05-17
