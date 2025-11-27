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

interface UserCreateFormProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function UserCreateForm({ onSubmit, onClose, isSubmitting }: UserCreateFormProps) {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      role: 'normal' as 'super_admin' | 'admin' | 'normal' | 'viewer',
      is_active: true,
      can_delete: false,
      can_view_logs: false,
    },
  });

  const role = watch('role');
  const isActive = watch('is_active');
  const canDelete = watch('can_delete');
  const canViewLogs = watch('can_view_logs');
  
  const canCreateSA = isSuperAdmin(profile);

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
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
        />
        {errors.email && (
          <p className="text-sm text-destructive">{String(errors.email.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">{t('users.fullName')}</Label>
        <Input
          id="full_name"
          {...register('full_name')}
          placeholder={t('users.fullNamePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Jelszó</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password', { 
              required: 'A jelszó megadása kötelező',
              minLength: {
                value: 6,
                message: 'A jelszónak legalább 6 karakter hosszúnak kell lennie'
              }
            })}
            placeholder="••••••••"
            className="pr-10"
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
          <p className="text-sm text-destructive">{String(errors.password.message)}</p>
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

        <div className="flex items-center justify-between">
          <Label htmlFor="can_delete" className="text-sm font-normal">{t('users.canDelete')}</Label>
          <Switch
            id="can_delete"
            checked={canDelete}
            onCheckedChange={(checked) => setValue('can_delete', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="can_view_logs" className="text-sm font-normal">{t('users.canViewLogs')}</Label>
          <Switch
            id="can_view_logs"
            checked={canViewLogs}
            onCheckedChange={(checked) => setValue('can_view_logs', checked)}
          />
        </div>
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
