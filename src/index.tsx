import * as React from 'react';
import ReactDOM from 'react-dom/client';

/* Importazioni Core di Ionic */
import '@ionic/react/css/core.css';

/* Importazioni CSS di base necessarie */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Importazioni CSS opzionali */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Importazioni per Capacitor */
import { Capacitor } from '@capacitor/core';

/* Importazioni dell'app */
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { initializeTheme } from './services/themeService';

// Initialize theme before rendering
initializeTheme();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline functionality
serviceWorkerRegistration.register({
  onSuccess: () => console.log('Service worker registered successfully'),
  onUpdate: () => console.log('New content is available and will be used when all tabs for this page are closed')
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
