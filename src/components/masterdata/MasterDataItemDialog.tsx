import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface MasterDataItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  initialData?: any;
  title: string;
}

export function MasterDataItemDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialData,
  title,
}: MasterDataItemDialogProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      label: initialData?.label || '',
      value: initialData?.value || '',
      order_index: initialData?.order_index ?? 0,
      is_default: initialData?.is_default ?? false,
    },
  });

  const isDefault = watch('is_default');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">{t('masterdata.label')}</Label>
            <Input
              id="label"
              {...register('label', { required: t('masterdata.labelRequired') })}
              placeholder={t('masterdata.label')}
            />
            {errors.label && (
              <p className="text-sm text-destructive">{String(errors.label.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">{t('masterdata.value')}</Label>
            <Input
              id="value"
              {...register('value', { required: t('masterdata.valueRequired') })}
              placeholder={t('masterdata.value')}
              disabled={!!initialData}
            />
            {errors.value && (
              <p className="text-sm text-destructive">{String(errors.value.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_index">{t('masterdata.order')}</Label>
            <Input
              id="order_index"
              type="number"
              {...register('order_index', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_default">{t('masterdata.isDefault')}</Label>
            <Switch
              id="is_default"
              checked={isDefault}
              onCheckedChange={(checked) => setValue('is_default', checked)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
