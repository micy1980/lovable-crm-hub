import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TriggerType = 'task_status_change' | 'deadline_approaching' | 'new_task' | 'new_sales';
export type ActionType = 'send_notification' | 'change_status' | 'assign_user' | 'create_task';

export interface AutomationRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'task_status_change', label: 'Feladat státusz változás' },
  { value: 'deadline_approaching', label: 'Közelgő határidő' },
  { value: 'new_task', label: 'Új feladat létrehozása' },
  { value: 'new_sales', label: 'Új értékesítési lehetőség' },
];

export const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'send_notification', label: 'Értesítés küldése' },
  { value: 'change_status', label: 'Státusz változtatás' },
  { value: 'assign_user', label: 'Felhasználó hozzárendelése' },
  { value: 'create_task', label: 'Feladat létrehozása' },
];

export const useAutomationRules = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!activeCompany?.id,
  });

  const activeRules = rules.filter(r => r.is_active);

  const createRule = useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      triggerType: TriggerType;
      triggerConfig: Record<string, any>;
      actionType: ActionType;
      actionConfig: Record<string, any>;
    }) => {
      if (!user?.id || !activeCompany?.id) throw new Error('No user or company');

      const { error } = await supabase
        .from('automation_rules')
        .insert({
          company_id: activeCompany.id,
          name: params.name,
          description: params.description || null,
          trigger_type: params.triggerType,
          trigger_config: params.triggerConfig,
          action_type: params.actionType,
          action_config: params.actionConfig,
          created_by: user.id,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Automatizáció létrehozva');
    },
    onError: () => {
      toast.error('Hiba az automatizáció létrehozásakor');
    },
  });

  const updateRule = useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string;
      triggerType?: TriggerType;
      triggerConfig?: Record<string, any>;
      actionType?: ActionType;
      actionConfig?: Record<string, any>;
      isActive?: boolean;
    }) => {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (params.name !== undefined) updateData.name = params.name;
      if (params.description !== undefined) updateData.description = params.description;
      if (params.triggerType !== undefined) updateData.trigger_type = params.triggerType;
      if (params.triggerConfig !== undefined) updateData.trigger_config = params.triggerConfig;
      if (params.actionType !== undefined) updateData.action_type = params.actionType;
      if (params.actionConfig !== undefined) updateData.action_config = params.actionConfig;
      if (params.isActive !== undefined) updateData.is_active = params.isActive;

      const { error } = await supabase
        .from('automation_rules')
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Automatizáció frissítve');
    },
    onError: () => {
      toast.error('Hiba az automatizáció frissítésekor');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Automatizáció törölve');
    },
    onError: () => {
      toast.error('Hiba az automatizáció törlésekor');
    },
  });

  const toggleRule = useMutation({
    mutationFn: async (params: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: params.isActive, updated_at: new Date().toISOString() })
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast.success('Automatizáció állapota frissítve');
    },
    onError: () => {
      toast.error('Hiba az automatizáció állapotának frissítésekor');
    },
  });

  return {
    rules,
    activeRules,
    isLoading,
    createRule: createRule.mutate,
    updateRule: updateRule.mutate,
    deleteRule: deleteRule.mutate,
    toggleRule: toggleRule.mutate,
    isCreating: createRule.isPending,
  };
};
