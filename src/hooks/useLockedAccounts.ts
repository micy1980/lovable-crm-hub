import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserProfile } from './useUserProfile';
import { useEffect } from 'react';

export const useLockedAccounts = () => {
  const queryClient = useQueryClient();
  const { data: currentProfile } = useUserProfile();

  // Subscribe to realtime changes on locked_accounts table
  useEffect(() => {
    const channel = supabase
      .channel('locked-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locked_accounts'
        },
        (payload) => {
          console.log('[useLockedAccounts] Realtime change detected:', payload);
          // Invalidate queries to refetch the latest locked accounts
          queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: lockedAccounts = [], isLoading } = useQuery({
    queryKey: ['locked-accounts'],
    queryFn: async () => {
      // Always clean up expired or manually unlocked locks before listing
      const { error: cleanupError } = await supabase.rpc('cleanup_expired_locks');
      if (cleanupError) {
        console.error('[useLockedAccounts] Error cleaning up expired locks:', cleanupError);
      }

      // Use security definer function to bypass RLS issues
      const { data: lockedDetails, error: detailsError } = await supabase
        .rpc('get_locked_accounts_with_details');
 
      if (detailsError) {
        console.error('Error fetching locked account details:', detailsError);
        return [];
      }
 
      if (!lockedDetails || lockedDetails.length === 0) {
        return [];
      }

      const userIds = lockedDetails.map((lock: any) => lock.user_id);

      // Get recent login attempts for IP addresses
      const { data: recentAttempts } = await supabase
        .from('login_attempts')
        .select('user_id, ip_address, attempt_time')
        .in('user_id', userIds)
        .eq('success', false)
        .order('attempt_time', { ascending: false })
        .limit(100);

      const lockedWithDetails = lockedDetails.map((lock: any) => {
        const userAttempts = recentAttempts?.filter((a: any) => a.user_id === lock.user_id) || [];
        const latestAttempt = userAttempts[0];

        return {
          ...lock,
          ip_address: latestAttempt?.ip_address || null,
          last_attempt_time: latestAttempt?.attempt_time || null,
        };
      });

      console.log('[useLockedAccounts] Locked accounts fetched:', lockedWithDetails);
      return lockedWithDetails;
    },
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
