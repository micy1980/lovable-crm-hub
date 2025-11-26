import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useCompanies = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const createCompany = useMutation({
    mutationFn: async (values: { name: string; tax_id?: string; address?: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(values)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: t('companies.created') });
    },
    onError: (error: any) => {
      toast({
        title: t('companies.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name: string; tax_id?: string; address?: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(values)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: t('companies.updated') });
    },
    onError: (error: any) => {
      toast({
        title: t('companies.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: t('companies.deleted') });
    },
    onError: (error: any) => {
      toast({
        title: t('companies.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    companies,
    isLoading,
    createCompany,
    updateCompany,
    deleteCompany,
  };
};
