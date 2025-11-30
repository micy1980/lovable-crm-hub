import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export const use2FA = () => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const generateSecret = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_2fa_secret');
      
      if (error) throw error;
      
      return data as string;
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      toast.error(t('2fa.errorGeneratingSecret'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async (userId: string, secret: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('enable_2fa', {
        _user_id: userId,
        _secret: secret,
      });
      
      if (error) throw error;
      
      toast.success(t('2fa.enabledSuccess'));
      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast.error(t('2fa.errorEnabling'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('disable_2fa', {
        _user_id: userId,
      });
      
      if (error) throw error;
      
      toast.success(t('2fa.disabledSuccess'));
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error(t('2fa.errorDisabling'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verify2FAToken = async (email: string, token: string, isRecoveryCode = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use correct field based on whether it's a recovery code or TOTP token
      const body = isRecoveryCode 
        ? { recoveryCode: token }
        : { token };
      
      const response = await supabase.functions.invoke('verify-2fa-token', {
        body,
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (response.error) {
        console.error('2FA verification error:', response.error);
        toast.error(t('2fa.verificationFailed'));
        return false;
      }

      if (response.data?.valid === true) {
        return true;
      } else {
        const errorKey = response.data?.error;
        if (errorKey === 'invalid_code') {
          toast.error(t('2fa.invalidCode'));
        } else if (errorKey === 'two_factor_locked') {
          toast.error(t('2fa.tooManyAttempts'));
        } else {
          toast.error(t('2fa.verificationFailed'));
        }
        return false;
      }
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      toast.error(t('2fa.verificationFailed'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const generateRecoveryCodes = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error(t('2fa.notAuthenticated'));
        return null;
      }

      const response = await supabase.functions.invoke('generate-recovery-codes', {
        body: { count: 8 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        console.error('Recovery codes generation error:', response.error);
        toast.error(t('2fa.errorGeneratingRecoveryCodes'));
        return null;
      }

      return response.data?.codes as string[];
    } catch (error) {
      console.error('Error generating recovery codes:', error);
      toast.error(t('2fa.errorGeneratingRecoveryCodes'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const get2FAStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_2fa_status', {
        _user_id: userId,
      });
      
      if (error) throw error;
      
      return data?.[0] || { two_factor_enabled: false, has_recovery_codes: false };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      return { two_factor_enabled: false, has_recovery_codes: false };
    }
  };

  const check2FARequired = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('user_has_2fa_enabled', {
        _email: email,
      });
      
      if (error) throw error;
      
      return data === true;
    } catch (error) {
      console.error('Error checking 2FA requirement:', error);
      return false;
    }
  };

  return {
    loading,
    generateSecret,
    enable2FA,
    disable2FA,
    verify2FAToken,
    generateRecoveryCodes,
    get2FAStatus,
    check2FARequired,
  };
};
