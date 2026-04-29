/**
 * usePushNotifications
 * ---------------------
 * Manages the full Web Push subscription lifecycle for the EduReach PWA:
 *
 *   1. Fetches the VAPID public key from the backend.
 *   2. Requests notification permission from the browser.
 *   3. Subscribes the browser to push via the service worker PushManager.
 *   4. Saves the subscription to the backend (POST /api/notifications/push/subscribe/).
 *   5. On unmount / unsubscribe, removes the subscription from the backend.
 *
 * Usage:
 *   const { isSupported, isSubscribed, permission, subscribe, unsubscribe, error } = usePushNotifications();
 *
 * Notes:
 *   - Push is only available when a service worker is registered.
 *   - Must be called AFTER the user logs in (needs auth token).
 *   - The hook auto-subscribes if the user previously granted permission.
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';

export type PushPermission = 'default' | 'granted' | 'denied';

interface UsePushNotificationsResult {
  /** True if the browser supports Web Push */
  isSupported: boolean;
  /** True if currently subscribed and saved to backend */
  isSubscribed: boolean;
  /** Current Notification.permission value */
  permission: PushPermission;
  /** Request permission and subscribe */
  subscribe: () => Promise<void>;
  /** Unsubscribe and remove from backend */
  unsubscribe: () => Promise<void>;
  /** Error message if something went wrong */
  error: string | null;
  /** True while async work is in progress */
  isLoading: boolean;
}

/** Convert a URL-safe base64 string (VAPID public key) to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getVapidPublicKey(): Promise<string> {
  const res = await apiClient.get<{ vapid_public_key: string }>('notifications/push/vapid-key/');
  return res.data.vapid_public_key;
}

async function saveSubscriptionToBackend(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  await apiClient.post('notifications/push/subscribe/', {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });
}

async function removeSubscriptionFromBackend(endpoint: string): Promise<void> {
  await apiClient.delete('notifications/push/subscribe/', { data: { endpoint } });
}

export function usePushNotifications(): UsePushNotificationsResult {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<PushPermission>(
    isSupported ? (Notification.permission as PushPermission) : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: check if already subscribed
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  // Auto-subscribe if permission was previously granted (PWA re-opened)
  useEffect(() => {
    if (!isSupported || permission !== 'granted' || isSubscribed) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        // Refresh the backend record in case keys changed
        try {
          await saveSubscriptionToBackend(existing);
        } catch {
          // Non-fatal
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);
      if (result !== 'granted') {
        setError('Notification permission was denied.');
        return;
      }

      // 2. Get VAPID key
      const vapidKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // 3. Subscribe via service worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 4. Save to backend
      await saveSubscriptionToBackend(sub);
      setIsSubscribed(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable push notifications.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await removeSubscriptionFromBackend(endpoint);
      }
      setIsSubscribed(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    error,
    isLoading,
  };
}
