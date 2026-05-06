-- Add loan_id to documents to link them to the loan they created
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_documents_loan_id ON public.documents(loan_id);
