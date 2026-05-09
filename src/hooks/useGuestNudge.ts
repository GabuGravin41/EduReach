import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuest } from '../contexts/GuestContext';
import { useAuth } from '../contexts/useAuth';

interface GuestNudgeState {
  visible: boolean;
  action: string;
}

interface UseGuestNudgeReturn {
  /** Call this instead of the real action when user might be a guest.
   *  Returns true if the nudge was triggered (action blocked), false if user is authenticated (proceed). */
  guardAction: (action: string, onProceed?: () => void) => boolean;
  nudgeProps: {
    visible: boolean;
    action: string;
    onDismiss: () => void;
    onSignUp: () => void;
    onLogin: () => void;
  };
  dismiss: () => void;
}

/**
 * Hook that guards write actions for guest users.
 *
 * Usage:
 *   const { guardAction, nudgeProps } = useGuestNudge();
 *   const handlePost = () => {
 *     if (guardAction('post to the community')) return;
 *     // proceed with the real action
 *   };
 *   return <><button onClick={handlePost}>Post</button><GuestNudge {...nudgeProps} onSignUp={...} onLogin={...} /></>
 */
export const useGuestNudge = (): UseGuestNudgeReturn => {
  const { isGuest, exitGuestMode } = useGuest();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nudge, setNudge] = useState<GuestNudgeState>({ visible: false, action: '' });

  const dismiss = useCallback(() => setNudge(prev => ({ ...prev, visible: false })), []);

  const goToAuth = useCallback(() => {
    exitGuestMode();
    navigate('/', { replace: true });
  }, [exitGuestMode, navigate]);

  const guardAction = useCallback(
    (action: string, onProceed?: () => void): boolean => {
      if (isGuest && !user) {
        setNudge({ visible: true, action });
        return true; // blocked
      }
      onProceed?.();
      return false; // not blocked
    },
    [isGuest, user],
  );

  return {
    guardAction,
    nudgeProps: {
      visible: nudge.visible,
      action: nudge.action,
      onDismiss: dismiss,
      onSignUp: goToAuth,
      onLogin: goToAuth,
    },
    dismiss,
  };
};
