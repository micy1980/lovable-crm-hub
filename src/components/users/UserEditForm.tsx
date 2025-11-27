import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsers } from '@/hooks/useUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslation } from 'react-i18next';
import { isSuperAdmin } from '@/lib/roleUtils';
import { format } from 'date-fns';
import { Eye, EyeOff } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/passwordValidation';
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
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      password: '',
    },
  });

  const fullName = watch('full_name');
  const password = watch('password');

  const onSubmit = (data: any) => {
    // Only validate password strength if password is provided
    if (data.password && data.password.trim() !== '') {
      const validation = validatePasswordStrength(data.password, t);
      if (!validation.valid) {
        setPasswordError(validation.message);
        toast({
          title: t('auth.weakPassword'),
          description: validation.message || '',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setPasswordError(null);
    updateUser.mutate({
      id: user.id,
      full_name: data.full_name,
      password: data.password && data.password.trim() !== '' ? data.password : undefined,
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>{t('users.email')}</Label>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">{t('users.fullName')}</Label>
        <Input
          id="full_name"
          {...register('full_name')}
          value={fullName}
          onChange={(e) => setValue('full_name', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Jelszó</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder=""
            className={passwordError && password && password.trim() !== '' ? 'pr-10 border-destructive' : 'pr-10'}
            onChange={(e) => {
              setValue('password', e.target.value);
              // Clear error when field becomes empty
              if (e.target.value.trim() === '') {
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
        {passwordError && password && password.trim() !== '' && (
          <p className="text-sm text-destructive">{passwordError}</p>
        )}
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
              Created: {format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss')}
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
