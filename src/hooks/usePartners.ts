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
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const createPartner = useMutation({
    mutationFn: async (values: { 
      name: string; 
      email?: string; 
      phone?: string; 
      address?: string; 
      tax_id?: string; 
      category?: string; 
      notes?: string;
    }) => {
      if (!activeCompany?.id) {
        throw new Error('No company selected');
      }

      // Automatically add company_id from active company
      const { data, error } = await supabase
        .from('partners')
        .insert({
          ...values,
          company_id: activeCompany.id
        })
        .select()
        .single();

      if (error) throw error;
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
    mutationFn: async ({ id, ...values }: any) => {
      const { data, error } = await supabase
        .from('partners')
        .update(values)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
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