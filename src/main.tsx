import './lib/axios';
import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/leaflet.css';
import './styles/theme.css';
// Initialize font-size scaling from persisted user preference
import './store/fontSizeStore';
// Initialize desktop width preference (80% / 100%) — desktop only via CSS
import './store/desktopWidthStore';
import { ThemeProvider } from './context/ThemeContext';
import { prefetchIntroVideoUrl } from './services/introVideoService';

prefetchIntroVideoUrl();

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find root element');
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
