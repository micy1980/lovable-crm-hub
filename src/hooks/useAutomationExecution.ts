import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface ExecutionContext {
  entityType: string;
  entityId: string;
  triggerData: Record<string, any>;
}

export const useAutomationExecution = () => {
  const { activeCompany } = useCompany();

  const executeAutomation = async (triggerType: string, context: Omit<ExecutionContext, 'companyId'>) => {
    if (!activeCompany?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('execute-automation', {
        body: {
          triggerType,
          context: {
            ...context,
            companyId: activeCompany.id,
          },
        },
      });

      if (error) {
        console.error('Automation execution error:', error);
      }

      return data;
    } catch (err) {
      console.error('Failed to execute automation:', err);
    }
  };

  // Helper functions for common triggers
  const onTaskStatusChange = async (taskId: string, oldStatus: string, newStatus: string) => {
    await executeAutomation('task_status_change', {
      entityType: 'task',
      entityId: taskId,
      triggerData: { old_status: oldStatus, new_status: newStatus },
    });
  };

  const onTaskCreated = async (taskId: string, taskData: Record<string, any>) => {
    await executeAutomation('task_created', {
      entityType: 'task',
      entityId: taskId,
      triggerData: taskData,
    });
  };

  const onProjectStatusChange = async (projectId: string, oldStatus: string, newStatus: string) => {
    await executeAutomation('project_status_change', {
      entityType: 'project',
      entityId: projectId,
      triggerData: { old_status: oldStatus, new_status: newStatus },
    });
  };

  const onSalesStatusChange = async (salesId: string, oldStatus: string, newStatus: string) => {
    await executeAutomation('sales_status_change', {
      entityType: 'sales',
      entityId: salesId,
      triggerData: { old_status: oldStatus, new_status: newStatus },
    });
  };

  const onDeadlineApproaching = async (entityType: string, entityId: string, deadlineDate: string) => {
    await executeAutomation('deadline_approaching', {
      entityType,
      entityId,
      triggerData: { deadline_date: deadlineDate },
    });
  };

  const onContractExpiring = async (contractId: string, expiryDate: string) => {
    await executeAutomation('contract_expiring', {
      entityType: 'contract',
      entityId: contractId,
      triggerData: { expiry_date: expiryDate },
    });
  };

  return {
    executeAutomation,
    onTaskStatusChange,
    onTaskCreated,
    onProjectStatusChange,
    onSalesStatusChange,
    onDeadlineApproaching,
    onContractExpiring,
  };
};