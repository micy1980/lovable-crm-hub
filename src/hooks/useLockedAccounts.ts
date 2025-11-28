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
        .from('locked_accounts')
        .select('*')
        .is('unlocked_at', null)
        .order('locked_at', { ascending: false });

      if (error) {
        console.error('Error fetching locked accounts:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentProfile && currentProfile.role === 'super_admin',
  });

  const unlockAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('locked_accounts')
        .update({ 
          unlocked_at: new Date().toISOString(),
          unlocked_by: user?.id 
        })
        .eq('user_id', userId)
        .is('unlocked_at', null);

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
    return lockedAccounts.some((locked: any) => 
      locked.user_id === userId && 
      !locked.unlocked_at &&
      (!locked.locked_until || new Date(locked.locked_until) > new Date())
    );
  };

  return {
    lockedAccounts,
    isLoading,
    unlockAccount,
    isUserLocked,
  };
};
