import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface UseBulkOperationsOptions {
  entityType: 'projects' | 'sales' | 'tasks' | 'events' | 'partners' | 'documents' | 'contracts';
  queryKey: string[];
  onSuccess?: () => void;
}

export function useBulkOperations({ entityType, queryKey, onSuccess }: UseBulkOperationsOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk status change
  const bulkStatusChange = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      setIsProcessing(true);
      const { error } = await supabase
        .from(entityType)
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids);
      
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t('common.success'),
        description: t('bulk.statusChanged', { count: data.count }),
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Bulk owner/responsible change
  const bulkOwnerChange = useMutation({
    mutationFn: async ({ ids, userId, field }: { ids: string[]; userId: string; field: string }) => {
      setIsProcessing(true);
      const updateData: any = { updated_at: new Date().toISOString() };
      updateData[field] = userId;
      
      const { error } = await supabase
        .from(entityType)
        .update(updateData)
        .in('id', ids);
      
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t('common.success'),
        description: t('bulk.ownerChanged', { count: data.count }),
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Bulk soft delete - uses RPC functions where available
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      setIsProcessing(true);
      
      // Use RPC functions for soft delete where available
      const rpcFunctionMap: Record<string, string> = {
        projects: 'soft_delete_project',
        tasks: 'soft_delete_task',
        events: 'soft_delete_event',
        documents: 'soft_delete_document',
        contracts: 'soft_delete_contract',
      };

      const rpcFunction = rpcFunctionMap[entityType];
      
      if (rpcFunction) {
        // Delete one by one using RPC
        const errors: string[] = [];
        for (const id of ids) {
          const paramName = `_${entityType.slice(0, -1)}_id`; // e.g., _project_id
          const { error } = await supabase.rpc(rpcFunction as any, { [paramName]: id });
          if (error) {
            errors.push(`${id}: ${error.message}`);
          }
        }
        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }
      } else {
        // Fallback to direct soft delete
        const { error } = await supabase
          .from(entityType)
          .update({ deleted_at: new Date().toISOString() })
          .in('id', ids);
        
        if (error) throw error;
      }
      
      return { count: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t('common.success'),
        description: t('bulk.deleted', { count: data.count }),
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  return {
    bulkStatusChange,
    bulkOwnerChange,
    bulkDelete,
    isProcessing,
  };
}
