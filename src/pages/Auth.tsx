import { useState } from 'react';
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
import { useLoginAttempts } from '@/hooks/useLoginAttempts';
import { useAccountLock } from '@/hooks/useAccountLock';
import { validatePasswordStrength } from '@/lib/passwordValidation';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { logLoginAttempt, checkFailedAttempts, lockAccount } = useLoginAttempts();
  const { checkAccountLock } = useAccountLock();
  
  const authSchema = z.object({
    email: z.string().email({ message: t('auth.invalidEmail') }),
    password: z.string().min(8, { message: t('auth.passwordMinLength') }),
    fullName: z.string().min(2, { message: t('auth.fullNameMinLength') }).optional(),
  });

  // Redirect if already logged in
  if (user) {
    navigate('/');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = authSchema.parse({ email, password });
      
      // Check failed attempts before login
      const failedAttempts = await checkFailedAttempts(validated.email);
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'account_lock_attempts')
        .single();
      
      const maxAttempts = settings?.setting_value ? parseInt(settings.setting_value) : 5;

      if (failedAttempts >= maxAttempts) {
        toast({
          title: t('auth.accountLocked'),
          description: t('auth.accountLockedDescription'),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        // Log failed attempt
        await logLoginAttempt({ email: validated.email, success: false });
        
        // Check if we need to lock the account
        const newFailedAttempts = await checkFailedAttempts(validated.email);
        
        if (newFailedAttempts >= maxAttempts - 1 && data?.user?.id) {
          // Lock the account
          await lockAccount(data.user.id, 'Too many failed login attempts');
          toast({
            title: t('auth.accountLocked'),
            description: t('auth.accountLockedDescription'),
            variant: 'destructive',
          });
        } else if (error.message.includes('Invalid login credentials')) {
          const remaining = maxAttempts - newFailedAttempts - 1;
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
        // Check if account is locked
        const isLocked = await checkAccountLock(data.user.id);
        
        if (isLocked) {
          await supabase.auth.signOut();
          toast({
            title: t('auth.accountLocked'),
            description: t('auth.accountLockedDescription'),
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Log successful attempt
        await logLoginAttempt({ email: validated.email, success: true, userId: data.user.id });
        
        toast({
          title: t('auth.success'),
          description: t('auth.loggedInSuccess'),
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
    </div>
  );
};

export default Auth;
