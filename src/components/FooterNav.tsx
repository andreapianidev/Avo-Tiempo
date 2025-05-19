import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faThermometer, faLocationDot, faGear, faHiking } from '@fortawesome/free-solid-svg-icons';

const FooterNav: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-[var(--color-highlight)]' : 'text-[var(--color-text-secondary)]';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#fff8ed] shadow-lg px-2 py-3 border-t border-[var(--color-border)]">
      <div className="flex justify-around items-center">
        <Link to="/" className={`flex flex-col items-center ${isActive('/')}`}>
          <FontAwesomeIcon icon={faSun} className="text-2xl" />
          <span className="text-xs mt-1">Tiempo</span>
        </Link>
        
        <Link to="/locations" className={`flex flex-col items-center ${isActive('/locations')}`}>
          <FontAwesomeIcon icon={faLocationDot} className="text-2xl" />
          <span className="text-xs mt-1">Lugares</span>
        </Link>
        
        <Link to="/trends" className={`flex flex-col items-center ${isActive('/trends')}`}>
          <FontAwesomeIcon icon={faThermometer} className="text-2xl" />
          <span className="text-xs mt-1">Tendencias</span>
        </Link>

        <Link to="/activities" className={`flex flex-col items-center ${isActive('/activities')}`}>
          <FontAwesomeIcon icon={faHiking} className="text-2xl" />
          <span className="text-xs mt-1">Attività</span>
        </Link>
        
        <Link to="/settings" className={`flex flex-col items-center ${isActive('/settings')}`}>
          <FontAwesomeIcon icon={faGear} className="text-2xl" />
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </div>
    </div>
  );
};

export default FooterNav;
