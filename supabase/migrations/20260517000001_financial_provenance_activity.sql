-- Add provenance and source_document_id to financial activity tables
-- This enables the "Financial Provenance" visibility requirement (Audit Trail)

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS provenance JSONB,
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS provenance JSONB,
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_source_document_id ON public.expenses(source_document_id);
CREATE INDEX IF NOT EXISTS idx_incomes_source_document_id ON public.incomes(source_document_id);

-- Add comments
COMMENT ON COLUMN public.expenses.provenance IS 'Metadata linking the expense back to its source snippet/page in a document.';
COMMENT ON COLUMN public.incomes.provenance IS 'Metadata linking the income back to its source snippet/page in a document.';

-- Update the unified view to include new columns
CREATE OR REPLACE VIEW public.unified_transactions WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  amount,
  currency,
  source AS description,
  date,
  notes,
  'income'::text AS type,
  NULL::expense_category AS category,
  created_at,
  provenance,
  source_document_id
FROM public.incomes
UNION ALL
SELECT
  id,
  user_id,
  amount,
  currency,
  description,
  date,
  notes,
  'expense'::text AS type,
  category,
  created_at,
  provenance,
  source_document_id
FROM public.expenses;
