ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'success', 'error_rate_limit', 'error_generic'));

-- Required for realtime row-level filtering to work correctly
ALTER TABLE public.documents REPLICA IDENTITY FULL;

-- Add documents to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
