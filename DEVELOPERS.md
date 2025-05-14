# AVO Weather - Documentazione per Sviluppatori

## Panoramica del Progetto

AVO Weather è un'applicazione meteo progressive web app (PWA) progettata per fornire previsioni meteo per le Isole Canarie e altre località. L'app è costruita con React, TypeScript e TailwindCSS, e utilizza l'API OpenWeather per i dati meteorologici.

## Struttura del Progetto

```
/AVOWeather
│
├── public/                  # Asset statici e file pubblici
│   ├── favicon.ico          # Icona del sito
│   ├── index.html           # Template HTML principale
│   ├── logo192.png          # Logo per PWA
│   ├── logo512.png          # Logo per PWA (grande)
│   ├── manifest.json        # Manifest per PWA
│   ├── offline.html         # Pagina mostrata quando offline
│   └── service-worker.js    # Service worker per caching e offline
│
├── src/                      # Codice sorgente principale
│   ├── components/           # Componenti React riutilizzabili
│   │   ├── AIInsight.tsx    # Componente per l'integrazione AI
│   │   ├── AlertBox.tsx     # Componente per gli avvisi meteo
│   │   ├── ErrorFeedback.tsx # Componente per feedback errori
│   │   ├── ExternalLink.tsx  # Componente per link esterni
│   │   ├── FooterNav.tsx     # Barra di navigazione inferiore
│   │   ├── ForecastCard.tsx  # Card per le previsioni meteo
│   │   └── WeatherBox.tsx    # Componente principale meteo
│   │
│   ├── hooks/               # Custom React hooks
│   │
│   ├── pages/               # Componenti pagina
│   │   ├── Home.tsx         # Pagina principale
│   │   ├── Locations.tsx    # Pagina per gestire le località
│   │   ├── Settings.tsx     # Pagina impostazioni
│   │   └── Trends.tsx       # Pagina tendenze meteo
│   │
│   ├── services/            # Servizi e API
│   │   ├── aiService.ts     # Servizio per AI insight
│   │   ├── appStateService.ts # Gestione dello stato dell'app
│   │   ├── errorService.ts   # Gestione centralizzata errori
│   │   ├── geolocationService.ts # Servizio geolocalizzazione
│   │   ├── locationService.ts # Gestione delle località
│   │   ├── notificationService.ts # Servizio notifiche push
│   │   ├── settingsService.ts # Gestione impostazioni utente
│   │   ├── themeService.ts   # Gestione tema (chiaro/scuro)
│   │   ├── trendService.ts   # Analisi tendenze meteo
│   │   └── weatherService.ts # Integrazione con API OpenWeather
│   │
│   ├── types/               # TypeScript type definitions
│   │
│   ├── utils/               # Utilità e funzioni helper
│   │
│   ├── App.css              # Stili globali dell'app
│   ├── App.tsx              # Componente principale dell'app
│   ├── index.css            # Stili base
│   ├── index.tsx            # Punto di ingresso React
│   └── serviceWorkerRegistration.ts # Registrazione service worker
│
├── android/                 # File specifici per Android (Capacitor)
│
├── ios/                     # File specifici per iOS (Capacitor)
│
├── package.json             # Dipendenze npm e script
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
- **Capacitor**: Per la generazione di app native

## Servizi e API Esterne

### OpenWeather API
- **API Key**: `b33c9835879f888134e97c6d58d6e4a7`
- **Base URL**: `https://api.openweathermap.org/data/2.5`
- **Endpoint principali**:
  - `/weather`: Dati meteo attuali
  - `/forecast`: Previsioni orarie

### Geolocation API
- L'app utilizza l'API geolocation del browser per ottenere la posizione dell'utente
- Fallback: Nominatim OpenStreetMap per la conversione delle coordinate in località

## Architettura dell'Applicazione

### Gestione dello Stato
- L'app utilizza un mix di React Context e LocalStorage per la gestione dello stato
- `appStateService.ts` coordina lo stato globale dell'app
- I dati meteo vengono memorizzati nella cache in LocalStorage per un'ora
- Le impostazioni utente vengono persistite in LocalStorage

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

### Sistema di Notifiche
- `notificationService.ts` gestisce le notifiche push
- Alerts meteo configurabili dall'utente
- Integrazione con il service worker per le notifiche in background

### Temi e Stili
- Supporto per temi chiari e scuri con `themeService.ts`
- Cambio automatico in base alle preferenze di sistema
- Tema predefinito: chiaro
- TailwindCSS con variabili CSS personalizzate per la consistenza dei colori

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

### Best Practices
- Testare sempre l'app in modalità offline per assicurarsi che funzioni correttamente
- Non modificare direttamente il service worker senza testare attentamente le modifiche
- Mantenere le chiamate API al minimo per evitare di superare i limiti di richieste
- Validare sempre i dati ricevuti dalle API prima dell'uso

## Risorse di Sviluppo
- [OpenWeather API Docs](https://openweathermap.org/api)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
