import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCompanyLicenses, CompanyLicense } from '@/hooks/useCompanyLicenses';
import { Checkbox } from '@/components/ui/checkbox';

interface CompanyLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

const AVAILABLE_FEATURES = [
  { value: 'partners', label: 'Partnerek' },
  { value: 'projects', label: 'Projektek' },
  { value: 'sales', label: 'Értékesítés' },
  { value: 'documents', label: 'Dokumentumok' },
  { value: 'calendar', label: 'Naptár' },
  { value: 'logs', label: 'Naplók' },
];

export const CompanyLicenseDialog = ({ open, onOpenChange, companyId, companyName }: CompanyLicenseDialogProps) => {
  const { getLicenseForCompany, createOrUpdateLicense } = useCompanyLicenses();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  
  const license = getLicenseForCompany(companyId);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      license_type: 'basic',
      max_users: 5,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    if (license) {
      setValue('license_type', license.license_type);
      setValue('max_users', license.max_users);
      setValue('valid_from', license.valid_from.split('T')[0]);
      setValue('valid_until', license.valid_until.split('T')[0]);
      setIsActive(license.is_active);
      setSelectedFeatures(license.features);
    } else {
      reset();
      setIsActive(true);
      setSelectedFeatures(AVAILABLE_FEATURES.map(f => f.value));
    }
  }, [license, setValue, reset]);

  const onSubmit = async (data: any) => {
    await createOrUpdateLicense.mutateAsync({
      company_id: companyId,
      license_type: data.license_type,
      max_users: parseInt(data.max_users),
      valid_from: new Date(data.valid_from).toISOString(),
      valid_until: new Date(data.valid_until + 'T23:59:59').toISOString(),
      is_active: isActive,
      features: selectedFeatures,
    });
    onOpenChange(false);
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Licensz szerkesztése - {companyName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license_type">Licensz típus</Label>
            <Input
              id="license_type"
              {...register('license_type', { required: true })}
              placeholder="pl. basic, professional, enterprise"
            />
            {errors.license_type && <span className="text-sm text-destructive">Kötelező mező</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_users">Maximum felhasználók száma</Label>
            <Input
              id="max_users"
              type="number"
              min="1"
              {...register('max_users', { required: true, min: 1 })}
            />
            {errors.max_users && <span className="text-sm text-destructive">Legalább 1 felhasználó szükséges</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Érvényes-től</Label>
              <Input
                id="valid_from"
                type="date"
                {...register('valid_from', { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Érvényes-ig</Label>
              <Input
                id="valid_until"
                type="date"
                {...register('valid_until', { required: true })}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={createOrUpdateLicense.isPending}>
              {createOrUpdateLicense.isPending ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
