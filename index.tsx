import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';
import { GuestProvider } from './src/contexts/GuestContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { Toaster } from './components/ui/Toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60 * 24,
      // Don't retry 4xx errors — they're not transient
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GuestProvider>
            <ToastProvider>
              <App />
              <Toaster />
            </ToastProvider>
          </GuestProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
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