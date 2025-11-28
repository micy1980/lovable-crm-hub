import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserProfile } from './useUserProfile';

export const useLockedAccounts = () => {
  const queryClient = useQueryClient();
  const { data: currentProfile } = useUserProfile();

  const { data: lockedAccounts = [], isLoading } = useQuery({
    queryKey: ['locked-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_locked_user_ids');

      if (error) {
        console.error('Error fetching locked accounts:', error);
        return [];
      }
      return data || [];
    },
    // Always run query, RLS will handle permissions via security definer
  });

  const unlockAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.rpc('unlock_account_by_user_id', {
        _user_id: userId,
        _unlocked_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
      toast.success('Felhasználó sikeresen feloldva');
    },
    onError: (error) => {
      console.error('Error unlocking account:', error);
      toast.error('Hiba a felhasználó feloldása során');
    },
  });

  const isUserLocked = (userId: string): boolean => {
    return lockedAccounts.some((locked: any) => locked.user_id === userId);
  };

  return {
    lockedAccounts,
    isLoading,
    unlockAccount,
    isUserLocked,
  };
};
