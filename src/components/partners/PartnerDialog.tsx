import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Building2, MapPin, FileText, Users, Banknote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useMasterData } from '@/hooks/useMasterData';
import { AddressFields, AddressData } from './AddressFields';
import { TaxIdInput } from './TaxIdInput';
import { RichTextEditor } from '@/components/shared/RichTextEditor';

interface PartnerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  initialData?: any;
}

const emptyAddress: AddressData = {
  country: '',
  county: '',
  postal_code: '',
  city: '',
  street_name: '',
  street_type: '',
  house_number: '',
  plot_number: '',
  building: '',
  staircase: '',
  floor_door: '',
};

export function PartnerDialog({ open, onClose, onSubmit, isSubmitting, initialData }: PartnerDialogProps) {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [restrictAccess, setRestrictAccess] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [headquartersAddress, setHeadquartersAddress] = useState<AddressData>(emptyAddress);
  const [siteAddress, setSiteAddress] = useState<AddressData>(emptyAddress);
  const { items: categories } = useMasterData('PARTNER_CATEGORY');
  const { items: currencies } = useMasterData('CURRENCY');

  const isEdit = !!initialData;

  useEffect(() => {
    if (open && activeCompany?.id) {
      fetchCompanyUsers();
    }
  }, [open, activeCompany?.id]);

  useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        eu_vat_number: initialData.eu_vat_number || '',
        category: initialData.category || '',
        default_currency: initialData.default_currency || 'HUF',
      });
      setTaxId(initialData.tax_id || '');
      setNotes(initialData.notes || '');
      setRestrictAccess(initialData.restrict_access || false);
      fetchPartnerUserAccess(initialData.id);
      fetchPartnerAddresses(initialData.id);
    } else if (open) {
      reset({
        name: '',
        email: '',
        phone: '',
        eu_vat_number: '',
        category: '',
        default_currency: 'HUF',
      });
      setTaxId('');
      setNotes('');
      setRestrictAccess(false);
      setSelectedUsers([]);
      setHeadquartersAddress(emptyAddress);
      setSiteAddress(emptyAddress);
    }
  }, [open, initialData, reset]);

  const fetchCompanyUsers = async () => {
    if (!activeCompany?.id) return;

    const { data } = await supabase
      .from('user_company_permissions')
      .select(`
        user_id,
        profiles:user_id (id, full_name, email)
      `)
      .eq('company_id', activeCompany.id);

    if (data) {
      const users = data.map((item: any) => item.profiles).filter(Boolean);
      setCompanyUsers(users);
    }
  };

  const fetchPartnerUserAccess = async (partnerId: string) => {
    const { data } = await supabase
      .from('partner_user_access')
      .select('user_id')
      .eq('partner_id', partnerId);

    if (data) {
      setSelectedUsers(data.map((item: any) => item.user_id));
    }
  };

  const fetchPartnerAddresses = async (partnerId: string) => {
    const { data } = await supabase
      .from('partner_addresses')
      .select('*')
      .eq('partner_id', partnerId);

    if (data) {
      const hq = data.find((a: any) => a.address_type === 'headquarters');
      const site = data.find((a: any) => a.address_type === 'site');
      
      if (hq) {
        setHeadquartersAddress({
          country: hq.country || '',
          county: hq.county || '',
          postal_code: hq.postal_code || '',
          city: hq.city || '',
          street_name: hq.street_name || '',
          street_type: hq.street_type || '',
          house_number: hq.house_number || '',
          plot_number: hq.plot_number || '',
          building: hq.building || '',
          staircase: hq.staircase || '',
          floor_door: hq.floor_door || '',
        });
      }
      
      if (site) {
        setSiteAddress({
          country: site.country || '',
          county: site.county || '',
          postal_code: site.postal_code || '',
          city: site.city || '',
          street_name: site.street_name || '',
          street_type: site.street_type || '',
          house_number: site.house_number || '',
          plot_number: site.plot_number || '',
          building: site.building || '',
          staircase: site.staircase || '',
          floor_door: site.floor_door || '',
        });
      }
    }
  };

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      tax_id: taxId,
      notes,
      restrict_access: restrictAccess,
      user_access: restrictAccess ? selectedUsers : [],
      headquarters_address: headquartersAddress,
      site_address: siteAddress,
    });
  };

  const handleUserSelect = (userId: string) => {
    if (userId && !selectedUsers.includes(userId)) {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const getUserName = (userId: string) => {
    const user = companyUsers.find(u => u.id === userId);
    return user?.full_name || user?.email || userId;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">
            {isEdit ? t('partners.editTitle') : t('partners.createTitle')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid grid-cols-5 w-auto">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('partners.basicInfo')}</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                <span className="hidden sm:inline">{t('partners.financialInfo')}</span>
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Címek</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">{t('partners.notesSection')}</span>
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('partners.userAccess')}</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Alapadatok */}
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-medium">{t('partners.name')} *</Label>
                      <Input
                        id="name"
                        className="h-11"
                        {...register('name', { required: t('partners.nameRequired') })}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message as string}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base font-medium">{t('partners.email')}</Label>
                      <Input id="email" type="email" className="h-11" {...register('email')} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-base font-medium">{t('partners.phone')}</Label>
                      <Input id="phone" className="h-11" {...register('phone')} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-base font-medium">{t('partners.category')}</Label>
                      <Select
                        value={watch('category') || ''}
                        onValueChange={(value) => setValue('category', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={t('partners.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_currency" className="text-base font-medium">{t('partners.defaultCurrency')}</Label>
                      <Select
                        value={watch('default_currency') || 'HUF'}
                        onValueChange={(value) => setValue('default_currency', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HUF">HUF - Magyar forint</SelectItem>
                          <SelectItem value="EUR">EUR - Euró</SelectItem>
                          <SelectItem value="USD">USD - Amerikai dollár</SelectItem>
                          {currencies.map((cur: any) => (
                            <SelectItem key={cur.id} value={cur.value}>
                              {cur.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pénzügyi adatok */}
              <TabsContent value="financial" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id" className="text-base font-medium">{t('partners.taxId')}</Label>
                    <TaxIdInput
                      id="tax_id"
                      value={taxId}
                      onChange={setTaxId}
                    />
                    <p className="text-xs text-muted-foreground">Formátum: xxxxxxxx-x-xx</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eu_vat_number" className="text-base font-medium">{t('partners.euVatNumber')}</Label>
                    <Input id="eu_vat_number" className="h-11" {...register('eu_vat_number')} placeholder="HU12345678" />
                    <p className="text-xs text-muted-foreground">EU közösségi adószám</p>
                  </div>
                </div>
              </TabsContent>

              {/* Címek */}
              <TabsContent value="addresses" className="mt-0 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('partners.headquarters')}</h3>
                  </div>
                  <AddressFields
                    title=""
                    data={headquartersAddress}
                    onChange={setHeadquartersAddress}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('partners.site')}</h3>
                  </div>
                  <AddressFields
                    title=""
                    data={siteAddress}
                    onChange={setSiteAddress}
                  />
                </div>
              </TabsContent>

              {/* Megjegyzések */}
              <TabsContent value="notes" className="mt-0">
                <div className="space-y-2">
                  <Label className="text-base font-medium">{t('partners.notes')}</Label>
                  <RichTextEditor
                    content={notes}
                    onChange={setNotes}
                    className="min-h-[300px]"
                  />
                </div>
              </TabsContent>

              {/* Felhasználói hozzáférések */}
              <TabsContent value="access" className="mt-0 space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="restrict_access" className="text-base font-medium">{t('partners.restrictAccessLabel')}</Label>
                      <p className="text-sm text-muted-foreground">{t('partners.userAccessDescription')}</p>
                    </div>
                    <Switch
                      id="restrict_access"
                      checked={restrictAccess}
                      onCheckedChange={setRestrictAccess}
                    />
                  </div>
                </div>

                {restrictAccess && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium">{t('partners.selectUsers')}</Label>
                      <Select onValueChange={handleUserSelect}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={t('partners.selectUserPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {companyUsers
                            .filter(user => !selectedUsers.includes(user.id))
                            .map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
                        {selectedUsers.map((userId) => (
                          <Badge key={userId} variant="secondary" className="flex items-center gap-1 py-1.5 px-3">
                            {getUserName(userId)}
                            <button
                              type="button"
                              onClick={() => handleUserRemove(userId)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={onClose} className="min-w-[100px]">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
