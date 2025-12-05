import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePasswordStrength } from '@/lib/passwordValidation';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';

export const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Validate password strength on change
  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    
    if (value) {
      const validation = validatePasswordStrength(value, t);
      if (!validation.valid) {
        setPasswordError(validation.message || t('auth.weakPassword'));
      } else {
        setPasswordError(null);
      }
    } else {
      setPasswordError(null);
    }
  };

  // Validate password match on confirm change
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    
    if (value && newPassword && value !== newPassword) {
      setConfirmPasswordError(t('auth.passwordsDoNotMatch'));
    } else {
      setConfirmPasswordError(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Clear any existing inline errors
    setPasswordError(null);
    setConfirmPasswordError(null);

    try {
      if (!user) {
        toast({
          title: t('auth.error'),
          description: t('auth.notAuthenticated'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        const msg = t('auth.passwordsDoNotMatch');
        setConfirmPasswordError(msg);
        toast({
          title: t('auth.validationError'),
          description: msg,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // ALWAYS validate password strength for forced password change
      const passwordValidation = validatePasswordStrength(newPassword, t);
      if (!passwordValidation.valid) {
        const msg = passwordValidation.message || t('auth.weakPassword');
        setPasswordError(msg);
        toast({
          title: t('auth.validationError'),
          description: msg,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        const errorMsg = updateError.message || '';
        const isWeakPassword = 
          errorMsg.toLowerCase().includes('password is known to be weak') ||
          errorMsg.toLowerCase().includes('easy to guess');
        
        if (isWeakPassword) {
          // Treat as validation error - show inline
          setPasswordError(t('auth.weakPassword'));
          toast({
            title: t('auth.validationError'),
            description: t('auth.weakPassword'),
            variant: 'destructive',
          });
        } else {
          // Other update errors
          toast({
            title: t('auth.error'),
            description: errorMsg,
            variant: 'destructive',
          });
        }
        setLoading(false);
        return;
      }

      // Update password_changed_at timestamp and clear must_change_password flag
      const { error: updateError2 } = await supabase.rpc('update_password_changed_at', {
        _user_id: user.id
      });

      if (updateError2) {
        console.error('Error updating password_changed_at:', updateError2);
        // Don't show error to user, just log it
      }

      // Invalidate all 2FA session verifications after password change
      // This forces users with 2FA enabled to re-verify on next access
      try {
        await supabase.rpc('invalidate_own_2fa_verifications');
      } catch (rpcError) {
        console.error('Error invalidating 2FA verifications:', rpcError);
        // Don't block password change flow, but log the error
      }

      toast({
        title: t('auth.success'),
        description: t('auth.passwordChangedSuccess'),
      });

      // Force full page reload to ensure fresh profile data is loaded
      // This prevents the MainLayout useEffect from redirecting back with stale data
      window.location.href = '/';
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: t('auth.error'),
        description: t('auth.passwordChangeError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <LanguageSelector variant="outline" />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('auth.changePasswordRequired')}</CardTitle>
          <CardDescription>
            {t('auth.changePasswordRequiredDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={passwordError ? 'border-destructive' : ''}
                required
              />
              {passwordError && (
                <p className="text-sm text-destructive mt-1">
                  {passwordError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className={confirmPasswordError ? 'border-destructive' : ''}
                required
              />
              {confirmPasswordError && (
                <p className="text-sm text-destructive mt-1">
                  {confirmPasswordError}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.changingPassword') : t('auth.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
