// إزالة أي كاش قديم أو Service Worker معلق في هواتف اللاعبين نهائياً
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically unregister stale service workers and clear cache storage so users always get fresh code
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
