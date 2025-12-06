-- Add partner_id column to projects table
ALTER TABLE public.projects 
ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_projects_partner_id ON public.projects(partner_id);