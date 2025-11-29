import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers } from '@/hooks/useUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslation } from 'react-i18next';
import { isSuperAdmin } from '@/lib/roleUtils';
import { format } from 'date-fns';
import { Eye, EyeOff } from 'lucide-react';
import { validatePasswordWithRoles } from '@/lib/passwordValidation';
import { useToast } from '@/hooks/use-toast';

interface UserEditFormProps {
  user: any;
  onClose: () => void;
}

export function UserEditForm({ user, onClose }: UserEditFormProps) {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { updateUser } = useUsers();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [familyNameTouched, setFamilyNameTouched] = useState(false);
  const [givenNameTouched, setGivenNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: user?.email || '',
      family_name: user?.family_name || '',
      given_name: user?.given_name || '',
      password: '',
    },
  });

  const email = watch('email');
  const familyName = watch('family_name');
  const givenName = watch('given_name');
  const password = watch('password');
  
  const currentUserRole = profile?.role || 'normal';
  const targetUserRole = user?.role || 'normal';

  // Checkbox is disabled if password is empty
  const isCheckboxEnabled = password && password.trim() !== '';

  const onSubmit = async (data: any) => {
    let hasError = false;

    // Validate email is not empty
    if (!data.email || data.email.trim() === '') {
      setEmailError(t('users.emailRequired'));
      setEmailTouched(true);
      hasError = true;
    }

    // Validate family name is not empty
    if (!data.family_name || data.family_name.trim() === '') {
      setFamilyNameTouched(true);
      hasError = true;
    }

    // Validate given name is not empty
    if (!data.given_name || data.given_name.trim() === '') {
      setGivenNameTouched(true);
      hasError = true;
    }

    if (hasError) {
      return;
    }

    // Validate password if provided
    if (data.password && data.password.trim() !== '') {
      const validation = validatePasswordWithRoles(data.password, {
        currentUserRole,
        targetUserRole,
        t,
      });
      
      if (!validation.valid) {
        setPasswordError(validation.message);
        return;
      }
    }
    
    setPasswordError(null);
    setEmailError(null);
    
    try {
      console.log('[UserEditForm] Submitting update...');
      await updateUser.mutateAsync({
        id: user.id,
        email: data.email !== user.email ? data.email : undefined,
        family_name: data.family_name,
        given_name: data.given_name,
        password: data.password && data.password.trim() !== '' ? data.password : undefined,
        mustChangePassword: data.password && data.password.trim() !== '' ? mustChangePassword : undefined,
      });
      
      console.log('[UserEditForm] Update successful');
      
      // Show success toast for password update
      if (data.password && data.password.trim() !== '') {
        toast({
          title: t('users.messages.passwordUpdated'),
        });
      }
      
      onClose();
    } catch (error: any) {
      console.log('[UserEditForm] Caught error:', error, 'isWeakPassword:', error?.isWeakPassword);
      
      // Check if this is a duplicate email error
      if (error?.errorCode === 'EMAIL_ALREADY_REGISTERED') {
        console.log('[UserEditForm] Duplicate email error');
        setEmailError(t('users.emailAlreadyExists'));
        toast({
          title: t('common.errors.userUpdateFailed'),
          variant: 'destructive',
        });
        return;
      }
      
      // Check if this is a weak password error from the backend
      if (error?.isWeakPassword) {
        console.log('[UserEditForm] Weak password error - setting field error and showing toast');
        setPasswordError(t('users.errors.weakPassword'));
        toast({
          title: t('users.errors.weakPasswordToast'),
          variant: 'destructive',
        });
        return;
      }
      
      // Other errors
      console.log('[UserEditForm] Other error - showing generic toast');
      toast({
        title: t('common.errors.userUpdateFailed'),
        description: error?.message || 'Unknown error',
        variant: 'destructive',
      });
      
      // Don't throw - keep dialog open for user to fix
      return;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('users.email')}</Label>
        <Input
          id="email"
          type="email"
          {...register('email', { 
            required: t('users.emailRequired'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: t('users.emailInvalid')
            }
          })}
          placeholder="user@example.com"
          className={(emailError || (emailTouched && !email?.trim())) ? 'border-destructive' : ''}
          onChange={(e) => {
            setValue('email', e.target.value);
            setEmailTouched(true);
            // Clear email error when user starts editing
            if (emailError) {
              setEmailError(null);
            }
          }}
          onBlur={() => setEmailTouched(true)}
        />
        {(errors.email || emailError || (emailTouched && !email?.trim())) && (
          <p className="text-sm text-destructive">
            {emailError || (emailTouched && !email?.trim() ? t('users.emailRequired') : String(errors.email?.message))}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="family_name">Családi név</Label>
        <Input
          id="family_name"
          {...register('family_name', {
            required: t('users.familyNameRequired')
          })}
          className={(errors.family_name || (familyNameTouched && !familyName?.trim())) ? 'border-destructive' : ''}
          value={familyName}
          onChange={(e) => {
            setValue('family_name', e.target.value);
            setFamilyNameTouched(true);
          }}
          onBlur={() => setFamilyNameTouched(true)}
        />
        {(errors.family_name || (familyNameTouched && !familyName?.trim())) && (
          <p className="text-sm text-destructive">
            {t('users.familyNameRequired')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="given_name">Utónév</Label>
        <Input
          id="given_name"
          {...register('given_name', {
            required: t('users.givenNameRequired')
          })}
          className={(errors.given_name || (givenNameTouched && !givenName?.trim())) ? 'border-destructive' : ''}
          value={givenName}
          onChange={(e) => {
            setValue('given_name', e.target.value);
            setGivenNameTouched(true);
          }}
          onBlur={() => setGivenNameTouched(true)}
        />
        {(errors.given_name || (givenNameTouched && !givenName?.trim())) && (
          <p className="text-sm text-destructive">
            {t('users.givenNameRequired')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('users.password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder=""
            className={passwordError && password && password.trim() !== '' ? 'pr-10 border-destructive' : 'pr-10'}
            onChange={(e) => {
              const newPassword = e.target.value;
              setValue('password', newPassword);
              setPasswordTouched(true);
              
              // Clear error when field becomes empty
              if (newPassword.trim() === '') {
                setPasswordError(null);
                // Uncheck and disable checkbox when password is cleared
                setMustChangePassword(false);
              } else {
                // Validate with role-based rules
                const validation = validatePasswordWithRoles(newPassword, {
                  currentUserRole,
                  targetUserRole,
                  t,
                });
                if (!validation.valid) {
                  setPasswordError(validation.message);
                } else {
                  setPasswordError(null);
                }
              }
            }}
            onBlur={(e) => {
              const currentPassword = e.target.value;
              setPasswordTouched(true);
              
              if (currentPassword.trim() !== '') {
                const validation = validatePasswordWithRoles(currentPassword, {
                  currentUserRole,
                  targetUserRole,
                  t,
                });
                if (!validation.valid) {
                  setPasswordError(validation.message);
                } else {
                  setPasswordError(null);
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordTouched && passwordError && password && password.trim() !== '' && (
          <p className="text-sm text-destructive">{passwordError}</p>
        )}
        
        {/* Force Password Change Checkbox */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="mustChangePassword"
            checked={mustChangePassword}
            onCheckedChange={(checked) => setMustChangePassword(checked === true)}
            disabled={!isCheckboxEnabled}
          />
          <Label
            htmlFor="mustChangePassword"
            className={`text-sm font-normal cursor-pointer ${!isCheckboxEnabled ? 'text-muted-foreground' : ''}`}
          >
            {t('users.mustChangePasswordOnNextLogin.label')}
          </Label>
        </div>
      </div>

      {user?.user_code && (
        <div className="space-y-2">
          <Label>Felhasználói kód</Label>
          <Input
            value={user.user_code}
            disabled
            className="font-mono bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Ez a kód automatikusan generálódott és nem módosítható
          </p>
        </div>
      )}

      <div className="flex items-end justify-between gap-4 pt-4">
        {isSuperAdmin(profile) && user?.created_at && user?.id && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>
              Created: {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm')}
            </div>
            <div className="flex items-center gap-1">
              <span>userid:</span>
              <span className="font-mono">{user.id}</span>
            </div>
          </div>
        )}
        
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={updateUser.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
