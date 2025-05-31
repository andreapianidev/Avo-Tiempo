import { SpontaneousAdventure, AdventurePOI, SpontaneousExplorerServiceError } from '../types/spontaneousExplorer';
import { GeoCoords } from './geolocationService'; // Assumendo che GeoCoords sia definito qui

// Categorie di POI che potremmo cercare con Overpass API
const POI_CATEGORIES = {
  cafe: { queryTags: ['amenity=cafe'], icon: 'coffee', theme: 'relax' },
  park: { queryTags: ['leisure=park', 'leisure=garden'], icon: 'tree', theme: 'natura' },
  viewpoint: { queryTags: ['tourism=viewpoint'], icon: 'binoculars', theme: 'scoperta' },
  bakery: { queryTags: ['shop=bakery', 'amenity=ice_cream'], icon: 'birthday-cake', theme: 'gastronomia' },
  art_culture: { queryTags: ['tourism=artwork', 'amenity=arts_centre', 'historic=monument'], icon: 'palette', theme: 'cultura' },
  shop_local: { queryTags: ['shop=craft', 'shop=gift', 'shop=souvenirs'], icon: 'store', theme: 'shopping' },
  curiosity: { queryTags: ['tourism=attraction', 'amenity=fountain'], icon: 'map-signs', theme: 'curiosità' }, 
};

/**
 * Genera un suggerimento di avventura spontanea basato sulla posizione dell'utente.
 * ATTENZIONE: Attualmente è una versione MOCK.
 * 
 * @param userCoords Le coordinate geografiche dell'utente.
 * @param radiusKm Raggio in km entro cui cercare i POI (default 1km).
 * @returns Una Promise che risolve con una SpontaneousAdventure o un errore.
 */
export const getSpontaneousAdventure = async (
  userCoords: GeoCoords,
  radiusKm: number = 1
): Promise<SpontaneousAdventure | SpontaneousExplorerServiceError> => {
  console.log(`[SpontaneousExplorerService] Richiesta avventura vicino a ${userCoords.latitude}, ${userCoords.longitude} (raggio ${radiusKm}km) - MOCK`);

  // Simulazione di una chiamata API e processamento
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Esempio di POI mockati
      const mockPois: AdventurePOI[] = [
        {
          id: 'poi1',
          name: 'Caffè Storico "La Perla Nera"',
          type: 'cafe',
          lat: userCoords.latitude + 0.001,
          lon: userCoords.longitude + 0.001,
          description: 'Un caffè accogliente con ottimi pasticcini locali.',
          tags: { amenity: 'cafe', cuisine: 'regional' }
        },
        {
          id: 'poi2',
          name: 'Giardino Segreto del Poeta',
          type: 'park',
          lat: userCoords.latitude - 0.002,
          lon: userCoords.longitude + 0.0015,
          description: 'Un piccolo parco tranquillo, perfetto per una pausa riflessiva.',
          tags: { leisure: 'park', access: 'public'}
        },
        {
          id: 'poi3',
          name: 'Bottega Artigiana "Mani d\'Oro"',
          type: 'shop_local',
          lat: userCoords.latitude + 0.0005,
          lon: userCoords.longitude - 0.0025,
          description: 'Scopri creazioni uniche fatte a mano da artisti locali.',
          tags: { shop: 'craft', opening_hours: 'Mo-Sa 10:00-18:00'}
        },
      ];

      // Scegliamo casualmente 2 o 3 POI per l'avventura mock
      const selectedPois: AdventurePOI[] = [];
      const numPois = Math.random() > 0.5 ? 3 : 2;
      const availablePois = [...mockPois];
      for (let i = 0; i < numPois; i++) {
        if (availablePois.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availablePois.length);
        selectedPois.push(availablePois.splice(randomIndex, 1)[0]);
      }

      if (selectedPois.length < 2) {
        // Simulazione errore: non abbastanza POI trovati
        resolve({ 
          message: 'Non siamo riusciti a trovare abbastanza punti interessanti nelle vicinanze per un\'avventura ora. Riprova più tardi o da un\'altra zona!',
          type: 'NO_POIS_FOUND'
        } as SpontaneousExplorerServiceError);
        return;
      }
      
      const adventure: SpontaneousAdventure = {
        id: `adv_${new Date().getTime()}`,
        title: numPois === 2 ? 'Piccola Fuga Quotidiana' : 'Giro delle Meraviglie Nascoste',
        description: 'Una selezione di luoghi interessanti vicino a te per una breve esplorazione.',
        pois: selectedPois,
        estimatedDuration: numPois === 2 ? 'Circa 1 ora' : 'Circa 1.5 - 2 ore',
        difficulty: 'easy',
        themeTags: selectedPois.map(p => POI_CATEGORIES[p.type as keyof typeof POI_CATEGORIES]?.theme || 'scoperta'),
        icon: numPois === 2 ? 'walking' : 'hiking', // Esempio di icone FontAwesome
      };

      console.log('[SpontaneousExplorerService] Avventura MOCK generata:', adventure);
      resolve(adventure);

    }, 1500); // Simula ritardo di rete
  });
};

// TODO in futuro:
// - Implementare la chiamata reale a Overpass API
// - Logica per costruire query Overpass dinamiche basate su POI_CATEGORIES e raggio
// - Funzioni per calcolare distanza e durata stimate
// - Logica di selezione dei POI più sofisticata (evitare duplicati, varietà, percorso logico)
// - Gestione errori API Overpass
