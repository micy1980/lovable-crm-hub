import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useCompany } from '@/contexts/CompanyContext';

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
        .select('*')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany?.id,
  });

  const createPartner = useMutation({
    mutationFn: async (values: { 
      name: string; 
      email?: string; 
      phone?: string; 
      address?: string; 
      tax_id?: string;
      eu_vat_number?: string;
      category?: string; 
      notes?: string;
      restrict_access?: boolean;
      user_access?: string[];
    }) => {
      if (!activeCompany?.id) {
        throw new Error('No company selected');
      }

      const { user_access, ...partnerData } = values;

      const { data, error } = await supabase
        .from('partners')
        .insert({
          ...partnerData,
          company_id: activeCompany.id
        })
        .select()
        .single();

      if (error) throw error;

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
    mutationFn: async ({ id, user_access, ...values }: any) => {
      const { data, error } = await supabase
        .from('partners')
        .update(values)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update user access records
      // First delete all existing access records
      await supabase
        .from('partner_user_access')
        .delete()
        .eq('partner_id', id);

      // Then add new ones if restriction is enabled
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
