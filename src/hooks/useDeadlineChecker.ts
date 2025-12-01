import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to periodically check for task deadlines
 * Runs once when the app loads and then every hour
 */
export const useDeadlineChecker = () => {
  useEffect(() => {
    const checkDeadlines = async () => {
      try {
        console.log('Checking deadlines...');
        
        const { error } = await supabase.functions.invoke('check-deadlines', {
          body: {},
        });

        if (error) {
          console.error('Error checking deadlines:', error);
        } else {
          console.log('Deadline check completed');
        }
      } catch (error) {
        console.error('Error invoking deadline check:', error);
      }
    };

    // Check immediately on mount
    checkDeadlines();

    // Then check every hour
    const interval = setInterval(checkDeadlines, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
