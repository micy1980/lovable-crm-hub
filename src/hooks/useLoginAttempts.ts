import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
    // Get time window from system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'account_lock_failed_attempts_window_minutes')
      .maybeSingle();
    
    const timeWindowMinutes = settings?.setting_value ? parseInt(settings.setting_value) : 5;

    const { data, error } = await supabase
      .rpc('count_recent_failed_attempts', { 
        _email: email, 
        _minutes: timeWindowMinutes
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
      .maybeSingle();

    const autoUnlockMinutes = settings?.setting_value ? parseInt(settings.setting_value) : 30;

    // Get user profile to get email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.email) return;

    // First, lock the account
    const { error } = await supabase
      .rpc('lock_account_for_email', {
        _email: profile.email,
        _minutes: autoUnlockMinutes,
        _reason: reason,
      });

    if (error && !error.message.includes('duplicate')) {
      console.error('Error locking account via RPC:', error);
      return;
    }

    // Then notify super admins
    try {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + autoUnlockMinutes);

      await supabase.functions.invoke('notify-account-lock', {
        body: {
          userId,
          email: profile.email,
          reason,
          lockedUntil: lockedUntil.toISOString(),
          ipAddress: '', // Will be filled from login_attempts table in edge function
        },
      });
    } catch (notifyError) {
      console.error('Error sending lock notification:', notifyError);
      // Don't fail the lock operation if notification fails
    }
  };

  return {
    logLoginAttempt,
    checkFailedAttempts,
    lockAccount,
  };
};
