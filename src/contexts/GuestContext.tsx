import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const GUEST_UUID_KEY = 'edureach:guest-id';
const GUEST_SINCE_KEY = 'edureach:guest-since';
const LAST_REMINDER_KEY = 'edureach:last-reminder-date';
const TRIAL_DAYS = 14;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

interface GuestContextType {
  isGuest: boolean;
  isReady: boolean;
  guestTrialExpired: boolean;
  guestDaysRemaining: number;
  guestDaysElapsed: number;
  shouldShowReminder: boolean;
  dismissReminder: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestSince, setGuestSince] = useState<number | null>(null);
  const [lastReminderDate, setLastReminderDate] = useState<string>('');

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const hasUuid = !!localStorage.getItem(GUEST_UUID_KEY);
      const raw = localStorage.getItem(GUEST_SINCE_KEY);
      const lastReminder = localStorage.getItem(LAST_REMINDER_KEY) ?? '';
      setIsGuest(hasUuid);
      setGuestSince(raw ? parseInt(raw, 10) : null);
      setLastReminderDate(lastReminder);
    } catch {
      // localStorage unavailable — default to no guest
    }
    setIsReady(true);
  }, []);

  const guestDaysElapsed = guestSince
    ? Math.floor((Date.now() - guestSince) / (1000 * 60 * 60 * 24))
    : 0;
  const guestDaysRemaining = Math.max(0, TRIAL_DAYS - guestDaysElapsed);
  const guestTrialExpired = isGuest && guestDaysRemaining === 0;

  // Show once per day, only for active (non-expired) guest sessions
  const shouldShowReminder = isGuest && !guestTrialExpired && lastReminderDate !== todayStr();

  // Keep state in sync across tabs
  useEffect(() => {
    const handler = () => {
      const hasGuest = !!localStorage.getItem(GUEST_UUID_KEY);
      setIsGuest(hasGuest);
      if (!hasGuest) setGuestSince(null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const dismissReminder = () => {
    const today = todayStr();
    try { localStorage.setItem(LAST_REMINDER_KEY, today); } catch { /* ignore */ }
    setLastReminderDate(today);
  };

  const enterGuestMode = () => {
    const existing = localStorage.getItem(GUEST_UUID_KEY);
    const uuid = existing || generateUUID();
    const existingSince = localStorage.getItem(GUEST_SINCE_KEY);
    const now = existingSince ? parseInt(existingSince, 10) : Date.now();
    localStorage.setItem(GUEST_UUID_KEY, uuid);
    localStorage.setItem(GUEST_SINCE_KEY, String(now));
    setGuestSince(now);
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    localStorage.removeItem(GUEST_UUID_KEY);
    localStorage.removeItem(GUEST_SINCE_KEY);
    localStorage.removeItem(LAST_REMINDER_KEY);
    setIsGuest(false);
    setGuestSince(null);
    setLastReminderDate('');
  };

  return (
    <GuestContext.Provider
      value={{
        isGuest, isReady, guestTrialExpired, guestDaysRemaining, guestDaysElapsed,
        shouldShowReminder, dismissReminder, enterGuestMode, exitGuestMode,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = (): GuestContextType => {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest must be used inside GuestProvider');
  return ctx;
};
