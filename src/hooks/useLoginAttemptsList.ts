import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';

export const useLoginAttemptsList = (limit = 100) => {
  const { data: currentProfile } = useUserProfile();
  const isSuper = isSuperAdmin(currentProfile);

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
    enabled: isSuper, // Only fetch if user is super admin
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  return {
    loginAttempts,
    isLoading,
  };
};
