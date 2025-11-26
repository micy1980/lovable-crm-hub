import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUsers } from '@/hooks/useUsers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslation } from 'react-i18next';
import { isSuperAdmin } from '@/lib/roleUtils';

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
  const fullName = watch('full_name');

  const canEditRole = isSuperAdmin(profile);
  const canEditPermissions = isSuperAdmin(profile);

  const onSubmit = (data: any) => {
    const updateData: any = {
      id: user.id,
      full_name: data.full_name,
      is_active: data.is_active,
    };

    if (canEditRole) {
      updateData.role = data.role;
    }

    if (canEditPermissions) {
      updateData.can_delete = data.can_delete;
      updateData.can_view_logs = data.can_view_logs;
    }

    updateUser.mutate(updateData, {
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
        <Label htmlFor="role">{t('users.role')}</Label>
        <Select
          value={role}
          onValueChange={(value) => setValue('role', value)}
          disabled={!canEditRole}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">SA</SelectItem>
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
          disabled={!canEditPermissions}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="can_view_logs">{t('users.canViewLogs')}</Label>
        <Switch
          id="can_view_logs"
          checked={canViewLogs}
          onCheckedChange={(checked) => setValue('can_view_logs', checked)}
          disabled={!canEditPermissions}
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
