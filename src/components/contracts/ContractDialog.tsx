import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useContracts, Contract } from '@/hooks/useContracts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
}

interface ContractFormData {
  title: string;
  contract_number: string;
  contract_type: string;
  description: string;
  partner_id: string;
  project_id: string;
  sales_id: string;
  signed_date: string;
  effective_date: string;
  expiry_date: string;
  termination_notice_days: number;
  auto_renewal: boolean;
  renewal_period_months: number;
  total_value: number | null;
  currency: string;
  payment_frequency: string;
  payment_day: number | null;
  billing_start_date: string;
  status: string;
  expiry_warning_days: number;
  termination_warning_days: number;
  renewal_warning_days: number;
  restrict_access: boolean;
}

const ContractDialog = ({ open, onOpenChange, contract }: ContractDialogProps) => {
  const { activeCompany } = useCompany();
  const { createContract, updateContract } = useContracts();
  const [activeTab, setActiveTab] = useState('basic');

  // Fetch master data
  const { data: masterData = [] } = useQuery({
    queryKey: ['master_data'],
    queryFn: async () => {
      const { data } = await supabase.from('master_data').select('*').order('order_index');
      return data || [];
    },
  });
  
  const getMasterDataByType = (type: string) => masterData.filter(m => m.type === type);

  const contractTypes = getMasterDataByType('CONTRACT_TYPE');
  const contractStatuses = getMasterDataByType('CONTRACT_STATUS');
  const paymentFrequencies = getMasterDataByType('PAYMENT_FREQUENCY');
  const currencies = getMasterDataByType('currency');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ContractFormData>({
    defaultValues: {
      title: '',
      contract_number: '',
      contract_type: '',
      description: '',
      partner_id: '',
      project_id: '',
      sales_id: '',
      signed_date: '',
      effective_date: '',
      expiry_date: '',
      termination_notice_days: 30,
      auto_renewal: false,
      renewal_period_months: 12,
      total_value: null,
      currency: 'HUF',
      payment_frequency: '',
      payment_day: null,
      billing_start_date: '',
      status: 'draft',
      expiry_warning_days: 30,
      termination_warning_days: 60,
      renewal_warning_days: 45,
      restrict_access: false,
    },
  });

  const autoRenewal = watch('auto_renewal');

  // Fetch partners, projects, sales for dropdowns
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data } = await supabase
        .from('partners')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
    enabled: !!activeCompany?.id && open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
    enabled: !!activeCompany?.id && open,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data } = await supabase
        .from('sales')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
    enabled: !!activeCompany?.id && open,
  });

  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          title: contract.title || '',
          contract_number: contract.contract_number || '',
          contract_type: contract.contract_type || '',
          description: contract.description || '',
          partner_id: contract.partner_id || '',
          project_id: contract.project_id || '',
          sales_id: contract.sales_id || '',
          signed_date: contract.signed_date || '',
          effective_date: contract.effective_date || '',
          expiry_date: contract.expiry_date || '',
          termination_notice_days: contract.termination_notice_days || 30,
          auto_renewal: contract.auto_renewal || false,
          renewal_period_months: contract.renewal_period_months || 12,
          total_value: contract.total_value,
          currency: contract.currency || 'HUF',
          payment_frequency: contract.payment_frequency || '',
          payment_day: contract.payment_day,
          billing_start_date: contract.billing_start_date || '',
          status: contract.status || 'draft',
          expiry_warning_days: contract.expiry_warning_days || 30,
          termination_warning_days: contract.termination_warning_days || 60,
          renewal_warning_days: contract.renewal_warning_days || 45,
          restrict_access: contract.restrict_access || false,
        });
      } else {
        reset({
          title: '',
          contract_number: '',
          contract_type: '',
          description: '',
          partner_id: '',
          project_id: '',
          sales_id: '',
          signed_date: '',
          effective_date: '',
          expiry_date: '',
          termination_notice_days: 30,
          auto_renewal: false,
          renewal_period_months: 12,
          total_value: null,
          currency: 'HUF',
          payment_frequency: '',
          payment_day: null,
          billing_start_date: '',
          status: 'draft',
          expiry_warning_days: 30,
          termination_warning_days: 60,
          renewal_warning_days: 45,
          restrict_access: false,
        });
      }
      setActiveTab('basic');
    }
  }, [open, contract, reset]);

  const onSubmit = async (data: ContractFormData) => {
    const payload = {
      ...data,
      partner_id: data.partner_id || null,
      project_id: data.project_id || null,
      sales_id: data.sales_id || null,
      contract_type: data.contract_type || null,
      payment_frequency: data.payment_frequency || null,
    };

    if (contract) {
      await updateContract.mutateAsync({ id: contract.id, updates: payload });
    } else {
      await createContract.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? 'Szerződés szerkesztése' : 'Új szerződés'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="basic" className="text-sm">Alapadatok</TabsTrigger>
              <TabsTrigger value="financial" className="text-sm">Pénzügyek</TabsTrigger>
              <TabsTrigger value="dates" className="text-sm">Időpontok</TabsTrigger>
              <TabsTrigger value="notifications" className="text-sm">Figyelmeztetések</TabsTrigger>
            </TabsList>

            <div className="h-[450px] overflow-y-auto">
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Megnevezés *</Label>
                    <Input
                      id="title"
                      {...register('title', { required: true })}
                      className={errors.title ? 'border-red-500' : ''}
                    />
                    {errors.title && <span className="text-sm text-red-500">Kötelező mező</span>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_number">Szerződésszám</Label>
                    <Input id="contract_number" {...register('contract_number')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Típus</Label>
                    <Select
                      value={watch('contract_type')}
                      onValueChange={(v) => setValue('contract_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon típust" />
                      </SelectTrigger>
                      <SelectContent>
                        {contractTypes.map((t) => (
                          <SelectItem key={t.id} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Státusz</Label>
                    <Select
                      value={watch('status')}
                      onValueChange={(v) => setValue('status', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon státuszt" />
                      </SelectTrigger>
                      <SelectContent>
                        {contractStatuses.length > 0 ? (
                          contractStatuses.map((s) => (
                            <SelectItem key={s.id} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="draft">Tervezet</SelectItem>
                            <SelectItem value="active">Aktív</SelectItem>
                            <SelectItem value="expired">Lejárt</SelectItem>
                            <SelectItem value="terminated">Megszűnt</SelectItem>
                            <SelectItem value="renewed">Megújítva</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Partner</Label>
                  <Select
                    value={watch('partner_id')}
                    onValueChange={(v) => setValue('partner_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon partnert" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Projekt</Label>
                    <Select
                      value={watch('project_id')}
                      onValueChange={(v) => setValue('project_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon projektet" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Értékesítés</Label>
                    <Select
                      value={watch('sales_id')}
                      onValueChange={(v) => setValue('sales_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon értékesítést" />
                      </SelectTrigger>
                      <SelectContent>
                        {sales.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Leírás</Label>
                  <Textarea id="description" {...register('description')} rows={3} />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="restrict_access"
                    checked={watch('restrict_access')}
                    onCheckedChange={(v) => setValue('restrict_access', v)}
                  />
                  <Label htmlFor="restrict_access">Hozzáférés korlátozása</Label>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_value">Összérték</Label>
                    <Input
                      id="total_value"
                      type="number"
                      {...register('total_value', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pénznem</Label>
                    <Select
                      value={watch('currency')}
                      onValueChange={(v) => setValue('currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HUF">HUF</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        {currencies.map((c) => (
                          <SelectItem key={c.id} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fizetési gyakoriság</Label>
                    <Select
                      value={watch('payment_frequency')}
                      onValueChange={(v) => setValue('payment_frequency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentFrequencies.length > 0 ? (
                          paymentFrequencies.map((f) => (
                            <SelectItem key={f.id} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="monthly">Havi</SelectItem>
                            <SelectItem value="quarterly">Negyedéves</SelectItem>
                            <SelectItem value="yearly">Éves</SelectItem>
                            <SelectItem value="one_time">Egyszeri</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_day">Fizetési határidő (nap)</Label>
                    <Input
                      id="payment_day"
                      type="number"
                      min={1}
                      max={90}
                      {...register('payment_day', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_start_date">Számlázás kezdete</Label>
                  <Input
                    id="billing_start_date"
                    type="date"
                    {...register('billing_start_date')}
                  />
                </div>
              </TabsContent>

              <TabsContent value="dates" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signed_date">Aláírás dátuma</Label>
                    <Input id="signed_date" type="date" {...register('signed_date')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effective_date">Hatálybalépés dátuma</Label>
                    <Input id="effective_date" type="date" {...register('effective_date')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Lejárat dátuma</Label>
                    <Input id="expiry_date" type="date" {...register('expiry_date')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="termination_notice_days">Felmondási idő (nap)</Label>
                    <Input
                      id="termination_notice_days"
                      type="number"
                      {...register('termination_notice_days', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto_renewal"
                      checked={autoRenewal}
                      onCheckedChange={(v) => setValue('auto_renewal', v)}
                    />
                    <Label htmlFor="auto_renewal">Automatikus megújítás</Label>
                  </div>

                  {autoRenewal && (
                    <div className="space-y-2">
                      <Label htmlFor="renewal_period_months">Megújítási időszak (hónap)</Label>
                      <Input
                        id="renewal_period_months"
                        type="number"
                        {...register('renewal_period_months', { valueAsNumber: true })}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry_warning_days">Lejárati figyelmeztetés (nappal előtte)</Label>
                  <Input
                    id="expiry_warning_days"
                    type="number"
                    {...register('expiry_warning_days', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termination_warning_days">Felmondási határidő figyelmeztetés (nappal előtte)</Label>
                  <Input
                    id="termination_warning_days"
                    type="number"
                    {...register('termination_warning_days', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="renewal_warning_days">Megújítási figyelmeztetés (nappal előtte)</Label>
                  <Input
                    id="renewal_warning_days"
                    type="number"
                    {...register('renewal_warning_days', { valueAsNumber: true })}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={createContract.isPending || updateContract.isPending}>
              {contract ? 'Mentés' : 'Létrehozás'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractDialog;
