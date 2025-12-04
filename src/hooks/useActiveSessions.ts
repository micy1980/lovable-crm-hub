import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserProfile } from './useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';

interface ActiveSession {
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
}

export const useActiveSessions = () => {
  const queryClient = useQueryClient();
  const { data: currentProfile } = useUserProfile();
  const isSuper = isSuperAdmin(currentProfile);

  // Real-time subscription for login_attempts and locked_accounts
  useEffect(() => {
    if (!isSuper) return;

    const channel = supabase
      .channel('active-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'login_attempts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locked_accounts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuper, queryClient]);

  const { data: activeSessions = [], isLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-active-sessions');

      if (error) {
        console.error('Error fetching active sessions:', error);
        throw error;
      }

      return (data?.sessions || []) as ActiveSession[];
    },
    enabled: isSuper,
  });

  const terminateSession = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('terminate-user-session', {
        body: { userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('Felhasználó kijelentkeztetve');
    },
    onError: (error: any) => {
      console.error('Error terminating session:', error);
      toast.error('Hiba a kijelentkeztetés során');
    },
  });

  return {
    activeSessions,
    isLoading,
    terminateSession,
  };
};
