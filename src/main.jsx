import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ Register service worker scoped to /Wiz/
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Using a relative path keeps the scope under /Wiz/
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch(err => console.error('SW registration failed', err));
  });
}
