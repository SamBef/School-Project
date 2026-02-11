import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadLocale } from './i18n';
import App from './App';
import './index.css';

const locale = localStorage.getItem('kobotrack_locale') || 'en';
loadLocale(locale).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
