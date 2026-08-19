import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProfileProvider } from './context/ProfileContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { syncFromIdb } from './lib/storage.js';
import './styles/index.css';

// Restore any rooms from IndexedDB that may be missing from localStorage
// (e.g. after browser cleared localStorage). Fire-and-forget — the app
// renders immediately; the sync resolves before the user can interact.
syncFromIdb();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProfileProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ProfileProvider>
    </BrowserRouter>
  </React.StrictMode>
);
