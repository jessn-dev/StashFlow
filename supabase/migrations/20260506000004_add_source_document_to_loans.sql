-- Add source_document_id to loans to link them to the document they were extracted from
-- This supports the many-to-one relationship (one document can create many loans)
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_loans_source_document_id ON public.loans(source_document_id);

-- Add comment
COMMENT ON COLUMN public.loans.source_document_id IS 'Link to the document record this loan was extracted from.';
