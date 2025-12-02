import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useMasterData } from '@/hooks/useMasterData';

export interface AddressData {
  country: string;
  county: string;
  postal_code: string;
  city: string;
  street_name: string;
  street_type: string;
  house_number: string;
  plot_number: string;
  building: string;
  staircase: string;
  floor_door: string;
}

interface AddressFieldsProps {
  title: string;
  data: AddressData;
  onChange: (data: AddressData) => void;
}

export function AddressFields({ title, data, onChange }: AddressFieldsProps) {
  const { t } = useTranslation();
  const { items: countries } = useMasterData('COUNTRY');
  const { items: counties } = useMasterData('COUNTY');
  const { items: streetTypes } = useMasterData('STREET_TYPE');

  const handleChange = (field: keyof AddressData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('partners.address.country')}</Label>
          <Select value={data.country || ''} onValueChange={(v) => handleChange('country', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('partners.address.selectCountry')} />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c: any) => (
                <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('partners.address.county')}</Label>
          <Select value={data.county || ''} onValueChange={(v) => handleChange('county', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('partners.address.selectCounty')} />
            </SelectTrigger>
            <SelectContent>
              {counties.map((c: any) => (
                <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t('partners.address.postalCode')}</Label>
          <Input 
            value={data.postal_code || ''} 
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="1234"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>{t('partners.address.city')}</Label>
          <Input 
            value={data.city || ''} 
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>{t('partners.address.streetName')}</Label>
          <Input 
            value={data.street_name || ''} 
            onChange={(e) => handleChange('street_name', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('partners.address.streetType')}</Label>
          <Select value={data.street_type || ''} onValueChange={(v) => handleChange('street_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder={t('partners.address.selectType')} />
            </SelectTrigger>
            <SelectContent>
              {streetTypes.map((s: any) => (
                <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('partners.address.houseNumber')}</Label>
          <Input 
            value={data.house_number || ''} 
            onChange={(e) => handleChange('house_number', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>{t('partners.address.plotNumber')}</Label>
          <Input 
            value={data.plot_number || ''} 
            onChange={(e) => handleChange('plot_number', e.target.value)}
            placeholder="hrsz"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('partners.address.building')}</Label>
          <Input 
            value={data.building || ''} 
            onChange={(e) => handleChange('building', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('partners.address.staircase')}</Label>
          <Input 
            value={data.staircase || ''} 
            onChange={(e) => handleChange('staircase', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('partners.address.floorDoor')}</Label>
          <Input 
            value={data.floor_door || ''} 
            onChange={(e) => handleChange('floor_door', e.target.value)}
            placeholder="em./ajtó"
          />
        </div>
      </div>
    </div>
  );
}
