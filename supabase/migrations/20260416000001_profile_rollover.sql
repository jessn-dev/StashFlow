-- Add global rollover toggle to profiles
ALTER TABLE public.profiles 
ADD COLUMN global_rollover_enabled BOOLEAN DEFAULT FALSE;
