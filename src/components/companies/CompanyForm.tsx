import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Copy, Check, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LicenseActivationDialog } from './LicenseActivationDialog';

const AVAILABLE_FEATURES = [
  { value: 'partners', label: 'Partnerek' },
  { value: 'projects', label: 'Projektek' },
  { value: 'sales', label: 'Értékesítés' },
  { value: 'documents', label: 'Dokumentumok' },
  { value: 'calendar', label: 'Naptár' },
  { value: 'logs', label: 'Naplók' },
];

interface CompanyFormProps {
  initialData?: {
    id?: string;
    name: string;
    tax_id?: string;
    address?: string;
    license?: {
      max_users: number;
      valid_from: string;
      valid_until: string;
      is_active: boolean;
      features: string[];
      license_key?: string;
    };
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CompanyForm({ initialData, onSubmit, onCancel, isSubmitting }: CompanyFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const userIsSuperAdmin = isSuperAdmin(profile);
  const [copied, setCopied] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      tax_id: initialData?.tax_id || '',
      address: initialData?.address || '',
    },
  });

  const copyLicenseKey = () => {
    if (initialData?.license?.license_key) {
      navigator.clipboard.writeText(initialData.license.license_key);
      setCopied(true);
      toast({
        title: 'Licensz kulcs másolva',
        description: 'A licensz kulcs a vágólapra került.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  const handleLicenseSuccess = () => {
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Company Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Vállalat adatai</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">{t('companies.name')} *</Label>
          <Input
            id="name"
            {...register('name', { required: t('companies.nameRequired') })}
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
      </div>

      {/* License Section - Only for Super Admin */}
      {userIsSuperAdmin && (
        <>
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Licensz</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLicenseDialog(true)}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                Licenszkulcs megadása
              </Button>
            </div>
            
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label>Licenszkulcs</Label>
                {initialData?.license?.license_key ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={initialData.license.license_key}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyLicenseKey}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nincs aktív licensz kulcs.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Maximum felhasználók száma</Label>
                <Input
                  value={initialData?.license?.max_users || '-'}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Érvényes-től</Label>
                  <Input
                    value={initialData?.license?.valid_from?.split('T')[0] || '-'}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Érvényes-ig</Label>
                  <Input
                    value={initialData?.license?.valid_until?.split('T')[0] || '-'}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Elérhető funkciók</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_FEATURES.map(feature => (
                    <div key={feature.value} className="flex items-center space-x-2 opacity-60">
                      <Checkbox
                        id={`${feature.value}-readonly`}
                        checked={initialData?.license?.features?.includes(feature.value) || false}
                        disabled
                      />
                      <Label htmlFor={`${feature.value}-readonly`} className="font-normal">
                        {feature.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <LicenseActivationDialog
        open={showLicenseDialog}
        onOpenChange={setShowLicenseDialog}
        companyId={initialData?.id}
        onSuccess={handleLicenseSuccess}
      />

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
