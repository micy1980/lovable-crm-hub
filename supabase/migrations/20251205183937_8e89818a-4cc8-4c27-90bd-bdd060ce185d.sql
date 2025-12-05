-- Create events table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  location text,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  project_id uuid REFERENCES public.projects(id),
  sales_id uuid REFERENCES public.sales(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  responsible_user_id uuid REFERENCES public.profiles(id),
  is_all_day boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- Create event_participants table
CREATE TABLE public.event_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  external_email text,
  external_name text,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'tentative')),
  notified_at timestamp with time zone,
  responded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT participant_user_or_email CHECK (user_id IS NOT NULL OR external_email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_events_company_id ON public.events(company_id);
CREATE INDEX idx_events_project_id ON public.events(project_id);
CREATE INDEX idx_events_sales_id ON public.events(sales_id);
CREATE INDEX idx_events_created_by ON public.events(created_by);
CREATE INDEX idx_events_responsible_user_id ON public.events(responsible_user_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON public.event_participants(user_id);

-- RLS Policies for events
CREATE POLICY "Users can view events in their companies"
ON public.events FOR SELECT
USING (
  deleted_at IS NULL 
  AND is_2fa_verified(auth.uid())
  AND (
    is_super_admin(auth.uid())
    OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can create events in their companies"
ON public.events FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin')
  AND (
    is_super_admin(auth.uid())
    OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update events in their companies"
ON public.events FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('normal', 'admin', 'super_admin')
  AND (
    is_super_admin(auth.uid())
    OR company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  )
);

-- RLS Policies for event_participants
CREATE POLICY "Users can view participants of events in their companies"
ON public.event_participants FOR SELECT
USING (
  is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_participants.event_id
    AND e.deleted_at IS NULL
    AND (
      is_super_admin(auth.uid())
      OR e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage participants of events in their companies"
ON public.event_participants FOR INSERT
WITH CHECK (
  is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_participants.event_id
    AND (
      is_super_admin(auth.uid())
      OR e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update participants"
ON public.event_participants FOR UPDATE
USING (
  is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_participants.event_id
    AND (
      is_super_admin(auth.uid())
      OR e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can delete participants"
ON public.event_participants FOR DELETE
USING (
  is_2fa_verified(auth.uid())
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_participants.event_id
    AND (
      is_super_admin(auth.uid())
      OR e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_participants;