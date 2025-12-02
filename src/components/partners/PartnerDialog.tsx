import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useMasterData } from '@/hooks/useMasterData';

interface PartnerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  initialData?: any;
}

export function PartnerDialog({ open, onClose, onSubmit, isSubmitting, initialData }: PartnerDialogProps) {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [restrictAccess, setRestrictAccess] = useState(false);
  const { items: categories } = useMasterData('PARTNER_CATEGORY');

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
        tax_id: initialData.tax_id || '',
        eu_vat_number: initialData.eu_vat_number || '',
        address: initialData.address || '',
        category: initialData.category || '',
        notes: initialData.notes || '',
      });
      setRestrictAccess(initialData.restrict_access || false);
      fetchPartnerUserAccess(initialData.id);
    } else if (open) {
      reset({
        name: '',
        email: '',
        phone: '',
        tax_id: '',
        eu_vat_number: '',
        address: '',
        category: '',
        notes: '',
      });
      setRestrictAccess(false);
      setSelectedUsers([]);
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

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      restrict_access: restrictAccess,
      user_access: restrictAccess ? selectedUsers : [],
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('partners.editTitle') : t('partners.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Alapadatok */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary">{t('partners.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('partners.name')} *</Label>
                <Input
                  id="name"
                  {...register('name', { required: t('partners.nameRequired') })}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message as string}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('partners.email')}</Label>
                  <Input id="email" type="email" {...register('email')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('partners.phone')}</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('partners.category')}</Label>
                <Select
                  value={watch('category') || ''}
                  onValueChange={(value) => setValue('category', value)}
                >
                  <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* Pénzügyi adatok */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary">{t('partners.financialInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">{t('partners.taxId')}</Label>
                  <Input id="tax_id" {...register('tax_id')} placeholder="12345678-1-23" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eu_vat_number">{t('partners.euVatNumber')}</Label>
                  <Input id="eu_vat_number" {...register('eu_vat_number')} placeholder="HU12345678" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cím */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary">{t('partners.addressInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">{t('partners.address')}</Label>
                <Textarea id="address" {...register('address')} rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Megjegyzések */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary">{t('partners.notesSection')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('partners.notes')}</Label>
                <Textarea id="notes" {...register('notes')} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Felhasználói hozzáférések */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary">{t('partners.userAccess')}</CardTitle>
              <CardDescription>{t('partners.userAccessDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="restrict_access"
                  checked={restrictAccess}
                  onCheckedChange={setRestrictAccess}
                />
                <Label htmlFor="restrict_access">{t('partners.restrictAccessLabel')}</Label>
              </div>

              {restrictAccess && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t('partners.selectUsers')}</Label>
                    <Select onValueChange={handleUserSelect}>
                      <SelectTrigger>
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
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((userId) => (
                        <Badge key={userId} variant="secondary" className="flex items-center gap-1">
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
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
