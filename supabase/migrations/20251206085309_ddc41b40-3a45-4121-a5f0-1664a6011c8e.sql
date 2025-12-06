-- Add partner_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN partner_id uuid REFERENCES public.partners(id);

-- Add partner_id column to events table
ALTER TABLE public.events
ADD COLUMN partner_id uuid REFERENCES public.partners(id);

-- Create indexes for better query performance
CREATE INDEX idx_tasks_partner_id ON public.tasks(partner_id);
CREATE INDEX idx_events_partner_id ON public.events(partner_id);