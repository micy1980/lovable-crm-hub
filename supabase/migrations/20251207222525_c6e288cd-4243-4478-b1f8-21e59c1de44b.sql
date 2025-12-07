-- Time tracking table for recording time spent on tasks
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- Calculated or manually entered
  is_running BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view time entries in their company
CREATE POLICY "Users can view company time entries"
  ON public.time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = time_entries.company_id
    )
  );

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own time entries
CREATE POLICY "Users can delete own time entries"
  ON public.time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_company ON public.time_entries(company_id);

-- Workflow approvals table
CREATE TABLE public.approval_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'contract', 'document', 'sales'
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- Users can view approvals in their company
CREATE POLICY "Users can view company approvals"
  ON public.approval_workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = approval_workflows.company_id
    )
  );

-- Users can create approval requests
CREATE POLICY "Users can create approval requests"
  ON public.approval_workflows FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by AND
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = approval_workflows.company_id
    )
  );

-- Admins can update approvals (approve/reject)
CREATE POLICY "Admins can update approvals"
  ON public.approval_workflows FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_company_permissions ucp
      WHERE ucp.user_id = auth.uid() 
        AND ucp.company_id = approval_workflows.company_id
        AND ucp.role = 'ADMIN'
    )
  );

CREATE INDEX idx_approval_workflows_entity ON public.approval_workflows(entity_type, entity_id);
CREATE INDEX idx_approval_workflows_company ON public.approval_workflows(company_id);

-- Automation rules table
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'task_status_change', 'deadline_approaching', 'new_task', 'new_sales'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL, -- 'send_notification', 'change_status', 'assign_user', 'create_task'
  action_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Users can view automation rules in their company
CREATE POLICY "Users can view company automation rules"
  ON public.automation_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = automation_rules.company_id
    )
  );

-- Admins can manage automation rules
CREATE POLICY "Admins can insert automation rules"
  ON public.automation_rules FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_company_permissions ucp
      WHERE ucp.user_id = auth.uid() 
        AND ucp.company_id = automation_rules.company_id
        AND ucp.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update automation rules"
  ON public.automation_rules FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_company_permissions ucp
      WHERE ucp.user_id = auth.uid() 
        AND ucp.company_id = automation_rules.company_id
        AND ucp.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete automation rules"
  ON public.automation_rules FOR DELETE
  USING (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_company_permissions ucp
      WHERE ucp.user_id = auth.uid() 
        AND ucp.company_id = automation_rules.company_id
        AND ucp.role = 'ADMIN'
    )
  );

CREATE INDEX idx_automation_rules_company ON public.automation_rules(company_id);

-- Automation execution log
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id UUID,
  trigger_data JSONB,
  action_result JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view automation logs
CREATE POLICY "Admins can view automation logs"
  ON public.automation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automation_rules ar
      JOIN user_company_permissions ucp ON ucp.company_id = ar.company_id
      WHERE ar.id = automation_logs.rule_id
        AND ucp.user_id = auth.uid()
        AND (ucp.role = 'ADMIN' OR is_super_admin(auth.uid()))
    )
  );

CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_id);