import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Eye, EyeOff } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/passwordValidation';
import { useToast } from '@/hooks/use-toast';

interface UserCreateFormProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function UserCreateForm({ onSubmit, onClose, isSubmitting }: UserCreateFormProps) {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [familyNameTouched, setFamilyNameTouched] = useState(false);
  const [givenNameTouched, setGivenNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      family_name: '',
      given_name: '',
      role: 'normal' as 'super_admin' | 'admin' | 'normal' | 'viewer',
      is_active: true,
    },
  });

  const role = watch('role');
  const isActive = watch('is_active');
  const password = watch('password');
  const email = watch('email');
  const familyName = watch('family_name');
  const givenName = watch('given_name');
  
  const canCreateSA = isSuperAdmin(profile);

  const handleFormSubmit = async (data: any) => {
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

    // Validate password is not empty (required on create)
    if (!data.password || data.password.trim() === '') {
      setPasswordError(t('users.passwordRequired'));
      setPasswordTouched(true);
      hasError = true;
    }

    if (hasError) {
      return;
    }
    
    // Super Admin can set any password (no validation, min length 1)
    const isSA = isSuperAdmin(profile);
    if (!isSA) {
      // Validate password strength for non-SA users
      const validation = validatePasswordStrength(data.password, t);
      if (!validation.valid) {
        setPasswordError(validation.message);
        setPasswordTouched(true);
        return;
      }
    }
    // For SA: no minimum length, no character requirements
    
    setPasswordError(null);
    setEmailError(null);
    
    try {
      await onSubmit(data);
    } catch (error: any) {
      // Check if this is a duplicate email error
      if (error?.errorCode === 'EMAIL_ALREADY_REGISTERED') {
        setEmailError(t('users.emailAlreadyExists'));
        return;
      }
      // Check if this is a weak password error from the backend
      if (error?.isWeakPassword) {
        setPasswordError(t('auth.weakPasswordMessage'));
        return;
      }
      // Re-throw other errors to be handled by the caller
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
        <Label htmlFor="family_name">{t('users.familyName')}</Label>
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
        <Label htmlFor="given_name">{t('users.givenName')}</Label>
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
        <Label htmlFor="password">{t('users.password')} *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder=""
            className={passwordError && passwordTouched ? 'pr-10 border-destructive' : 'pr-10'}
            onChange={(e) => {
              const newPassword = e.target.value;
              setValue('password', newPassword);
              setPasswordTouched(true);
              
              const isSA = isSuperAdmin(profile);
              
              // Clear error when field becomes empty
              if (newPassword.trim() === '') {
                setPasswordError(null);
              } else if (!isSA) {
                // Only validate for non-Super Admin users
                const validation = validatePasswordStrength(newPassword, t);
                if (!validation.valid) {
                  setPasswordError(validation.message);
                } else {
                  setPasswordError(null);
                }
              } else {
                // Super Admin can set any password
                setPasswordError(null);
              }
            }}
            onBlur={(e) => {
              const currentPassword = e.target.value;
              setPasswordTouched(true);
              
              const isSA = isSuperAdmin(profile);
              
              // Only validate on blur for non-Super Admin users
              if (currentPassword.trim() !== '' && !isSA) {
                const validation = validatePasswordStrength(currentPassword, t);
                if (!validation.valid) {
                  setPasswordError(validation.message);
                } else {
                  setPasswordError(null);
                }
              } else if (isSA) {
                // Super Admin can set any password
                setPasswordError(null);
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
        {passwordTouched && passwordError && (
          <p className="text-sm text-destructive">
            {passwordError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">{t('users.role')}</Label>
        <Select
          value={role}
          onValueChange={(value) => setValue('role', value as 'super_admin' | 'admin' | 'normal' | 'viewer')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {canCreateSA && <SelectItem value="super_admin">SA</SelectItem>}
            <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
            <SelectItem value="normal">{t('users.roles.normal')}</SelectItem>
            <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>{t('users.initialPermissions')}</Label>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="is_active" className="text-sm font-normal">{t('users.isActive')}</Label>
          <Switch
            id="is_active"
            checked={isActive}
            onCheckedChange={(checked) => setValue('is_active', checked)}
          />
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          {t('users.companyPermissionsNote')}
        </p>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {t('users.createUser')}
        </Button>
      </div>
    </form>
  );
}
