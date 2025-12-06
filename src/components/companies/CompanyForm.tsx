import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface CompanyFormProps {
  initialData?: {
    id?: string;
    name: string;
    tax_id?: string;
    address?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CompanyForm({ initialData, onSubmit, onCancel, isSubmitting }: CompanyFormProps) {
  const { t } = useTranslation();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      tax_id: initialData?.tax_id || '',
      address: initialData?.address || '',
    },
  });

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('companies.name')} *</Label>
        <Input
          id="name"
          {...register('name', { required: 'Kötelező mező' })}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_id">{t('companies.taxId')}</Label>
        <Input id="tax_id" {...register('tax_id')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t('companies.address')}</Label>
        <Textarea id="address" {...register('address')} rows={3} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
