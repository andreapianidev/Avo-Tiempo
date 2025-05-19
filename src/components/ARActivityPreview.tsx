import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, faVrCardboard, faCube, faTimes, faCamera,
  faSyncAlt, faExpand, faCompress, faArrowsAlt
} from '@fortawesome/free-solid-svg-icons';

// Immagini statiche da usare per simulare i modelli 3D delle attività
type ActivityImages = Record<string, string>;

// Mapping delle attività alle immagini demo (in una versione reale, sarebbero veri asset 3D)
const activityImages: ActivityImages = {
  'hiking': '/images/activities/hiking.jpg',
  'beach': '/images/activities/beach.jpg',
  'museum': '/images/activities/museum.jpg',
  'gastronomy': '/images/activities/restaurant.jpg',
  'cycling': '/images/activities/bicycle.jpg',
  'stargazing': '/images/activities/stars.jpg',
  'family-park': '/images/activities/park.jpg',
  'default': '/images/activities/default.jpg'
};

// Nella versione reale, queste sarebbero immagini effettive salvate nel progetto
// Per ora usiamo delle URL dimostrative che puntano a placeholder
const demoImagePlaceholder = 'https://via.placeholder.com/400x300/2563eb/ffffff?text=';

interface ARActivityPreviewProps {
  activityId: string;
  locationName: string;
  onClose: () => void;
}

const ARActivityPreview: React.FC<ARActivityPreviewProps> = ({ activityId, locationName, onClose }) => {
  // Simula il caricamento dell'immagine
  const [isLoading, setIsLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isRotating, setIsRotating] = useState(false);
  
  // Ottiene l'immagine corrispondente all'attività
  const imageName = activityId.charAt(0).toUpperCase() + activityId.slice(1);
  const imageUrl = `${demoImagePlaceholder}${imageName}`;
  
  useEffect(() => {
    // Simula un tempo di caricamento realistico
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    // Effetto di rotazione automatica
    let rotationInterval: NodeJS.Timeout | null = null;
    if (!isLoading && isRotating) {
      rotationInterval = setInterval(() => {
        setRotation(prev => (prev + 2) % 360);
      }, 50);
    }
    
    return () => {
      clearTimeout(timer);
      if (rotationInterval) clearInterval(rotationInterval);
    };
  }, [isLoading, isRotating]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const toggleRotation = () => setIsRotating(prev => !prev);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative w-full h-full max-w-3xl max-h-[70vh] bg-gray-900 rounded-lg overflow-hidden shadow-xl">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent z-10 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white text-lg font-semibold">Anteprima AR: {imageName}</h3>
              <p className="text-gray-300 text-sm">Posizione: {locationName}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white bg-red-500 hover:bg-red-600 rounded-full w-8 h-8 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
        
        {/* Contenuto */}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <FontAwesomeIcon icon={faSpinner} spin className="text-4xl mb-3" />
              <p>Caricamento modello 3D...</p>
              <p className="text-sm text-gray-400 mt-2">Preparando l'esperienza visiva</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 overflow-hidden">
            {/* Anteprima "3D" simulata */}
            <div 
              className="relative" 
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: isRotating ? 'none' : 'transform 0.3s ease'
              }}
            >
              <div className="relative bg-blue-500 rounded-lg overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt={`Anteprima 3D di ${activityId}`}
                  className="block w-64 h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900 to-transparent opacity-30"></div>
              </div>
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-4 border-white border-opacity-30 rounded-lg"></div>
            </div>
            
            {/* Controlli */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-70 rounded-full py-2 px-4 flex space-x-4">
              <button 
                className="text-white hover:text-blue-300 transition-colors"
                onClick={toggleRotation}
                title={isRotating ? "Ferma rotazione" : "Avvia rotazione"}
              >
                <FontAwesomeIcon icon={faSyncAlt} className={isRotating ? "animate-spin" : ""} />
              </button>
              <button 
                className="text-white hover:text-blue-300 transition-colors"
                onClick={handleZoomOut}
                title="Zoom out"
              >
                <FontAwesomeIcon icon={faCompress} />
              </button>
              <button 
                className="text-white hover:text-blue-300 transition-colors"
                onClick={handleZoomIn}
                title="Zoom in"
              >
                <FontAwesomeIcon icon={faExpand} />
              </button>
              <button 
                className="text-white hover:text-blue-300 transition-colors"
                title="Muovi"
              >
                <FontAwesomeIcon icon={faArrowsAlt} />
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent z-10 p-4">
          <div className="text-white text-center">
            <p className="mb-2">Interagisci con il modello: usa i controlli per ruotare e ingrandire</p>
            <div className="flex justify-center space-x-4">
              <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center">
                <FontAwesomeIcon icon={faVrCardboard} className="mr-2" />
                Vista in AR
              </button>
              <button className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg flex items-center">
                <FontAwesomeIcon icon={faCube} className="mr-2" />
                Esplora in 3D
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARActivityPreview;
