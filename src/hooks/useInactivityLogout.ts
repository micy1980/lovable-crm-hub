import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useInactivityLogout = (timeoutSeconds: number) => {
  const { user } = useAuth();
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.info('Automatikus kijelentkezés inaktivitás miatt');
  }, []);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      toast.warning('1 perc múlva kijelentkezik inaktivitás miatt', {
        duration: 5000,
      });
      warningShownRef.current = true;
    }
  }, []);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    warningShownRef.current = false;

    // Don't set timer if user is not logged in or timeout is 0 (disabled)
    if (!user || timeoutSeconds <= 0) {
      return;
    }

    // Show warning 1 minute before logout
    const warningTime = Math.max(0, (timeoutSeconds - 60) * 1000);
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(showWarning, warningTime);
    }

    // Set logout timer
    logoutTimeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutSeconds * 1000);
  }, [user, timeoutSeconds, logout, showWarning]);

  useEffect(() => {
    // Don't track if user is not logged in or timeout is disabled
    if (!user || timeoutSeconds <= 0) {
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any activity
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Start initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, timeoutSeconds, resetTimer]);
};
