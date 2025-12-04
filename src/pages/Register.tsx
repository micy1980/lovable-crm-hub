import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill from URL params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    
    if (emailParam) setEmail(emailParam);
    if (codeParam) setUserCode(codeParam);
  }, [searchParams]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t('register.errors.emailRequired');
    }
    if (!userCode.trim()) {
      newErrors.userCode = t('register.errors.codeRequired');
    }
    if (!familyName.trim()) {
      newErrors.familyName = t('register.errors.familyNameRequired');
    }
    if (!givenName.trim()) {
      newErrors.givenName = t('register.errors.givenNameRequired');
    }
    if (!password) {
      newErrors.password = t('register.errors.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('register.errors.passwordTooShort');
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('register.errors.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-registration', {
        body: {
          email: email.toLowerCase().trim(),
          userCode: userCode.toUpperCase().trim(),
          familyName: familyName.trim(),
          givenName: givenName.trim(),
          password,
        },
      });

      if (error) throw error;

      if (data?.error) {
        switch (data.error) {
          case 'already_registered':
            toast({
              title: t('register.errors.alreadyRegistered'),
              variant: 'destructive',
            });
            break;
          case 'invitation_expired':
            toast({
              title: t('register.errors.invitationExpired'),
              variant: 'destructive',
            });
            break;
          case 'invalid_code':
            setErrors({ userCode: t('register.errors.invalidCode') });
            break;
          case 'user_not_found':
            toast({
              title: t('register.errors.userNotFound'),
              variant: 'destructive',
            });
            break;
          case 'weak_password':
            setErrors({ password: t('register.errors.weakPassword') });
            break;
          default:
            toast({
              title: t('register.errors.generic'),
              description: data.message,
              variant: 'destructive',
            });
        }
        return;
      }

      toast({
        title: t('register.success'),
      });

      // Auto-login after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signInError) {
        // If auto-login fails, redirect to auth page
        navigate('/auth');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: t('register.errors.generic'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('register.emailDisabledHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userCode">{t('register.userCode')}</Label>
              <Input
                id="userCode"
                value={userCode}
                onChange={(e) => {
                  setUserCode(e.target.value.toUpperCase());
                  setErrors({ ...errors, userCode: '' });
                }}
                placeholder="XXXXXXXX"
                className={`font-mono uppercase ${errors.userCode ? 'border-destructive' : ''}`}
                maxLength={8}
              />
              {errors.userCode && (
                <p className="text-sm text-destructive">{errors.userCode}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="familyName">{t('register.familyName')}</Label>
                <Input
                  id="familyName"
                  value={familyName}
                  onChange={(e) => {
                    setFamilyName(e.target.value);
                    setErrors({ ...errors, familyName: '' });
                  }}
                  className={errors.familyName ? 'border-destructive' : ''}
                />
                {errors.familyName && (
                  <p className="text-sm text-destructive">{errors.familyName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="givenName">{t('register.givenName')}</Label>
                <Input
                  id="givenName"
                  value={givenName}
                  onChange={(e) => {
                    setGivenName(e.target.value);
                    setErrors({ ...errors, givenName: '' });
                  }}
                  className={errors.givenName ? 'border-destructive' : ''}
                />
                {errors.givenName && (
                  <p className="text-sm text-destructive">{errors.givenName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('register.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: '' });
                  }}
                  className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('register.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors({ ...errors, confirmPassword: '' });
                  }}
                  className={`pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('register.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('register.alreadyRegistered')}{' '}
              <a href="/auth" className="text-primary hover:underline">
                {t('register.loginLink')}
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
