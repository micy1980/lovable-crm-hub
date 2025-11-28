import { supabase } from '@/integrations/supabase/client';

export const useLoginAttempts = () => {
  const logLoginAttempt = async (params: {
    email: string;
    success: boolean;
    userId?: string;
  }) => {
    const { email, success, userId } = params;

    // Get client info
    const ipAddress = ''; // Cannot get real IP on client side
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('login_attempts')
      .insert({
        email,
        success,
        user_id: userId || null,
        ip_address: ipAddress || null,
        user_agent: userAgent,
      });

    if (error) {
      console.error('Error logging login attempt:', error);
    }
  };

  const checkFailedAttempts = async (email: string): Promise<number> => {
    const { data, error } = await supabase
      .rpc('count_recent_failed_attempts', { 
        _email: email, 
        _minutes: 30 
      });

    if (error) {
      console.error('Error checking failed attempts:', error);
      return 0;
    }

    return data || 0;
  };

  const lockAccount = async (userId: string, reason: string) => {
    // Get auto unlock setting
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'account_lock_auto_unlock_minutes')
      .single();

    const autoUnlockMinutes = settings?.setting_value ? parseInt(settings.setting_value) : 30;
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + autoUnlockMinutes);

    const { error } = await supabase
      .from('locked_accounts')
      .insert({
        user_id: userId,
        locked_by_system: true,
        locked_until: lockedUntil.toISOString(),
        reason,
      });

    if (error && !error.message.includes('duplicate')) {
      console.error('Error locking account:', error);
    }
  };

  return {
    logLoginAttempt,
    checkFailedAttempts,
    lockAccount,
  };
};
