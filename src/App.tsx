import React, { useEffect, useState } from 'react';
/* Ionic Framework Components */
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonLabel, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
/* React Router v5 - utilizzare questa versione per compatibilità con Ionic */
import { Redirect, Route } from 'react-router-dom';

/* Ionic/Capacitor plugins */
import { Capacitor } from '@capacitor/core';

/* App pages */
import Home from './pages/Home';
import Locations from './pages/Locations';
import Trends from './pages/Trends';
import Settings from './pages/Settings';

/* Services */
import { getThemePreference } from './services/themeService';

/* Icons for tab bar - importiamo direttamente da FontAwesome per mantenere la coerenza */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faLocationDot, faChartLine, faCog } from '@fortawesome/free-solid-svg-icons';

// Inizializza Ionic React
setupIonicReact({
  mode: 'md', // Use Material Design style by default
  swipeBackEnabled: true
});

function App() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(getThemePreference());
  
  // Listen for storage events to sync theme across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'avo_weather_theme') {
        const newTheme = e.newValue as 'light' | 'dark' | 'system' || 'system';
        setTheme(newTheme);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Determina se l'app sta girando come app nativa o nel browser
  const isNative = Capacitor.isNativePlatform();

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/home" render={() => <Home />} exact={true} />
            <Route path="/locations" render={() => <Locations />} exact={true} />
            <Route path="/trends" render={() => <Trends />} exact={true} />
            <Route path="/settings" render={() => <Settings />} exact={true} />
            <Route path="/" render={() => <Redirect to="/home" />} exact={true} />
          </IonRouterOutlet>
          
          {/* Tab bar (sostituisce il Footer) */}
          <IonTabBar slot="bottom" className="bg-[#fff8ed] border-t border-[var(--color-border)]">
            <IonTabButton tab="home" href="/home" className="text-[var(--color-text-primary)]">
              <div className="flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faHome} className="h-5 w-5" />
                <IonLabel>Tempo</IonLabel>
              </div>
            </IonTabButton>
            
            <IonTabButton tab="locations" href="/locations" className="text-[var(--color-text-primary)]">
              <div className="flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5" />
                <IonLabel>Luoghi</IonLabel>
              </div>
            </IonTabButton>
            
            <IonTabButton tab="trends" href="/trends" className="text-[var(--color-text-primary)]">
              <div className="flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faChartLine} className="h-5 w-5" />
                <IonLabel>Tendenze</IonLabel>
              </div>
            </IonTabButton>
            
            <IonTabButton tab="settings" href="/settings" className="text-[var(--color-text-primary)]">
              <div className="flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
                <IonLabel>Impostazioni</IonLabel>
              </div>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}

export default App;
