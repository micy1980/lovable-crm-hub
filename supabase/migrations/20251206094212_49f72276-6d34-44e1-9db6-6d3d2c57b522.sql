-- Create contracts table
CREATE TABLE public.contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    sales_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
    
    -- Basic info
    title text NOT NULL,
    contract_number text,
    contract_type text, -- from master_data
    description text,
    
    -- Dates
    signed_date date,
    effective_date date,
    expiry_date date,
    termination_notice_days integer DEFAULT 30,
    auto_renewal boolean DEFAULT false,
    renewal_period_months integer,
    
    -- Financial
    total_value numeric,
    currency text DEFAULT 'HUF',
    payment_frequency text, -- 'monthly', 'quarterly', 'annually', 'one_time'
    payment_day integer, -- day of month
    billing_start_date date,
    
    -- Status
    status text DEFAULT 'draft', -- 'draft', 'active', 'expired', 'terminated', 'renewed'
    
    -- Notifications
    expiry_warning_days integer DEFAULT 30,
    termination_warning_days integer DEFAULT 60,
    renewal_warning_days integer DEFAULT 45,
    
    -- Access control (like partners)
    restrict_access boolean DEFAULT false,
    
    -- Metadata
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Create contract versions table for version tracking
CREATE TABLE public.contract_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    version_number integer NOT NULL DEFAULT 1,
    
    -- Version details
    title text NOT NULL,
    description text,
    change_summary text,
    
    -- File
    file_path text,
    file_size integer,
    mime_type text,
    
    -- Metadata
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

-- Create contract user access table (like partner_user_access)
CREATE TABLE public.contract_user_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(contract_id, user_id)
);

-- Create indexes
CREATE INDEX idx_contracts_owner_company ON public.contracts(owner_company_id);
CREATE INDEX idx_contracts_partner ON public.contracts(partner_id);
CREATE INDEX idx_contracts_expiry ON public.contracts(expiry_date);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contract_versions_contract ON public.contract_versions(contract_id);
CREATE INDEX idx_contract_user_access_contract ON public.contract_user_access(contract_id);
CREATE INDEX idx_contract_user_access_user ON public.contract_user_access(user_id);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_user_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contracts
CREATE POLICY "Users can view contracts with access check"
ON public.contracts FOR SELECT
USING (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR (
            owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
            AND (
                restrict_access = false
                OR restrict_access IS NULL
                OR EXISTS (
                    SELECT 1 FROM contract_user_access cua
                    WHERE cua.contract_id = contracts.id AND cua.user_id = auth.uid()
                )
                OR is_admin_or_above(auth.uid())
            )
        )
    )
);

CREATE POLICY "Admins can insert contracts"
ON public.contracts FOR INSERT
WITH CHECK (
    is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Admins can update contracts"
ON public.contracts FOR UPDATE
USING (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
)
WITH CHECK (
    deleted_at IS NULL
    AND is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
);

-- RLS Policies for contract_versions
CREATE POLICY "Users can view contract versions"
ON public.contract_versions FOR SELECT
USING (
    is_2fa_verified(auth.uid())
    AND EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.id = contract_versions.contract_id
        AND c.deleted_at IS NULL
        AND (
            is_super_admin(auth.uid())
            OR (
                c.owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
                AND (
                    c.restrict_access = false
                    OR c.restrict_access IS NULL
                    OR EXISTS (SELECT 1 FROM contract_user_access cua WHERE cua.contract_id = c.id AND cua.user_id = auth.uid())
                    OR is_admin_or_above(auth.uid())
                )
            )
        )
    )
);

CREATE POLICY "Admins can insert contract versions"
ON public.contract_versions FOR INSERT
WITH CHECK (
    is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.id = contract_versions.contract_id
        AND (
            is_super_admin(auth.uid())
            OR c.owner_company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
        )
    )
);

-- RLS Policies for contract_user_access
CREATE POLICY "Admins can manage contract access"
ON public.contract_user_access FOR ALL
USING (
    is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
)
WITH CHECK (
    is_2fa_verified(auth.uid())
    AND is_admin_or_above(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can view contract access records"
ON public.contract_user_access FOR SELECT
USING (
    is_2fa_verified(auth.uid())
    AND (
        is_super_admin(auth.uid())
        OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
);

-- Soft delete function for contracts
CREATE OR REPLACE FUNCTION public.soft_delete_contract(_contract_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id uuid;
    _contract_company_id uuid;
BEGIN
    _user_id := auth.uid();
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF NOT is_2fa_verified(_user_id) THEN
        RAISE EXCEPTION '2FA verification required';
    END IF;
    
    SELECT owner_company_id INTO _contract_company_id
    FROM public.contracts
    WHERE id = _contract_id AND deleted_at IS NULL;
    
    IF _contract_company_id IS NULL THEN
        RAISE EXCEPTION 'Contract not found or already deleted';
    END IF;
    
    IF NOT is_super_admin(_user_id) AND NOT is_admin(_user_id) THEN
        RAISE EXCEPTION 'Permission denied: only admins can delete contracts';
    END IF;
    
    IF NOT is_super_admin(_user_id) AND NOT EXISTS (
        SELECT 1 FROM user_companies uc WHERE uc.user_id = _user_id AND uc.company_id = _contract_company_id
    ) THEN
        RAISE EXCEPTION 'Permission denied: not a member of this company';
    END IF;
    
    UPDATE public.contracts
    SET deleted_at = now(), updated_at = now()
    WHERE id = _contract_id AND deleted_at IS NULL;
    
    RETURN true;
END;
$$;

-- Add contract types to master_data
INSERT INTO public.master_data (type, value, label, order_index) VALUES
    ('contract_type', 'service', 'Szolgáltatási szerződés', 1),
    ('contract_type', 'purchase', 'Vásárlási szerződés', 2),
    ('contract_type', 'lease', 'Bérleti szerződés', 3),
    ('contract_type', 'maintenance', 'Karbantartási szerződés', 4),
    ('contract_type', 'license', 'Licenc szerződés', 5),
    ('contract_type', 'consulting', 'Tanácsadói szerződés', 6),
    ('contract_type', 'nda', 'Titoktartási megállapodás', 7),
    ('contract_type', 'other', 'Egyéb', 99);

-- Add payment frequency to master_data
INSERT INTO public.master_data (type, value, label, order_index) VALUES
    ('payment_frequency', 'one_time', 'Egyszeri', 1),
    ('payment_frequency', 'monthly', 'Havi', 2),
    ('payment_frequency', 'quarterly', 'Negyedéves', 3),
    ('payment_frequency', 'semi_annually', 'Féléves', 4),
    ('payment_frequency', 'annually', 'Éves', 5);