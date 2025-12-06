import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

interface SalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: any;
  partnerId?: string;
}

interface SalesFormData {
  name: string;
  description: string;
  status: string;
  expected_value: string;
  currency: string;
  expected_close_date: string;
  business_unit: string;
  partner_id: string;
}

export const SalesDialog = ({ open, onOpenChange, sale, partnerId }: SalesDialogProps) => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<SalesFormData>({
    defaultValues: {
      name: '',
      description: '',
      status: 'lead',
      expected_value: '',
      currency: 'HUF',
      expected_close_date: '',
      business_unit: '',
      partner_id: partnerId || '',
    }
  });

  // Reset form when sale changes or dialog opens
  useEffect(() => {
    if (open) {
      if (sale) {
        reset({
          name: sale.name || '',
          description: sale.description || '',
          status: sale.status || 'lead',
          expected_value: sale.expected_value?.toString() || '',
          currency: sale.currency || 'HUF',
          expected_close_date: sale.expected_close_date || '',
          business_unit: sale.business_unit || '',
          partner_id: sale.partner_id || partnerId || '',
        });
      } else {
        reset({
          name: '',
          description: '',
          status: 'lead',
          expected_value: '',
          currency: 'HUF',
          expected_close_date: '',
          business_unit: '',
          partner_id: partnerId || '',
        });
      }
    }
  }, [open, sale, partnerId, reset]);

  // Fetch partners for dropdown
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany && open,
  });

  const onSubmit = async (data: SalesFormData) => {
    if (!activeCompany) return;

    try {
      const salesData = {
        ...data,
        company_id: activeCompany.id,
        expected_value: data.expected_value ? parseFloat(data.expected_value) : null,
        expected_close_date: data.expected_close_date || null,
        partner_id: data.partner_id || null,
      };

      if (sale) {
        const { error } = await supabase
          .from('sales')
          .update(salesData)
          .eq('id', sale.id);

        if (error) throw error;
        toast.success('Értékesítési lehetőség sikeresen frissítve');
      } else {
        const { error } = await supabase
          .from('sales')
          .insert([salesData]);

        if (error) throw error;
        toast.success('Értékesítési lehetőség sikeresen létrehozva');
      }

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      if (sale) {
        queryClient.invalidateQueries({ queryKey: ['sale', sale.id] });
      }
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Error saving sale:', error);
      toast.error('Hiba történt: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sale ? 'Értékesítés szerkesztése' : 'Új értékesítési lehetőség létrehozása'}</DialogTitle>
          <DialogDescription>
            Töltse ki az értékesítési lehetőség részleteit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Név *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Kötelező mező' })}
              placeholder="Értékesítési lehetőség neve"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Leírás</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Részletes leírás"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Státusz</Label>
              <Select
                value={watch('status') || 'lead'}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualified">Minősített</SelectItem>
                  <SelectItem value="proposal">Ajánlat</SelectItem>
                  <SelectItem value="negotiation">Tárgyalás</SelectItem>
                  <SelectItem value="closed_won">Megnyert</SelectItem>
                  <SelectItem value="closed_lost">Elveszett</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner_id">Partner</Label>
              <Select
                value={watch('partner_id') || 'none'}
                onValueChange={(value) => setValue('partner_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon partnert" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nincs</SelectItem>
                  {partners.map((partner: any) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_value">Várható érték</Label>
              <Input
                id="expected_value"
                type="number"
                {...register('expected_value')}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Pénznem</Label>
              <Select
                value={watch('currency') || 'HUF'}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUF">HUF</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Várható lezárás</Label>
              <Input
                id="expected_close_date"
                type="date"
                {...register('expected_close_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_unit">Üzletág</Label>
              <Input
                id="business_unit"
                {...register('business_unit')}
                placeholder="Pl. IT, Marketing"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Mégse
            </Button>
            <Button type="submit">
              {sale ? 'Mentés' : 'Létrehozás'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
