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
    if (!isSuper) return;

    const channel = supabase
      .channel('login-attempts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'login_attempts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['login-attempts', limit] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuper, queryClient, limit]);

  const { data: loginAttempts = [], isLoading } = useQuery({
    queryKey: ['login-attempts', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempt_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching login attempts:', error);
        throw error;
      }

      return data || [];
    },
    enabled: isSuper,
  });

  return {
    loginAttempts,
    isLoading,
  };
};
