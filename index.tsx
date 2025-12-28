import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress harmless Instagram embed errors from Facebook's internal logger
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  // Filter out Facebook/Instagram internal errors
  if (
    message.includes('route config was null') ||
    message.includes('FBLOGGER') ||
    message.includes('ErrorUtils caught an error')
  ) {
    return; // Suppress these errors
  }
  originalError.apply(console, args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);