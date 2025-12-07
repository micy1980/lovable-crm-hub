import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  requester?: { full_name: string | null; email: string };
  approver?: { full_name: string | null; email: string } | null;
}

export const useApprovalWorkflows = (entityType?: string, entityId?: string) => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approval-workflows', activeCompany?.id, entityType, entityId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      let query = supabase
        .from('approval_workflows')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });
      
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ApprovalWorkflow[];
    },
    enabled: !!activeCompany?.id,
  });

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const requestApproval = useMutation({
    mutationFn: async (params: {
      entityType: string;
      entityId: string;
      notes?: string;
    }) => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      const { error } = await supabase
        .from('approval_workflows')
        .insert({
          company_id: activeCompany.id,
          entity_type: params.entityType,
          entity_id: params.entityId,
          requested_by: user.id,
          notes: params.notes || null,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Jóváhagyási kérelem elküldve');
    },
    onError: () => {
      toast.error('Hiba a jóváhagyási kérelem küldésekor');
    },
  });

  const approveRequest = useMutation({
    mutationFn: async (approvalId: string) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('approval_workflows')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Jóváhagyva');
    },
    onError: () => {
      toast.error('Hiba a jóváhagyás során');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (params: { approvalId: string; reason: string }) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('approval_workflows')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: params.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success('Elutasítva');
    },
    onError: () => {
      toast.error('Hiba az elutasítás során');
    },
  });

  return {
    approvals,
    pendingApprovals,
    isLoading,
    requestApproval: requestApproval.mutate,
    approveRequest: approveRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    isRequesting: requestApproval.isPending,
  };
};
