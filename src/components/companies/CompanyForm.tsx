import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      license_type: string;
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
  
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    initialData?.license?.features || AVAILABLE_FEATURES.map(f => f.value)
  );
  const [isActive, setIsActive] = useState(initialData?.license?.is_active ?? true);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      tax_id: initialData?.tax_id || '',
      address: initialData?.address || '',
      license_type: initialData?.license?.license_type || 'basic',
      max_users: initialData?.license?.max_users || 5,
      valid_from: initialData?.license?.valid_from?.split('T')[0] || new Date().toISOString().split('T')[0],
      valid_until: initialData?.license?.valid_until?.split('T')[0] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

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
    const formData = {
      ...data,
      license: userIsSuperAdmin ? {
        license_type: data.license_type,
        max_users: parseInt(data.max_users),
        valid_from: new Date(data.valid_from).toISOString(),
        valid_until: new Date(data.valid_until + 'T23:59:59').toISOString(),
        is_active: isActive,
        features: selectedFeatures,
      } : undefined,
    };
    onSubmit(formData);
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
            <h3 className="text-lg font-semibold">Licensz beállítások</h3>
            
            <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
              <Label>Licensz kulcs</Label>
              {initialData?.license?.license_key ? (
                <>
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
                  <p className="text-xs text-muted-foreground">
                    Ez a kulcs automatikusan generálódott és egyedi. Használható a licensz validálásához.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  A licensz kulcs automatikusan generálódik mentéskor.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="license_type">Licensz típus</Label>
              <Input
                id="license_type"
                {...register('license_type')}
                placeholder="pl. basic, professional, enterprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_users">Maximum felhasználók száma</Label>
              <Input
                id="max_users"
                type="number"
                min="1"
                {...register('max_users', { min: 1 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Érvényes-től</Label>
                <Input
                  id="valid_from"
                  type="date"
                  {...register('valid_from')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Érvényes-ig</Label>
                <Input
                  id="valid_until"
                  type="date"
                  {...register('valid_until')}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active">Aktív</Label>
            </div>

            <div className="space-y-2">
              <Label>Elérhető funkciók</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_FEATURES.map(feature => (
                  <div key={feature.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature.value}
                      checked={selectedFeatures.includes(feature.value)}
                      onCheckedChange={() => toggleFeature(feature.value)}
                    />
                    <Label htmlFor={feature.value} className="font-normal cursor-pointer">
                      {feature.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

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
