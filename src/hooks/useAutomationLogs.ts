import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface AutomationLog {
  id: string;
  rule_id: string;
  executed_at: string;
  success: boolean;
  error_message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  trigger_data: Record<string, any> | null;
  action_result: Record<string, any> | null;
  rule?: {
    name: string;
  };
}

export const useAutomationLogs = (ruleId?: string) => {
  const { activeCompany } = useCompany();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['automation-logs', activeCompany?.id, ruleId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      let query = supabase
        .from('automation_logs')
        .select(`
          *,
          rule:automation_rules!rule_id(name)
        `)
        .order('executed_at', { ascending: false })
        .limit(100);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!activeCompany?.id,
  });

  const successCount = logs.filter((l) => l.success).length;
  const failureCount = logs.filter((l) => !l.success).length;

  return {
    logs,
    isLoading,
    successCount,
    failureCount,
  };
};
