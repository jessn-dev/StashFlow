-- Create a unified view for all transactions (incomes and expenses)
-- This view uses security_invoker=true to respect RLS policies of the underlying tables.
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
  created_at
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
  created_at
FROM public.expenses;

-- Add comment for documentation
COMMENT ON VIEW public.unified_transactions IS 'Unified timeline of all financial transactions (incomes and expenses).';
