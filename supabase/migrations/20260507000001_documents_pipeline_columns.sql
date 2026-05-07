-- Track which tier of the extraction pipeline produced the result
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extraction_source text
    CHECK (extraction_source IN ('pdfjs', 'vision', 'ai', 'manual')),
  ADD COLUMN IF NOT EXISTS processing_error jsonb,
  ADD COLUMN IF NOT EXISTS processing_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_processed_at timestamptz;
