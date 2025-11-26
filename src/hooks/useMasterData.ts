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
      // Auto-generate value from label if not provided
      const value = data.value || data.label.toUpperCase().replace(/\s+/g, '_');
      
      // Get max order_index for this type
      const { data: existingItems } = await supabase
        .from('master_data')
        .select('order_index')
        .eq('type', data.type)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const maxOrder = existingItems?.[0]?.order_index ?? -1;
      
      const { error } = await supabase
        .from('master_data')
        .insert({
          ...data,
          value,
          order_index: maxOrder + 1,
        });

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

  const reorderItems = useMutation({
    mutationFn: async (items: any[]) => {
      // Update order_index for all items
      const updates = items.map((item) => 
        supabase
          .from('master_data')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      );

      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-data'] });
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
    reorderItems,
  };
};
