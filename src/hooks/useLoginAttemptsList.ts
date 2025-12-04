import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';

export const useLoginAttemptsList = (limit = 100) => {
  const queryClient = useQueryClient();
  const { data: currentProfile } = useUserProfile();
  const isSuper = isSuperAdmin(currentProfile);

  // Real-time subscription for login_attempts
  useEffect(() => {
    if (!isSuper) {
      console.log('[LoginAttempts] Not super admin, skipping realtime subscription');
      return;
    }

    console.log('[LoginAttempts] Setting up realtime subscription...');

    const channel = supabase
      .channel('login-attempts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'login_attempts'
        },
        (payload) => {
          console.log('[LoginAttempts] New login attempt detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['login-attempts', limit] });
        }
      )
      .subscribe((status) => {
        console.log('[LoginAttempts] Subscription status:', status);
      });

    return () => {
      console.log('[LoginAttempts] Removing channel...');
      supabase.removeChannel(channel);
    };
  }, [isSuper, queryClient, limit]);

  const { data: loginAttempts = [], isLoading } = useQuery({
    queryKey: ['login-attempts', limit],
    queryFn: async () => {
      console.log('[LoginAttempts] Fetching login attempts...');
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[LoginAttempts] Error fetching:', error);
        throw error;
      }

      console.log('[LoginAttempts] Fetched attempts:', data?.length || 0);
      return data || [];
    },
    enabled: isSuper,
  });

  return {
    loginAttempts,
    isLoading,
  };
};
