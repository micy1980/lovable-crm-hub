-- =====================================================
-- 1. CREATE company_licenses TABLE
-- =====================================================

CREATE TABLE public.company_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  license_type text NOT NULL,
  max_users integer NOT NULL CHECK (max_users > 0),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id),
  CONSTRAINT valid_date_range CHECK (valid_until > valid_from)
);

-- Enable RLS
ALTER TABLE public.company_licenses ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_company_licenses_updated_at
  BEFORE UPDATE ON public.company_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. LICENSE HELPER FUNCTIONS
-- =====================================================

-- Check if company has an effective license
CREATE OR REPLACE FUNCTION public.is_company_license_effective(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_licenses cl
    WHERE cl.company_id = _company_id
      AND cl.is_active = true
      AND now() >= cl.valid_from
      AND now() <= cl.valid_until
  );
$$;

-- Count used seats for a company (ADMIN and NORMAL roles only, excluding SA)
CREATE OR REPLACE FUNCTION public.get_company_used_seats(_company_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(DISTINCT ucp.user_id)::integer
  FROM public.user_company_permissions ucp
  JOIN public.profiles p ON p.id = ucp.user_id
  WHERE ucp.company_id = _company_id
    AND ucp.role IN ('ADMIN', 'NORMAL')
    AND p.is_active = true
    AND p.role <> 'super_admin';
$$;

-- Check if a company can add another seat
CREATE OR REPLACE FUNCTION public.can_add_seat(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    is_company_license_effective(_company_id)
    AND get_company_used_seats(_company_id) <
        (SELECT max_users FROM public.company_licenses WHERE company_id = _company_id);
$$;

-- =====================================================
-- 3. ENFORCEMENT TRIGGERS
-- =====================================================

-- 3.A: Trigger on user_company_permissions to check seat limits
CREATE OR REPLACE FUNCTION public.check_company_license_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_role user_role;
  _is_active boolean;
  _will_consume_seat boolean := false;
  _current_seats integer;
  _max_seats integer;
  _has_effective_license boolean;
BEGIN
  -- Get user profile info
  SELECT role, is_active INTO _user_role, _is_active
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Skip check for super_admin
  IF _user_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Determine if this operation will consume a seat
  IF TG_OP = 'INSERT' THEN
    -- INSERT: check if new role will consume a seat
    IF NEW.role IN ('ADMIN', 'NORMAL') AND _is_active = true THEN
      _will_consume_seat := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- UPDATE: check if transitioning to a seat-consuming role
    IF OLD.role = 'VIEWER' AND NEW.role IN ('ADMIN', 'NORMAL') AND _is_active = true THEN
      _will_consume_seat := true;
    ELSIF NEW.role IN ('ADMIN', 'NORMAL') AND _is_active = true AND OLD.role IN ('ADMIN', 'NORMAL') THEN
      -- Already consuming a seat, no additional check needed
      _will_consume_seat := false;
    END IF;
  END IF;

  -- If a seat will be consumed, check license
  IF _will_consume_seat THEN
    -- Check if company has effective license
    _has_effective_license := is_company_license_effective(NEW.company_id);
    
    IF NOT _has_effective_license THEN
      RAISE EXCEPTION 'A vállalat licenc limitje túllépésre kerülne vagy nincs érvényes licenc.';
    END IF;

    -- Get current seat usage and max seats
    SELECT max_users INTO _max_seats
    FROM public.company_licenses
    WHERE company_id = NEW.company_id;

    -- Count seats after this operation (optimistically include this user)
    SELECT count(DISTINCT ucp.user_id)::integer INTO _current_seats
    FROM public.user_company_permissions ucp
    JOIN public.profiles p ON p.id = ucp.user_id
    WHERE ucp.company_id = NEW.company_id
      AND ucp.role IN ('ADMIN', 'NORMAL')
      AND p.is_active = true
      AND p.role <> 'super_admin'
      AND (ucp.user_id != NEW.user_id OR ucp.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid));

    -- Add 1 for the new/updated row
    _current_seats := _current_seats + 1;

    IF _current_seats > _max_seats THEN
      RAISE EXCEPTION 'A vállalat licenc limitje túllépésre kerülne vagy nincs érvényes licenc.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_company_license_seat_limit
  BEFORE INSERT OR UPDATE ON public.user_company_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_company_license_seat_limit();

-- 3.B: Trigger on profiles to check license when activating users
CREATE OR REPLACE FUNCTION public.check_license_on_activate_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_record record;
  _current_seats integer;
  _max_seats integer;
  _has_effective_license boolean;
BEGIN
  -- Only check when activating a user (false -> true)
  IF NEW.is_active = true AND OLD.is_active = false AND NEW.role <> 'super_admin' THEN
    -- Check each company where user has ADMIN or NORMAL role
    FOR _company_record IN
      SELECT DISTINCT company_id
      FROM public.user_company_permissions
      WHERE user_id = NEW.id
        AND role IN ('ADMIN', 'NORMAL')
    LOOP
      -- Check if company has effective license
      _has_effective_license := is_company_license_effective(_company_record.company_id);
      
      IF NOT _has_effective_license THEN
        RAISE EXCEPTION 'Nem aktiválható a felhasználó, mert az egyik vállalat licenc limitje túllépésre kerülne vagy nincs érvényes licenc.';
      END IF;

      -- Get max seats for company
      SELECT max_users INTO _max_seats
      FROM public.company_licenses
      WHERE company_id = _company_record.company_id;

      -- Count current seats excluding this user
      SELECT count(DISTINCT ucp.user_id)::integer INTO _current_seats
      FROM public.user_company_permissions ucp
      JOIN public.profiles p ON p.id = ucp.user_id
      WHERE ucp.company_id = _company_record.company_id
        AND ucp.role IN ('ADMIN', 'NORMAL')
        AND p.is_active = true
        AND p.role <> 'super_admin'
        AND p.id != NEW.id;

      -- Add 1 for the user being activated
      _current_seats := _current_seats + 1;

      IF _current_seats > _max_seats THEN
        RAISE EXCEPTION 'Nem aktiválható a felhasználó, mert az egyik vállalat licenc limitje túllépésre kerülne vagy nincs érvényes licenc.';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_license_on_activate_user
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_license_on_activate_user();

-- =====================================================
-- 4. RLS POLICIES FOR company_licenses
-- =====================================================

-- SA can manage all licenses
CREATE POLICY "SA can manage all company licenses"
ON public.company_licenses
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Company admins can view their own license
CREATE POLICY "Company admins can view their own license"
ON public.company_licenses
FOR SELECT
TO authenticated
USING (is_company_admin(auth.uid(), company_id));