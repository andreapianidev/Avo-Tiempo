import React, { useState, useEffect, useCallback } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonButton, IonIcon, IonSpinner, IonItem, IonLabel, IonList, IonText, IonChip } from '@ionic/react';
import { locationOutline, refreshOutline, mapOutline, trailSignOutline, informationCircleOutline } from 'ionicons/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkedAlt, faRedo, faExclamationTriangle, faMugHot, faTree, faBinoculars, faBirthdayCake, faPalette, faStore, faMapSigns, faHiking, faWalking, faCompass } from '@fortawesome/free-solid-svg-icons';
import { SpontaneousAdventure, AdventurePOI, SpontaneousExplorerServiceError } from '../types/spontaneousExplorer';
import { getSpontaneousAdventure } from '../services/spontaneousExplorerService';
import { GeoCoords } from '../services/geolocationService';

interface SpontaneousExplorerWidgetProps {
  userCoords: GeoCoords | null;
  className?: string;
}

const SpontaneousExplorerWidget: React.FC<SpontaneousExplorerWidgetProps> = ({ userCoords, className }) => {
  const [adventure, setAdventure] = useState<SpontaneousAdventure | null>(null);
  const [error, setError] = useState<SpontaneousExplorerServiceError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAdventure = useCallback(async () => {
    if (!userCoords) {
      setError({ message: 'Posizione utente non disponibile.', type: 'LOCATION_ERROR' });
      return;
    }
    setIsLoading(true);
    setError(null);
    setAdventure(null);
    try {
      const result = await getSpontaneousAdventure(userCoords);
      if ('message' in result && 'type' in result) { // Type guard for SpontaneousExplorerServiceError
        setError(result as SpontaneousExplorerServiceError);
        setAdventure(null);
      } else {
        setAdventure(result as SpontaneousAdventure);
        setError(null);
      }
    } catch (e: any) {
      console.error('[SpontaneousExplorerWidget] Error fetching adventure:', e);
      setError({ message: e.message || 'Errore imprevisto nel caricare il suggerimento.', type: 'UNKNOWN' });
      setAdventure(null);
    }
    setIsLoading(false);
  }, [userCoords]);

  useEffect(() => {
    if (userCoords) {
      fetchAdventure();
    }
  }, [userCoords, fetchAdventure]);

  const getPoiIcon = (poiType: string) => {
    switch (poiType) {
      case 'cafe': return faMugHot;
      case 'park': return faTree;
      case 'viewpoint': return faBinoculars;
      case 'bakery': return faBirthdayCake;
      case 'art_culture': return faPalette;
      case 'shop_local': return faStore;
      case 'curiosity': return faMapSigns;
      default: return faMapMarkedAlt;
    }
  };

  const getAdventureIcon = (iconName?: string) => {
    if (!iconName) return faCompass;
    switch(iconName) {
      case 'walking': return faWalking;
      case 'hiking': return faHiking;
      default: return faCompass;
    }
  }

  if (!userCoords) {
    return (
      <IonCard className={`shadow-lg rounded-xl ${className}`}>
        <IonCardHeader>
          <IonCardTitle className='text-lg text-gray-700'>Giro Esplorativo Improvvisato</IonCardTitle>
        </IonCardHeader>
        <IonCardContent className='text-center text-gray-500'>
          <FontAwesomeIcon icon={faExclamationTriangle} className='text-2xl mb-2 text-orange-400' />
          <p>Posizione utente non disponibile per suggerire un\'avventura.</p>
        </IonCardContent>
      </IonCard>
    );
  }

  if (isLoading) {
    return (
      <IonCard className={`shadow-lg rounded-xl ${className}`}>
        <IonCardHeader>
          <IonCardTitle className='text-lg text-gray-700'>Giro Esplorativo Improvvisato</IonCardTitle>
        </IonCardHeader>
        <IonCardContent className='text-center py-8'>
          <IonSpinner name="crescent" color="primary" />
          <p className='mt-2 text-sm text-gray-600'>Stiamo cercando qualcosa di speciale per te...</p>
        </IonCardContent>
      </IonCard>
    );
  }

  if (error) {
    return (
      <IonCard className={`shadow-lg rounded-xl ${className} border-l-4 border-red-500`}>
        <IonCardHeader>
          <IonCardTitle className='text-lg text-red-700'>Ops! Qualcosa è andato storto</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <div className='text-center mb-3'>
            <FontAwesomeIcon icon={faExclamationTriangle} className='text-3xl text-red-500' />
          </div>
          <p className='text-sm text-gray-700 mb-3 text-center'>{error.message}</p>
          <IonButton expand="block" fill="outline" color="medium" onClick={fetchAdventure}>
            <IonIcon slot="start" icon={refreshOutline} />
            Riprova
          </IonButton>
        </IonCardContent>
      </IonCard>
    );
  }

  if (!adventure) {
    return null; // Non dovrebbe succedere se non c'è errore e non sta caricando
  }

  return (
    <IonCard className={`shadow-lg rounded-xl ${className} bg-gradient-to-br from-sky-50 to-cyan-50`}>
      <IonCardHeader className='pb-2'>
        <div className='flex items-center mb-1'>
          <FontAwesomeIcon icon={getAdventureIcon(adventure.icon)} className='text-3xl text-cyan-600 mr-3' />
          <div>
            <IonCardTitle className='text-xl font-semibold text-cyan-800'>{adventure.title}</IonCardTitle>
            {adventure.description && <IonCardSubtitle className='text-sm text-cyan-700'>{adventure.description}</IonCardSubtitle>}
          </div>
        </div>
      </IonCardHeader>

      <IonCardContent>
        <IonList lines="none" className='bg-transparent -mx-2 mb-2'>
          {adventure.pois.map(poi => (
            <IonItem key={poi.id} className='mb-1.5 p-2 rounded-lg bg-white/70 shadow-sm backdrop-blur-sm'>
              <div slot="start" className='flex items-center justify-center w-6 h-full'>
                 <FontAwesomeIcon icon={getPoiIcon(poi.type)} className='text-lg text-cyan-600' />
              </div>
              <IonLabel>
                <h3 className='font-medium text-gray-800'>{poi.name}</h3>
                {poi.description && <p className='text-xs text-gray-600 whitespace-normal'>{poi.description}</p>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        <div className='flex items-center justify-between text-xs text-gray-600 mb-3'>
          {adventure.estimatedDuration && <span>Durata: ~{adventure.estimatedDuration}</span>}
          {adventure.themeTags && adventure.themeTags.length > 0 && 
            <div className='flex flex-wrap gap-1 justify-end'>
              {adventure.themeTags.slice(0,2).map(tag => 
                <IonChip key={tag} className='px-2 py-0.5 text-xs bg-cyan-100 text-cyan-700'>{tag}</IonChip>
              )}
            </div>
          }
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <IonButton fill="outline" color="secondary" onClick={() => console.log('TODO: Mostra su mappa', adventure)}>
            <IonIcon slot="start" icon={mapOutline} />
            Mappa
          </IonButton>
          <IonButton fill="solid" color="primary" onClick={fetchAdventure}>
            <IonIcon slot="start" icon={refreshOutline} />
            Nuovo Giro
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default SpontaneousExplorerWidget;
