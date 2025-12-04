import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Send } from 'lucide-react';

interface UserCreateFormProps {
  onSubmit: (data: any, sendInvite?: boolean) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function UserCreateForm({ onSubmit, onClose, isSubmitting }: UserCreateFormProps) {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const [emailError, setEmailError] = useState<string | null>(null);
  const [familyNameTouched, setFamilyNameTouched] = useState(false);
  const [givenNameTouched, setGivenNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const sendInviteRef = useRef(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      family_name: '',
      given_name: '',
      role: 'normal' as 'super_admin' | 'admin' | 'normal' | 'viewer',
      is_active: true,
    },
  });

  const role = watch('role');
  const isActive = watch('is_active');
  const email = watch('email');
  const familyName = watch('family_name');
  const givenName = watch('given_name');
  
  const canCreateSA = isSuperAdmin(profile);

  // Check if required fields for invite are filled
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

    if (hasError) {
      return;
    }
    
    setEmailError(null);
    
    try {
      await onSubmit(data, sendInvite);
    } catch (error: any) {
      // Check if this is a duplicate email error
      if (error?.errorCode === 'EMAIL_ALREADY_REGISTERED') {
        setEmailError(t('users.emailAlreadyExists'));
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
        <Label htmlFor="email">{t('users.email')} *</Label>
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
        <Label htmlFor="family_name">{t('users.familyName')} *</Label>
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
        <Label htmlFor="given_name">{t('users.givenName')} *</Label>
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
        <Button 
          type="button" 
          disabled={isSubmitting || !isInviteEnabled}
          onClick={handleSendInvite}
        >
          <Send className="h-4 w-4 mr-2" />
          {t('users.sendRegistrationCode')}
        </Button>
      </div>
    </form>
  );
}
