import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProfileProvider } from './context/ProfileContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { syncFromIdb } from './lib/storage.js';
import './styles/index.css';

syncFromIdb();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ProfileProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ProfileProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
// Fri Sep  4 03:04:13 UTC 2026
