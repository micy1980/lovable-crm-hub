import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useCompany } from '@/contexts/CompanyContext';

interface AddressData {
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

interface PartnerInput {
  name: string;
  email?: string;
  phone?: string;
  tax_id?: string;
  eu_vat_number?: string;
  category?: string;
  notes?: string;
  default_currency?: string;
  restrict_access?: boolean;
  user_access?: string[];
  headquarters_address?: AddressData;
  site_address?: AddressData | null;
  mailing_address?: AddressData | null;
}

export const usePartners = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('partners')
        .select(`
          *,
          partner_addresses (
            address_type,
            country,
            county,
            postal_code,
            city,
            street_name,
            street_type,
            house_number,
            building,
            staircase,
            floor_door
          )
        `)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const saveAddresses = async (partnerId: string, headquarters?: AddressData, site?: AddressData | null, mailing?: AddressData | null) => {
    // Delete existing addresses
    await supabase
      .from('partner_addresses')
      .delete()
      .eq('partner_id', partnerId);

    const addressesToInsert = [];

    if (headquarters && Object.values(headquarters).some(v => v)) {
      addressesToInsert.push({
        partner_id: partnerId,
        address_type: 'headquarters',
        ...headquarters,
      });
    }

    if (site && Object.values(site).some(v => v)) {
      addressesToInsert.push({
        partner_id: partnerId,
        address_type: 'site',
        ...site,
      });
    }

    if (mailing && Object.values(mailing).some(v => v)) {
      addressesToInsert.push({
        partner_id: partnerId,
        address_type: 'mailing',
        ...mailing,
      });
    }

    if (addressesToInsert.length > 0) {
      const { error } = await supabase
        .from('partner_addresses')
        .insert(addressesToInsert);
      
      if (error) throw error;
    }
  };

  const createPartner = useMutation({
    mutationFn: async (values: PartnerInput) => {
      if (!activeCompany?.id) {
        throw new Error('No company selected');
      }

      const { user_access, headquarters_address, site_address, mailing_address, ...partnerData } = values;

      const { data, error } = await supabase
        .from('partners')
        .insert({
          ...partnerData,
          company_id: activeCompany.id
        })
        .select()
        .single();

      if (error) throw error;

      // Save addresses
      await saveAddresses(data.id, headquarters_address, site_address, mailing_address);

      // Add user access records if restriction is enabled
      if (values.restrict_access && user_access && user_access.length > 0) {
        const accessRecords = user_access.map(userId => ({
          partner_id: data.id,
          user_id: userId,
          company_id: activeCompany.id,
        }));

        const { error: accessError } = await supabase
          .from('partner_user_access')
          .insert(accessRecords);

        if (accessError) throw accessError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: t('partners.created') });
    },
    onError: (error: any) => {
      toast({
        title: t('partners.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updatePartner = useMutation({
    mutationFn: async ({ id, user_access, headquarters_address, site_address, mailing_address, ...values }: PartnerInput & { id: string }) => {
      const { data, error } = await supabase
        .from('partners')
        .update(values)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Save addresses
      await saveAddresses(id, headquarters_address, site_address, mailing_address);

      // Update user access records
      await supabase
        .from('partner_user_access')
        .delete()
        .eq('partner_id', id);

      if (values.restrict_access && user_access && user_access.length > 0 && activeCompany?.id) {
        const accessRecords = user_access.map((userId: string) => ({
          partner_id: id,
          user_id: userId,
          company_id: activeCompany.id,
        }));

        const { error: accessError } = await supabase
          .from('partner_user_access')
          .insert(accessRecords);

        if (accessError) throw accessError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({ title: t('partners.updated') });
    },
    onError: (error: any) => {
      toast({
        title: t('partners.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    partners,
    isLoading,
    createPartner,
    updatePartner,
  };
};
