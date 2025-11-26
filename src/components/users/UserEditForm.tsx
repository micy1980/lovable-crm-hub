import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsers } from '@/hooks/useUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslation } from 'react-i18next';
import { isSuperAdmin } from '@/lib/roleUtils';
import { format } from 'date-fns';

interface UserEditFormProps {
  user: any;
  onClose: () => void;
}

export function UserEditForm({ user, onClose }: UserEditFormProps) {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { updateUser } = useUsers();
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
    },
  });

  const fullName = watch('full_name');

  const onSubmit = (data: any) => {
    updateUser.mutate({
      id: user.id,
      full_name: data.full_name,
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
