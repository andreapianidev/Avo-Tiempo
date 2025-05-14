// Service Worker per AVO Weather App

const CACHE_NAME = 'avo-weather-v1';
const OFFLINE_URL = '/offline.html';
const APP_VERSION = '1.0.0'; // Versione dell'app per gestire aggiornamenti cache

const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/vendors~main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta');
        // Pre-cache pagina offline e risorse essenziali
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force activation by skipping waiting
        return self.skipWaiting();
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Elimino la cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Become available to all pages
      return self.clients.claim();
    })
  );
});

// Strategia di cache: Cache First, poi Network
self.addEventListener('fetch', (event) => {
  // Ignora richieste non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignora richieste alle API per garantire sempre dati freschi
  // ma memorizza in cache le risposte se la rete è disponibile
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('openweathermap.org') ||
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('deepseek.com')) {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Verifica se la risposta è valida
          if (!response || response.status !== 200) {
            console.warn(`[Service Worker] Risposta API non valida: ${response.status} ${response.statusText}`);
            throw new Error(`Invalid API response: ${response.status}`);
          }
            
          // Clona la risposta per memorizzarla in cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              // Memorizza in cache anche le richieste API quando la rete è disponibile
              cache.put(event.request, responseToCache);
              console.log(`[Service Worker] Memorizzata in cache: ${event.request.url}`);
            })
            .catch(err => {
              console.error(`[Service Worker] Errore nel salvataggio in cache: ${err.message}`);
            });
            
          return response;
        })
        .catch((error) => {
          console.warn(`[Service Worker] Fallback a cache per: ${event.request.url}`, error.message);
          
          // Se offline, prova a servire dalla cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              // Se in cache, restituiscila
              if (cachedResponse) {
                console.log(`[Service Worker] Servita risposta dalla cache: ${event.request.url}`);
                // Aggiungi header per indicare che è una risposta dalla cache
                const headers = new Headers(cachedResponse.headers);
                headers.append('X-Cache-Hit', 'true');
                headers.append('X-Cache-Date', new Date().toISOString());
                
                return new Response(cachedResponse.body, {
                  status: cachedResponse.status,
                  statusText: cachedResponse.statusText + ' (cached)',
                  headers: headers
                });
              }
              
              // Se non è in cache e siamo offline, servi la pagina offline per le richieste HTML
              if (event.request.headers.get('accept')?.includes('text/html')) {
                console.log(`[Service Worker] Fallback alla pagina offline per: ${event.request.url}`);
                return caches.match(OFFLINE_URL);
              }
              
              // Per le richieste API crea una risposta JSON con stato offline
              if (event.request.url.includes('/api/') || event.request.url.includes('openweathermap.org')) {
                console.log(`[Service Worker] Creazione risposta offline per API: ${event.request.url}`);
                return new Response(JSON.stringify({
                  error: 'offline',
                  message: 'Currently offline. Using cached data if available.',
                  timestamp: Date.now()
                }), {
                  status: 503,
                  statusText: 'Service Unavailable (Offline)',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Offline-Mode': 'true'
                  }
                });
              }
              
              // Altrimenti fallisci normalmente
              console.error(`[Service Worker] Nessuna risposta disponibile per: ${event.request.url}`);
              return Response.error();
            });
        })
    );
  } else {
    // Per tutte le altre richieste (assets, etc), usa la strategia Cache First
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Ritorna dalla cache se disponibile
          if (cachedResponse) {
            console.log(`[Service Worker] Servito da cache: ${event.request.url}`);
            return cachedResponse;
          }
          
          // Altrimenti richiedi alla rete
          console.log(`[Service Worker] Richiesta a rete per: ${event.request.url}`);
          return fetch(event.request)
            .then((response) => {
              // Controlla validità della risposta
              if (!response || response.status !== 200) {
                console.warn(`[Service Worker] Risposta non valida: ${response.status} ${response.statusText}`);
                
                // Se è un 404 o altro errore, non salvare in cache
                if (response.status === 404 || response.status >= 500) {
                  return response;
                }
              }
            
              // Clona la risposta per memorizzarla in cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                  console.log(`[Service Worker] Salvato in cache: ${event.request.url}`);
                })
                .catch(err => {
                  console.error(`[Service Worker] Errore nel salvataggio in cache: ${err.message}`);
                });
                
              return response;
            })
            .catch((error) => {
              console.warn(`[Service Worker] Errore rete per: ${event.request.url}`, error.message);
              
              // Se è una richiesta di pagina HTML e siamo offline, mostra la pagina offline
              if (event.request.headers.get('accept')?.includes('text/html')) {
                console.log(`[Service Worker] Mostra pagina offline per: ${event.request.url}`);
                return caches.match(OFFLINE_URL).then(offlineResp => {
                  if (offlineResp) {
                    return offlineResp;
                  }
                  // Nel caso in cui anche la pagina offline non sia disponibile
                  return new Response(
                    '<html><body><h1>Sei offline</h1><p>Non è possibile caricare la pagina richiesta e la pagina offline.</p></body></html>',
                    {
                      status: 503,
                      statusText: 'Service Unavailable',
                      headers: new Headers({ 'Content-Type': 'text/html' })
                    }
                  );
                });
              }
              
              // Per immagini, mostra un'immagine di fallback se disponibile
              if (event.request.destination === 'image') {
                return caches.match('/logo192.png').then(imgResp => {
                  if (imgResp) return imgResp;
                  return Response.error();
                });
              }
              
              // Altrimenti fallisci normalmente
              return Response.error();
            });
        })
    );
  }
});

// Gestione delle notifiche push
self.addEventListener('push', (event) => {
  try {
    if (!event.data) {
      console.warn('[Service Worker] Ricevuta notifica push senza dati');
      return;
    }
    
    let data;
    try {
      data = event.data.json();
    } catch (e) {
      // Fallback: tenta di usare i dati come testo
      console.warn('[Service Worker] Impossibile parsare JSON, utilizzo testo:', e);
      data = {
        title: 'AVO Weather',
        body: event.data.text() || 'Nuovo aggiornamento disponibile'
      };
    }
    
    const options = {
      body: data.body || 'Aggiornamento meteo disponibile',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag || 'avo-weather-notification',
      timestamp: data.timestamp || Date.now(),
      data: {
        url: data.url || '/',
        id: data.id || `notification-${Date.now()}`
      },
      // Aggiungi suono e vibrazione
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200]
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'AVO Weather', 
        options
      ).catch(error => {
        console.error('[Service Worker] Errore visualizzazione notifica:', error);
      })
    );
  } catch (error) {
    console.error('[Service Worker] Errore generale gestione push:', error);
  }
});

// Apertura dell'app quando si clicca su una notifica
self.addEventListener('notificationclick', (event) => {
  try {
    console.log('[Service Worker] Notifica cliccata:', event.notification.tag);
    event.notification.close();
    
    // Registrazione dell'interazione con la notifica
    const notificationId = event.notification.data && event.notification.data.id;
    if (notificationId) {
      console.log(`[Service Worker] Interazione con notifica ID: ${notificationId}`);
    }
    
    const urlToOpen = event.notification.data && 
                     event.notification.data.url ? 
                     event.notification.data.url : '/';
                     
    event.waitUntil(
      clients.matchAll({type: 'window'})
        .then((clientList) => {
          // Cerca una finestra già aperta e la porta in primo piano
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              // Passa il notificationId come messaggio all'app
              if (notificationId) {
                client.postMessage({
                  type: 'NOTIFICATION_CLICKED',
                  notificationId,
                  timestamp: Date.now()
                });
              }
              console.log(`[Service Worker] Focus su finestra esistente: ${client.url}`);
              return client.focus();
            }
          }
          
          // Se non c'è una finestra aperta, aprine una nuova
          if (clients.openWindow) {
            console.log(`[Service Worker] Apertura nuova finestra: ${urlToOpen}`);
            return clients.openWindow(urlToOpen).then(client => {
              // Non possiamo inviare messaggi qui perché la finestra non è ancora completamente caricata
              // L'app dovrà controllare i parametri URL per eventuali dati
              return client;
            }).catch(error => {
              console.error(`[Service Worker] Errore apertura finestra: ${error.message}`);
              // Tentativo di recupero, prova ad aprire la home page
              if (urlToOpen !== '/') {
                return clients.openWindow('/');
              }
              throw error;
            });
          }
          
          console.warn('[Service Worker] Impossibile aprire finestra o trovare client esistenti');
        }).catch(error => {
          console.error('[Service Worker] Errore gestione click notifica:', error);
        })
    );
  } catch (error) {
    console.error('[Service Worker] Errore generale in notificationclick:', error);
  }
});

// Gestione errori nel service worker
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Errore non gestito:', event.message, event.filename, event.lineno);
});

// Gestione promesse rifiutate non gestite
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Promessa rifiutata non gestita:', event.reason);
});
