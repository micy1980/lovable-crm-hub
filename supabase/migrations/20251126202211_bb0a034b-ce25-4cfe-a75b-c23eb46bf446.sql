-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'normal', 'viewer');

-- 1) PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'normal',
  can_delete BOOLEAN DEFAULT false,
  can_view_logs BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) COMPANIES TABLE
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3) USER_COMPANIES MAPPING
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 4) MASTER_DATA TABLE
CREATE TABLE public.master_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  order_index INT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, value)
);

ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;

-- 5) PARTNERS TABLE (GLOBAL)
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- 6) PROJECTS TABLE (COMPANY-SCOPED)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT,
  owner_user_id UUID REFERENCES public.profiles(id),
  responsible1_user_id UUID REFERENCES public.profiles(id),
  responsible2_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 7) SALES TABLE (COMPANY-SCOPED)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT,
  business_unit TEXT,
  expected_value NUMERIC,
  currency TEXT DEFAULT 'HUF',
  expected_close_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 8) TASKS TABLE (COMPANY-SCOPED)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  sales_id UUID REFERENCES public.sales(id),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  responsible_user_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 9) COSTS TABLE (LINKED TO PROJECT)
CREATE TABLE public.costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'HUF',
  quantity NUMERIC,
  cost_date DATE NOT NULL,
  exchange_rate_id UUID,
  rate NUMERIC,
  amount_huf NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;

-- 10) EXCHANGE_RATES TABLE
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_from TEXT NOT NULL,
  currency_to TEXT NOT NULL DEFAULT 'HUF',
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(currency_from, currency_to, rate_date)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- 11) DOCUMENTS TABLE (COMPANY-SCOPED)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id),
  project_id UUID REFERENCES public.projects(id),
  sales_id UUID REFERENCES public.sales(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'COMPANY_ONLY' CHECK (visibility IN ('COMPANY_ONLY', 'SHARED')),
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 12) LOGS TABLE (AUDIT LOG)
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  previous_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- ===== AUTHENTICATION TRIGGER =====

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  new_role user_role;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- If this is the first user, make them super_admin
  IF user_count = 0 THEN
    new_role := 'super_admin';
  ELSE
    new_role := 'normal';
  END IF;
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    new_role,
    true
  );
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS POLICIES =====

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR role = 'super_admin');

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Users can update their own non-privileged fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    can_delete = (SELECT can_delete FROM public.profiles WHERE id = auth.uid()) AND
    can_view_logs = (SELECT can_view_logs FROM public.profiles WHERE id = auth.uid()) AND
    is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can update any profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- COMPANIES POLICIES
CREATE POLICY "Super admins can manage all companies"
  ON public.companies FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their assigned companies"
  ON public.companies FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage their companies"
  ON public.companies FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin') AND
    id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );

-- USER_COMPANIES POLICIES
CREATE POLICY "Super admins can manage all user-company mappings"
  ON public.user_companies FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "Admins can manage mappings for their companies"
  ON public.user_companies FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin') AND
    company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their own company mappings"
  ON public.user_companies FOR SELECT
  USING (user_id = auth.uid());

-- MASTER_DATA POLICIES
CREATE POLICY "Anyone can view master data"
  ON public.master_data FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage master data"
  ON public.master_data FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- PARTNERS POLICIES
CREATE POLICY "Anyone can view non-deleted partners"
  ON public.partners FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage partners"
  ON public.partners FOR INSERT
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update partners"
  ON public.partners FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Users with can_delete can soft delete partners"
  ON public.partners FOR UPDATE
  USING ((SELECT can_delete FROM public.profiles WHERE id = auth.uid()) = true);

-- PROJECTS POLICIES
CREATE POLICY "Users can view projects in their companies"
  ON public.projects FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create projects in their companies"
  ON public.projects FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update projects in their companies"
  ON public.projects FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users with can_delete can soft delete projects"
  ON public.projects FOR UPDATE
  USING ((SELECT can_delete FROM public.profiles WHERE id = auth.uid()) = true);

-- SALES POLICIES (similar to projects)
CREATE POLICY "Users can view sales in their companies"
  ON public.sales FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create sales in their companies"
  ON public.sales FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update sales in their companies"
  ON public.sales FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

-- TASKS POLICIES
CREATE POLICY "Users can view tasks in their companies"
  ON public.tasks FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create tasks in their companies"
  ON public.tasks FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update tasks in their companies"
  ON public.tasks FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

-- COSTS POLICIES
CREATE POLICY "Users can view costs for projects in their companies"
  ON public.costs FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      project_id IN (
        SELECT id FROM public.projects 
        WHERE company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create costs for projects in their companies"
  ON public.costs FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      project_id IN (
        SELECT id FROM public.projects 
        WHERE company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update costs for projects in their companies"
  ON public.costs FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      project_id IN (
        SELECT id FROM public.projects 
        WHERE company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
      )
    )
  );

-- EXCHANGE_RATES POLICIES
CREATE POLICY "Anyone can view exchange rates"
  ON public.exchange_rates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exchange rates"
  ON public.exchange_rates FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- DOCUMENTS POLICIES
CREATE POLICY "Users can view documents based on visibility"
  ON public.documents FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      (
        visibility = 'COMPANY_ONLY' AND
        owner_company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
      ) OR
      visibility = 'SHARED'
    )
  );

CREATE POLICY "Users can create documents in their companies"
  ON public.documents FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      owner_company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update documents in their companies"
  ON public.documents FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin') AND
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR
      owner_company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid())
    )
  );

-- LOGS POLICIES
CREATE POLICY "Users with can_view_logs can view logs"
  ON public.logs FOR SELECT
  USING ((SELECT can_view_logs FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "System can insert logs"
  ON public.logs FOR INSERT
  WITH CHECK (true);

-- Insert default master data
INSERT INTO public.master_data (type, value, label, order_index, is_default) VALUES
  ('PARTNER_CATEGORY', 'CLIENT', 'Client', 1, true),
  ('PARTNER_CATEGORY', 'SUPPLIER', 'Supplier', 2, false),
  ('PARTNER_CATEGORY', 'PARTNER', 'Partner', 3, false),
  
  ('PROJECT_STATUS', 'PLANNING', 'Planning', 1, false),
  ('PROJECT_STATUS', 'IN_PROGRESS', 'In Progress', 2, true),
  ('PROJECT_STATUS', 'ON_HOLD', 'On Hold', 3, false),
  ('PROJECT_STATUS', 'COMPLETED', 'Completed', 4, false),
  ('PROJECT_STATUS', 'CANCELLED', 'Cancelled', 5, false),
  
  ('SALES_STATUS', 'LEAD', 'Lead', 1, true),
  ('SALES_STATUS', 'QUALIFIED', 'Qualified', 2, false),
  ('SALES_STATUS', 'PROPOSAL', 'Proposal', 3, false),
  ('SALES_STATUS', 'NEGOTIATION', 'Negotiation', 4, false),
  ('SALES_STATUS', 'WON', 'Won', 5, false),
  ('SALES_STATUS', 'LOST', 'Lost', 6, false),
  
  ('COST_CATEGORY', 'LABOR', 'Labor', 1, true),
  ('COST_CATEGORY', 'MATERIAL', 'Material', 2, false),
  ('COST_CATEGORY', 'EQUIPMENT', 'Equipment', 3, false),
  ('COST_CATEGORY', 'OTHER', 'Other', 4, false),
  
  ('BUSINESS_UNIT', 'SALES', 'Sales', 1, true),
  ('BUSINESS_UNIT', 'MARKETING', 'Marketing', 2, false),
  ('BUSINESS_UNIT', 'OPERATIONS', 'Operations', 3, false),
  
  ('DOCUMENT_STATUS', 'DRAFT', 'Draft', 1, true),
  ('DOCUMENT_STATUS', 'FINAL', 'Final', 2, false),
  ('DOCUMENT_STATUS', 'ARCHIVED', 'Archived', 3, false),
  
  ('TASK_STATUS', 'PENDING', 'Pending', 1, true),
  ('TASK_STATUS', 'IN_PROGRESS', 'In Progress', 2, false),
  ('TASK_STATUS', 'COMPLETED', 'Completed', 3, false),
  ('TASK_STATUS', 'CANCELLED', 'Cancelled', 4, false);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_costs_updated_at BEFORE UPDATE ON public.costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_data_updated_at BEFORE UPDATE ON public.master_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();