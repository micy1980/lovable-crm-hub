import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Eye, EyeOff, Send } from 'lucide-react';
import { validatePasswordWithRoles } from '@/lib/passwordValidation';
import { useToast } from '@/hooks/use-toast';

interface UserCreateFormProps {
  onSubmit: (data: any, sendInvite?: boolean) => void;
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const sendInviteRef = useRef(false);
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
  const isSA = isSuperAdmin(profile);
  const currentUserRole = profile?.role || 'normal';

  // Checkbox is disabled if password is empty
  const isCheckboxEnabled = password && password.trim() !== '';

  // Check if required fields for invite are filled (password NOT required for invite flow)
  const isInviteEnabled = email?.trim() && familyName?.trim() && givenName?.trim() && 
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

  const handleFormSubmit = async (data: any) => {
    const sendInvite = sendInviteRef.current;
    sendInviteRef.current = false; // Reset after reading
    
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

    // Validate password only if NOT sending invite (password not required for invite flow)
    if (!sendInvite) {
      if (!data.password || data.password.trim() === '') {
        setPasswordError(t('users.passwordRequired'));
        setPasswordTouched(true);
        hasError = true;
      }
    }

    if (hasError) {
      return;
    }
    
    // Validate password with role-based rules (only if password provided)
    if (data.password && data.password.trim() !== '') {
      const validation = validatePasswordWithRoles(data.password, {
        currentUserRole,
        targetUserRole: data.role,
        t,
      });
      
      if (!validation.valid) {
        setPasswordError(validation.message);
        setPasswordTouched(true);
        return;
      }
    }
    
    setPasswordError(null);
    setEmailError(null);
    
    try {
      await onSubmit({
        ...data,
        mustChangePassword,
      }, sendInvite);
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

  const handleSendInvite = () => {
    sendInviteRef.current = true;
    handleSubmit(handleFormSubmit)();
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
              
              // Clear error when field becomes empty
              if (newPassword.trim() === '') {
                setPasswordError(null);
                // Uncheck and disable checkbox when password is cleared
                setMustChangePassword(false);
              } else {
                // Validate with role-based rules
                const validation = validatePasswordWithRoles(newPassword, {
                  currentUserRole,
                  targetUserRole: role,
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
                  targetUserRole: role,
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
        {passwordTouched && passwordError && (
          <p className="text-sm text-destructive">
            {passwordError}
          </p>
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
        {isSA && (
          <Button 
            type="button" 
            variant="secondary"
            disabled={isSubmitting || !isInviteEnabled}
            onClick={handleSendInvite}
          >
            <Send className="h-4 w-4 mr-2" />
            {t('users.sendRegistrationCode')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {t('users.createUser')}
        </Button>
      </div>
    </form>
  );
}
