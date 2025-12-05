-- Add color fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS task_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS event_color text DEFAULT NULL;

-- Add personal color fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personal_task_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS personal_event_color text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.task_color IS 'Color for tasks in this project (e.g., blue, green, orange)';
COMMENT ON COLUMN public.projects.event_color IS 'Color for events in this project (e.g., violet, pink, cyan)';
COMMENT ON COLUMN public.profiles.personal_task_color IS 'Color for personal tasks without project';
COMMENT ON COLUMN public.profiles.personal_event_color IS 'Color for personal events without project';