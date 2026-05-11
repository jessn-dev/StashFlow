-- Add content_hash to documents for idempotency
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON public.documents(content_hash);

-- Add a comment
COMMENT ON COLUMN public.documents.content_hash IS 'SHA-256 hash of the file content to prevent duplicate ingestion.';
