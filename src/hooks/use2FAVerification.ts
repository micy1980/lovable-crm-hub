import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TwoFAVerificationState {
  is2FAEnabled: boolean;
  is2FAVerified: boolean;
  isLoading: boolean;
  needsVerification: boolean;
}

/**
 * Hook to check and manage 2FA verification status for the current session.
 * This is used for frontend route guards to redirect users to 2FA verification
 * when required.
 */
export function use2FAVerification() {
  const { user, session } = useAuth();
  const [state, setState] = useState<TwoFAVerificationState>({
    is2FAEnabled: false,
    is2FAVerified: false,
    isLoading: true,
    needsVerification: false,
  });

  const checkVerificationStatus = useCallback(async () => {
    if (!user || !session) {
      setState({
        is2FAEnabled: false,
        is2FAVerified: false,
        isLoading: false,
        needsVerification: false,
      });
      return;
    }

    try {
      // First check if user has 2FA enabled
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile for 2FA check:', profileError);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const is2FAEnabled = profile?.two_factor_enabled === true;

      if (!is2FAEnabled) {
        // 2FA not enabled, no verification needed
        setState({
          is2FAEnabled: false,
          is2FAVerified: true, // Consider verified if 2FA is not enabled
          isLoading: false,
          needsVerification: false,
        });
        return;
      }

      // 2FA is enabled, check if current session is verified
      // Get session ID from JWT
      const sessionId = session.access_token ? 
        JSON.parse(atob(session.access_token.split('.')[1]))?.session_id : null;

      if (!sessionId) {
        setState({
          is2FAEnabled: true,
          is2FAVerified: false,
          isLoading: false,
          needsVerification: true,
        });
        return;
      }

      // Check session_2fa_verifications table
      const { data: verification, error: verificationError } = await supabase
        .from('session_2fa_verifications')
        .select('id, expires_at')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (verificationError && verificationError.code !== 'PGRST116') {
        console.error('Error checking 2FA verification:', verificationError);
      }

      const is2FAVerified = !!verification;

      setState({
        is2FAEnabled: true,
        is2FAVerified,
        isLoading: false,
        needsVerification: !is2FAVerified,
      });
    } catch (error) {
      console.error('Error in 2FA verification check:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, session]);

  useEffect(() => {
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  return {
    ...state,
    refetch: checkVerificationStatus,
  };
}
