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

  const { data: activeSessions = [], isLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      // Call edge function to get real session data from auth.users
      const { data, error } = await supabase.functions.invoke('get-active-sessions');

      if (error) {
        console.error('Error fetching active sessions:', error);
        throw error;
      }

      return (data?.sessions || []) as ActiveSession[];
    },
    enabled: isSuper,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
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
