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
    if (!isSuper) {
      console.log('[ActiveSessions] Not super admin, skipping realtime subscription');
      return;
    }

    console.log('[ActiveSessions] Setting up realtime subscription...');

    const channel = supabase
      .channel('active-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'login_attempts'
        },
        (payload) => {
          console.log('[ActiveSessions] login_attempts change detected:', payload);
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
        (payload) => {
          console.log('[ActiveSessions] locked_accounts change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
        }
      )
      .subscribe((status) => {
        console.log('[ActiveSessions] Subscription status:', status);
      });

    return () => {
      console.log('[ActiveSessions] Removing channel...');
      supabase.removeChannel(channel);
    };
  }, [isSuper, queryClient]);

  const { data: activeSessions = [], isLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      console.log('[ActiveSessions] Fetching active sessions...');
      const { data, error } = await supabase.functions.invoke('get-active-sessions');

      if (error) {
        console.error('[ActiveSessions] Error fetching:', error);
        throw error;
      }

      console.log('[ActiveSessions] Fetched sessions:', data?.sessions?.length || 0);
      return (data?.sessions || []) as ActiveSession[];
    },
    enabled: isSuper,
  });

  const terminateSession = useMutation({
    mutationFn: async (userId: string) => {
      console.log('[ActiveSessions] Terminating session for:', userId);
      const { data, error } = await supabase.functions.invoke('terminate-user-session', {
        body: { userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      console.log('[ActiveSessions] Session terminated successfully');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('Felhasználó kijelentkeztetve');
    },
    onError: (error: any) => {
      console.error('[ActiveSessions] Error terminating session:', error);
      toast.error('Hiba a kijelentkeztetés során');
    },
  });

  return {
    activeSessions,
    isLoading,
    terminateSession,
  };
};
