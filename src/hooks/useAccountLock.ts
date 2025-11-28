import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAccountLock = () => {
  const queryClient = useQueryClient();

  const checkAccountLock = async (userId: string) => {
    const { data, error } = await supabase
      .rpc('is_account_locked', { _user_id: userId });

    if (error) throw error;
    return data;
  };

  const unlockAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('locked_accounts')
        .update({ 
          unlocked_at: new Date().toISOString(),
          unlocked_by: (await supabase.auth.getUser()).data.user?.id 
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

  return {
    checkAccountLock,
    unlockAccount,
  };
};
