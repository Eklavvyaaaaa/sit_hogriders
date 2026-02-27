import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode disabled to prevent double-firing of camera initialization in dev
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
);
