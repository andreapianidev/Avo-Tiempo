---
trigger: always_on
---

leggi il file developers.md per informazioni sulla struttura dei file e del progetto, non creare nuovi file se non strettamente necessario.
## Rules (istruzioni speciali)

1. Tutto il codice deve essere scritto in React + TypeScript + TailwindCSS.
2. Usa nomi coerenti con la struttura del progetto: `/services`, `/hooks`, `/components`, `/pages`.
3. I dati meteo vanno presi da OpenWeather per semplicità e rapidità.
4. I messaggi AI devono essere generati in tono umoristico, localizzato in stile canaro, usando DeepSeek.
5. Ogni tipo di dato (meteo, allerta, qualità aria, sismicità, sentieri, POI) ha un prompt AI dedicato.
6. Ogni dato deve essere integrato in un modulo React riutilizzabile.
7. I POI vanno interrogati tramite Overpass API e mostrati su mappa Mapbox.
8. Usa il servizio `aiService.ts` per generare i prompt dinamici.
9. Caching locale via `LocalStorage` e fallback offline vanno mantenuti.
10. Tutte le funzionalità devono essere modulari e future-proof per la versione mobile (Capacitor).