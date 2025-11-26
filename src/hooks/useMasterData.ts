import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useMasterData = (type: string | null) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['master-data', type],
    queryFn: async () => {
      if (!type) return [];
      
      const { data, error } = await supabase
        .from('master_data')
        .select('*')
        .eq('type', type)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!type,
  });

  const createItem = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('master_data')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data'] });
      toast({ title: t('masterdata.created') });
    },
    onError: (error: any) => {
      toast({
        title: t('masterdata.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase
        .from('master_data')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data'] });
      toast({ title: t('masterdata.updated') });
    },
    onError: (error: any) => {
      toast({
        title: t('masterdata.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('master_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data'] });
      toast({ title: t('masterdata.deleted') });
    },
    onError: (error: any) => {
      toast({
        title: t('masterdata.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
};
