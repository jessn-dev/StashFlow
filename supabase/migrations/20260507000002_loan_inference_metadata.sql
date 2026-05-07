ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS inference_confidence NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS inference_source TEXT DEFAULT 'manual'
    CHECK (inference_source IN ('inferred', 'document', 'manual'));
