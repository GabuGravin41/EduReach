import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours cache retention
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const notifyUpdateAvailable = () => {
      window.dispatchEvent(new CustomEvent('sw:update-available'));
    };

    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(__APP_BUILD_ID__)}`).then((registration) => {
      (window as any).__EDUREACH_SW_REG__ = registration;

      if (registration.waiting) {
        notifyUpdateAvailable();
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdateAvailable();
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}