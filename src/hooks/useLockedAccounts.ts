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
      // Get locked user IDs
      const { data: lockedUserIds, error: idsError } = await supabase
        .rpc('get_locked_user_ids');

      if (idsError) {
        console.error('Error fetching locked user IDs:', idsError);
        return [];
      }

      if (!lockedUserIds || lockedUserIds.length === 0) {
        return [];
      }

      // Get full locked account details
      const userIds = lockedUserIds.map((item: any) => item.user_id);
      const { data: lockedDetails, error: detailsError } = await supabase
        .from('locked_accounts')
        .select('*')
        .in('user_id', userIds)
        .is('unlocked_at', null);

      if (detailsError) {
        console.error('Error fetching locked account details:', detailsError);
        return lockedUserIds; // Return just IDs if details fail
      }

      // Get recent login attempts for IP addresses
      const { data: recentAttempts } = await supabase
        .from('login_attempts')
        .select('user_id, ip_address, attempt_time')
        .in('user_id', userIds)
        .eq('success', false)
        .order('attempt_time', { ascending: false })
        .limit(100);

      // Map IP addresses to locked accounts
      const lockedWithDetails = lockedDetails?.map((lock: any) => {
        const userAttempts = recentAttempts?.filter((a: any) => a.user_id === lock.user_id) || [];
        const latestAttempt = userAttempts[0];
        
        return {
          ...lock,
          ip_address: latestAttempt?.ip_address || null,
          last_attempt_time: latestAttempt?.attempt_time || null,
        };
      }) || [];

      return lockedWithDetails;
    },
    // Always run query, RLS will handle permissions via security definer
  });

  const unlockAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.rpc('unlock_account_by_user_id', {
        _user_id: userId,
        _unlocked_by: user.id,
      });

      if (error) {
        console.error('Error unlocking account:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
      toast.success('Felhasználó sikeresen feloldva');
    },
    onError: (error: any) => {
      console.error('Error unlocking account:', error);
      toast.error('Hiba a felhasználó feloldása során');
    },
  });

  const isUserLocked = (userId: string): boolean => {
    return lockedAccounts.some((locked: any) => locked.user_id === userId);
  };

  const getLockedAccountDetails = (userId: string) => {
    return lockedAccounts.find((locked: any) => locked.user_id === userId);
  };

  return {
    lockedAccounts,
    isLoading,
    unlockAccount,
    isUserLocked,
    getLockedAccountDetails,
  };
};
