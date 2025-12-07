-- Add recurring fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN occurrence_date DATE;

-- Add recurring fields to events table
ALTER TABLE public.events
ADD COLUMN recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN parent_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
ADD COLUMN occurrence_date DATE;

-- Create indexes for faster recurrence queries
CREATE INDEX idx_tasks_recurrence ON public.tasks(recurrence_type) WHERE recurrence_type IS NOT NULL AND recurrence_type != 'none';
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_events_recurrence ON public.events(recurrence_type) WHERE recurrence_type IS NOT NULL AND recurrence_type != 'none';
CREATE INDEX idx_events_parent ON public.events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- Update existing rows to have 'none' as default
UPDATE public.tasks SET recurrence_type = 'none' WHERE recurrence_type IS NULL;
UPDATE public.events SET recurrence_type = 'none' WHERE recurrence_type IS NULL;