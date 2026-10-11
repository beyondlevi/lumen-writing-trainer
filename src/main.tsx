import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {locale} from './i18n/strings';
import {GameProvider} from './state/GameProvider';
import './styles.css';

document.documentElement.lang = locale === 'pt' ? 'pt-BR' : 'en';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root mount element');

createRoot(root).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
