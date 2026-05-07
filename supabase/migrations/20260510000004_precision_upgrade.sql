-- P2-C: Upgrade financial amount columns from NUMERIC(12,2) to NUMERIC(18,6).
-- Rationale: NUMERIC(12,2) truncates sub-cent values from FX conversions and
-- interest calculations. NUMERIC(18,6) supports up to 999,999,999,999.999999 —
-- adequate for all supported currencies including PHP (large nominal amounts).
-- Interest rate columns upgraded to NUMERIC(8,4) (percentage precision).
-- No data loss: widening a NUMERIC column never discards existing values.
-- After applying, regenerate TS types: pnpm gen:types

-- ── incomes ─────────────────────────────────────────────────────────────────
ALTER TABLE public.incomes
  ALTER COLUMN amount TYPE NUMERIC(18, 6);

-- ── expenses ────────────────────────────────────────────────────────────────
ALTER TABLE public.expenses
  ALTER COLUMN amount TYPE NUMERIC(18, 6);

-- ── loans ───────────────────────────────────────────────────────────────────
ALTER TABLE public.loans
  ALTER COLUMN principal          TYPE NUMERIC(18, 6),
  ALTER COLUMN installment_amount TYPE NUMERIC(18, 6),
  ALTER COLUMN interest_rate      TYPE NUMERIC(8, 4),
  ALTER COLUMN effective_interest_rate TYPE NUMERIC(8, 4);

-- ── loan_payments ────────────────────────────────────────────────────────────
ALTER TABLE public.loan_payments
  ALTER COLUMN amount_paid TYPE NUMERIC(18, 6);

-- ── exchange_rates ───────────────────────────────────────────────────────────
-- Already NUMERIC(10,6) — extend to match the 18-digit standard.
ALTER TABLE public.exchange_rates
  ALTER COLUMN rate TYPE NUMERIC(18, 6);

-- ── budgets ──────────────────────────────────────────────────────────────────
ALTER TABLE public.budgets
  ALTER COLUMN amount TYPE NUMERIC(18, 6);

-- ── budget_periods ───────────────────────────────────────────────────────────
ALTER TABLE public.budget_periods
  ALTER COLUMN budgeted           TYPE NUMERIC(18, 6),
  ALTER COLUMN spent              TYPE NUMERIC(18, 6),
  ALTER COLUMN rolled_over_amount TYPE NUMERIC(18, 6);

-- ── goals ────────────────────────────────────────────────────────────────────
ALTER TABLE public.goals
  ALTER COLUMN target_amount  TYPE NUMERIC(18, 6),
  ALTER COLUMN current_amount TYPE NUMERIC(18, 6);
