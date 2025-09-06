import './lib/axios';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/leaflet.css';
import './styles/theme.css';
import { ThemeProvider } from './context/ThemeContext';

console.log('Starting application initialization...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find root element');
  throw new Error('Failed to find the root element');
}

console.log('Root element found, creating React root...');

const root = createRoot(rootElement);

try {
  console.log('Attempting to render App...');
  root.render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error rendering app:', error);
}
