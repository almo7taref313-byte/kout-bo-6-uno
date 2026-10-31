import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register lightweight Network-First Service Worker so Android/Chrome enables 1-tap native PWA installation
// while always loading the latest code directly from the network
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js?v=3', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);
