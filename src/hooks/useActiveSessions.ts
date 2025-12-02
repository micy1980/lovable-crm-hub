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
      // Get all active users with their last sign in
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('email');

      if (error) {
        console.error('Error fetching active sessions:', error);
        throw error;
      }

      // For now, we show active users as "sessions" since Supabase doesn't expose session details
      // In production, you'd use admin API or custom session tracking
      return (profiles || []).map(p => ({
        user_id: p.id,
        user_email: p.email,
        user_full_name: p.full_name,
        last_sign_in_at: null, // Would need admin API access
        created_at: null,
      })) as ActiveSession[];
    },
    enabled: isSuper,
  });

  const terminateSession = useMutation({
    mutationFn: async (userId: string) => {
      // Call edge function to terminate user's sessions
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
