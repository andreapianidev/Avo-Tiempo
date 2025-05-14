import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

interface AlertBoxProps {
  message: string;
}

const AlertBox: React.FC<AlertBoxProps> = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="alert-box flex items-start gap-2">
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-[#B54200] text-xl mt-0.5" />
      <div>
        <p className="font-medium">Alerta Meteorológica</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default AlertBox;
