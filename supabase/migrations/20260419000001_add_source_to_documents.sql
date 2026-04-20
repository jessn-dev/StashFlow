-- Add source column to documents to track upload platform
ALTER TABLE public.documents 
ADD COLUMN source TEXT DEFAULT 'web' CHECK (source IN ('web', 'mobile'));
