import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShareAlt, 
  faClipboard, 
  faCheck, 
  faQrcode,
  faTimes,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { LocationItem } from '../services/locationService';
import { createError, ErrorType, ErrorSeverity, AppError } from '../services/errorService';
import ErrorFeedback from './ErrorFeedback';

interface LocationSharingProps {
  location: LocationItem;
  onClose?: () => void;
}

/**
 * Componente per la condivisione di una località tramite vari metodi
 * - Copia del link
 * - QR Code
 * - Condivisione nativa (se disponibile)
 * 
 * Funzionalità non basata su AI
 */
const LocationSharing: React.FC<LocationSharingProps> = ({ location, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  
  // Genera l'URL per la condivisione
  const getSharingUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share?loc=${encodeURIComponent(location.name)}&lat=${location.lat}&lon=${location.lon}`;
  };
  
  // Genera un qr code basato sull'URL di condivisione
  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    setError(null);
    
    try {
      setShowQR(true);
      // In una implementazione reale, qui genereremmo davvero un QR code
      // Per ora simuliamo solo un ritardo
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError(createError(
        ErrorType.UNKNOWN,
        'Error al generar código QR',
        err instanceof Error ? err : new Error(String(err)),
        'No se pudo generar el código QR para compartir',
        ErrorSeverity.LOW
      ));
    } finally {
      setIsGeneratingQR(false);
    }
  };
  
  // Gestisce la copia del link
  const handleCopyLink = async () => {
    try {
      const shareUrl = getSharingUrl();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      setError(createError(
        ErrorType.PERMISSION,
        'Error al copiar enlace',
        err instanceof Error ? err : new Error(String(err)),
        'No se pudo copiar el enlace. Comprueba los permisos del navegador.',
        ErrorSeverity.LOW
      ));
    }
  };
  
  // Gestisce la condivisione nativa (se supportata)
  const handleShare = async () => {
    if (!navigator.share) {
      setError(createError(
        ErrorType.VALIDATION,
        'Compartir no soportado',
        new Error('Web Share API not supported'),
        'Tu navegador no soporta la función de compartir.',
        ErrorSeverity.LOW
      ));
      return;
    }
    
    try {
      await navigator.share({
        title: `Tiempo en ${location.name}`,
        text: `Echa un vistazo al tiempo en ${location.name}: ${location.temperature}°C, ${location.condition}`,
        url: getSharingUrl()
      });
    } catch (err) {
      // Non mostriamo errori per condivisioni cancellate dall'utente
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        setError(createError(
          ErrorType.UNKNOWN,
          'Error al compartir',
          err,
          'No se pudo compartir el contenido.',
          ErrorSeverity.LOW
        ));
      }
    }
  };

  // Finto QR code (in una app reale, genereremmo davvero un QR)
  const renderQRCode = () => (
    <div className="flex flex-col items-center p-4 mb-4 bg-white rounded-lg border border-gray-200">
      <div className="w-48 h-48 bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {/* Simulazione di QR code con CSS */}
        <div className="w-40 h-40 bg-white relative">
          <div className="absolute left-2 top-2 w-8 h-8 bg-black rounded-sm"></div>
          <div className="absolute right-2 top-2 w-8 h-8 bg-black rounded-sm"></div>
          <div className="absolute left-2 bottom-2 w-8 h-8 bg-black rounded-sm"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 grid grid-cols-5 grid-rows-5 gap-1">
              {Array(25).fill(0).map((_, i) => (
                <div 
                  key={i} 
                  className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-600 text-center">
        Escanea este código QR para compartir la ubicación
      </p>
    </div>
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Compartir {location.name}
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>
      
      {error && (
        <ErrorFeedback 
          error={error}
          className="mb-3"
        />
      )}
      
      {showQR ? (
        isGeneratingQR ? (
          <div className="flex flex-col items-center p-8">
            <FontAwesomeIcon icon={faSpinner} spin className="text-amber-500 text-2xl mb-2" />
            <p className="text-gray-600">Generando código QR...</p>
          </div>
        ) : (
          <>
            {renderQRCode()}
            <button
              onClick={() => setShowQR(false)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-800 transition-colors"
            >
              Volver a opciones de compartir
            </button>
          </>
        )
      ) : (
        <>
          <div className="flex flex-col space-y-3 mb-4">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center py-3 px-4 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faClipboard} className="mr-2" />
              {copied ? 'Enlace copiado!' : 'Copiar enlace'}
            </button>
            
            <button
              onClick={generateQRCode}
              className="flex items-center justify-center py-3 px-4 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <FontAwesomeIcon icon={faQrcode} className="mr-2" />
              Generar código QR
            </button>
            
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleShare}
                className="flex items-center justify-center py-3 px-4 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
              >
                <FontAwesomeIcon icon={faShareAlt} className="mr-2" />
                Compartir
              </button>
            )}
          </div>
          
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm text-gray-500 text-center">
              Compartiendo: {location.name} - {location.temperature}°C, {location.condition}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationSharing;
