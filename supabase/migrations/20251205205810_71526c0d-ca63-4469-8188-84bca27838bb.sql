-- Add is_all_day column to tasks table
ALTER TABLE public.tasks
ADD COLUMN is_all_day boolean DEFAULT false;