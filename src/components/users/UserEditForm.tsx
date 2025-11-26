import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUsers } from '@/hooks/useUsers';
import { useTranslation } from 'react-i18next';

interface UserEditFormProps {
  user: any;
  onClose: () => void;
}

export function UserEditForm({ user, onClose }: UserEditFormProps) {
  const { t } = useTranslation();
  const { updateUser } = useUsers();
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      role: user?.role || 'normal',
      is_active: user?.is_active ?? true,
      can_delete: user?.can_delete ?? false,
      can_view_logs: user?.can_view_logs ?? false,
    },
  });

  const role = watch('role');
  const isActive = watch('is_active');
  const canDelete = watch('can_delete');
  const canViewLogs = watch('can_view_logs');

  const onSubmit = (data: any) => {
    updateUser.mutate(
      { id: user.id, ...data },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>{t('users.email')}</Label>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">{t('users.role')}</Label>
        <Select value={role} onValueChange={(value) => setValue('role', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">{t('users.roles.superAdmin')}</SelectItem>
            <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
            <SelectItem value="normal">{t('users.roles.normal')}</SelectItem>
            <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="is_active">{t('users.active')}</Label>
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setValue('is_active', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="can_delete">{t('users.canDelete')}</Label>
        <Switch
          id="can_delete"
          checked={canDelete}
          onCheckedChange={(checked) => setValue('can_delete', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="can_view_logs">{t('users.canViewLogs')}</Label>
        <Switch
          id="can_view_logs"
          checked={canViewLogs}
          onCheckedChange={(checked) => setValue('can_view_logs', checked)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={updateUser.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
