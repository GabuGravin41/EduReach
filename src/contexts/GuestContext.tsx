import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const GUEST_UUID_KEY = 'edureach:guest-id';
const GUEST_SINCE_KEY = 'edureach:guest-since';
const TRIAL_DAYS = 14;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface GuestContextType {
  isGuest: boolean;
  isReady: boolean;          // true once localStorage hydration is complete
  guestTrialExpired: boolean;
  guestDaysRemaining: number;
  guestDaysElapsed: number;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestSince, setGuestSince] = useState<number | null>(null);

  // Hydrate from localStorage on mount (runs only client-side)
  useEffect(() => {
    try {
      const hasUuid = !!localStorage.getItem(GUEST_UUID_KEY);
      const raw = localStorage.getItem(GUEST_SINCE_KEY);
      setIsGuest(hasUuid);
      setGuestSince(raw ? parseInt(raw, 10) : null);
    } catch {
      // localStorage unavailable (private browsing edge case) — default to no guest
    }
    setIsReady(true);
  }, []);

  const guestDaysElapsed = guestSince
    ? Math.floor((Date.now() - guestSince) / (1000 * 60 * 60 * 24))
    : 0;
  const guestDaysRemaining = Math.max(0, TRIAL_DAYS - guestDaysElapsed);
  const guestTrialExpired = isGuest && guestDaysRemaining === 0;

  // Keep state in sync with localStorage (e.g. if another tab clears it)
  useEffect(() => {
    const handler = () => {
      const hasGuest = !!localStorage.getItem(GUEST_UUID_KEY);
      setIsGuest(hasGuest);
      if (!hasGuest) setGuestSince(null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const enterGuestMode = () => {
    // Always write fresh keys — idempotent if already a guest, resets on stale state
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
    setIsGuest(false);
    setGuestSince(null);
  };

  return (
    <GuestContext.Provider
      value={{ isGuest, isReady, guestTrialExpired, guestDaysRemaining, guestDaysElapsed, enterGuestMode, exitGuestMode }}
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
