import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useInactivityLogout = (timeoutSeconds: number) => {
  const { user } = useAuth();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
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
    // Clear existing timer
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    warningShownRef.current = false;

    // Don't set timer if user is not logged in or timeout is 0 (disabled)
    if (!user || timeoutSeconds <= 0) {
      return;
    }

    // Show warning 1 minute before logout
    const warningTime = Math.max(0, (timeoutSeconds - 60) * 1000);
    if (warningTime > 0) {
      setTimeout(showWarning, warningTime);
    }

    // Set logout timer
    timeoutIdRef.current = setTimeout(() => {
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
      
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [user, timeoutSeconds, resetTimer]);
};
