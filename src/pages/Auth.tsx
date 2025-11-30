import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Building2 } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
import { TwoFactorDialog } from '@/components/auth/TwoFactorDialog';
import { useLoginAttempts } from '@/hooks/useLoginAttempts';
import { validatePasswordStrength } from '@/lib/passwordValidation';
import { useQueryClient } from '@tanstack/react-query';
import { use2FA } from '@/hooks/use2FA';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { logLoginAttempt, checkFailedAttempts } = useLoginAttempts();
  const { check2FARequired } = use2FA();
  const queryClient = useQueryClient();
  
  const authSchema = z.object({
    email: z.string().email({ message: t('auth.invalidEmail') }),
    password: z.string().min(8, { message: t('auth.passwordMinLength') }),
    fullName: z.string().min(2, { message: t('auth.fullNameMinLength') }).optional(),
  });

  // Redirect if already logged in (but not if 2FA verification is pending or during active auth flow)
  useEffect(() => {
    if (user && !show2FADialog && !isAuthenticating) {
      navigate('/');
    }
  }, [user, navigate, show2FADialog, isAuthenticating]);

  const handle2FASuccess = async () => {
    console.log('2FA verification successful, completing login...');
    setShow2FADialog(false);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession || !currentSession.user) {
        toast({
          title: t('auth.error'),
          description: t('auth.notAuthenticated'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const currentUser = currentSession.user;

      // Step 4: Removed direct DB write to session_2fa_verifications
      // The verify-2fa-token edge function now handles this using service role

      // Log successful attempt
      await logLoginAttempt({ 
        email: pendingEmail, 
        success: true, 
        userId: currentUser.id 
      });

      // Clean up expired locks
      const { error: cleanupError } = await supabase.rpc('cleanup_expired_locks');
      if (cleanupError) {
        console.error('Error cleaning up expired locks:', cleanupError);
      } else {
        queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
      }

      // Check if user must change password
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', currentUser.id)
        .single();

      if (profile?.must_change_password) {
        navigate('/change-password');
      } else {
        toast({
          title: t('auth.success'),
          description: t('auth.loggedInSuccess'),
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error after 2FA verification:', error);
      toast({
        title: t('auth.error'),
        description: t('auth.loginFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handle2FACancel = () => {
    setShow2FADialog(false);
    setPendingEmail('');
    // Sign out the user since 2FA was cancelled
    supabase.auth.signOut();
  };

  /**
   * Account Lock Flow:
   * 1. Check if email is already locked (BEFORE attempting sign-in)
   * 2. If locked: show error and stop
   * 3. Attempt sign-in with Supabase Auth
   * 4. If sign-in fails:
   *    a. Log the failed attempt in login_attempts table
   *    b. Count recent failed attempts (last 15 minutes)
   *    c. If >= 5 attempts: lock the account via lock_account_for_email RPC
   * 5. If sign-in succeeds: log successful attempt and proceed
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsAuthenticating(true);

    try {
      const validated = authSchema.parse({ email, password });
      
      // FIRST: Clean up any expired locks before checking status
      const { error: preCleanupError } = await supabase.rpc('cleanup_expired_locks');
      if (preCleanupError) {
        console.error('Error cleaning up expired locks before lock check:', preCleanupError);
      } else {
        // If anything was cleaned up, refresh locked accounts query so admin UI updates
        queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
      }

      // Then: Check if account is already locked (before attempting sign-in)
      const { data: isLocked, error: lockCheckError } = await supabase.rpc('is_account_locked_by_email', {
        _email: validated.email
      });
      
      if (lockCheckError) {
        console.error('Error checking lock status:', lockCheckError);
      }
      
      if (isLocked) {
        console.log(`Account locked for email: ${validated.email}`);
        toast({
          title: t('auth.accountLocked'),
          description: t('auth.accountLockedDescription'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Load lock settings via security definer function (bypasses RLS issues)
      const { data: lockSettings, error: lockSettingsError } = await supabase
        .rpc('get_account_lock_settings');

      if (lockSettingsError) {
        console.error('Error loading account lock settings, using defaults:', lockSettingsError);
      }

      const maxAttempts = lockSettings?.[0]?.max_attempts ?? 5;
      const autoUnlockMinutes = lockSettings?.[0]?.auto_unlock_minutes ?? 30;

      console.log(`Max login attempts allowed: ${maxAttempts}, auto-unlock: ${autoUnlockMinutes} minutes`);

      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        console.log('Sign-in failed, logging attempt...');
        // Log failed attempt (works even for non-existent users)
        await logLoginAttempt({ email: validated.email, success: false });
        
        // Check how many failed attempts exist
        const failedAttempts = await checkFailedAttempts(validated.email);
        console.log(`Failed attempts for ${validated.email}: ${failedAttempts}/${maxAttempts}`);
        
        // If we've reached the threshold, lock the account
        if (failedAttempts >= maxAttempts) {
          console.log(`🔒 LOCKING ACCOUNT: ${validated.email} (${failedAttempts}/${maxAttempts} attempts)`);
          const { data: lockResult, error: lockError } = await supabase.rpc('lock_account_for_email', {
            _email: validated.email,
            _minutes: autoUnlockMinutes,
            _reason: 'Too many failed login attempts',
          });
          
          if (lockError) {
            console.error('❌ Error locking account:', lockError);
          } else {
            console.log('✅ Account locked successfully');
            // Invalidate locked accounts query to update UI
            queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
          }

          toast({
            title: t('auth.accountLocked'),
            description: t('auth.accountLockedDescription'),
            variant: 'destructive',
          });
        } else if (error.message.includes('Invalid login credentials')) {
          const remaining = Math.max(maxAttempts - failedAttempts, 0);
          toast({
            title: t('auth.loginFailed'),
            description: `${t('auth.invalidCredentials')} (${remaining} ${t('auth.attemptsRemaining')})`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('auth.error'),
            description: error.message,
            variant: 'destructive',
          });
        }
      } else if (data?.user) {
        console.log('Sign-in successful, checking 2FA requirement...');
        
        // Check if user has 2FA enabled
        const requires2FA = await check2FARequired(validated.email);
        console.log('2FA check result:', requires2FA);
        
        if (requires2FA) {
          console.log('2FA required, showing 2FA dialog, current state:', { show2FADialog, pendingEmail });
          // Store email for 2FA verification
          setPendingEmail(validated.email);
          setShow2FADialog(true);
          // Don't set loading false here - let the dialog handle the loading state
          return;
        }
        
        // No 2FA required, log successful attempt and proceed
        await logLoginAttempt({ 
          email: validated.email, 
          success: true, 
          userId: data.user.id 
        });

        // After successful login, delete any existing lock records (expired or manually unlocked)
        const { error: cleanupError } = await supabase.rpc('cleanup_expired_locks');
        
        if (cleanupError) {
          console.error('Error cleaning up expired locks after successful login:', cleanupError);
        } else {
          console.log('Expired/unlocked lock records cleaned up after successful login.');
          queryClient.invalidateQueries({ queryKey: ['locked-accounts'] });
        }
        
        // Check if user must change password
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', data.user.id)
          .single();
        
        if (profile?.must_change_password) {
          toast({
            title: t('auth.passwordChangeRequired'),
            description: t('auth.passwordChangeRequiredMessage'),
            variant: 'default',
          });
          navigate('/change-password');
        } else {
          toast({
            title: t('auth.success'),
            description: t('auth.loggedInSuccess'),
          });
          navigate('/');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setIsAuthenticating(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = authSchema.parse({ email, password, fullName });
      
      // Validate password strength
      const passwordValidation = validatePasswordStrength(validated.password, t);
      if (!passwordValidation.valid) {
        toast({
          title: t('auth.validationError'),
          description: passwordValidation.message || t('auth.weakPassword'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validated.fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: t('auth.accountExists'),
            description: t('auth.emailAlreadyRegistered'),
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('auth.error'),
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: t('auth.success'),
          description: t('auth.accountCreated'),
        });
        navigate('/');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="outline" />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('app.name')}</CardTitle>
          <CardDescription>
            {t('app.tagline')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('auth.email')}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <ForgotPasswordDialog />
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.creatingAccount') : t('auth.signUp')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 2FA Dialog */}
      <TwoFactorDialog
        open={show2FADialog}
        email={pendingEmail}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    </div>
  );
};

export default Auth;
