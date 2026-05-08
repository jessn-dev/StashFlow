-- P3-C: Ledger Integrity and FX Feed Updates

-- 1. Add signature columns to ledger tables
ALTER TABLE public.incomes ADD COLUMN signature TEXT NOT NULL DEFAULT '';
ALTER TABLE public.expenses ADD COLUMN signature TEXT NOT NULL DEFAULT '';

-- 2. Update exchange_rates table constraint
-- Current constraint might be just on 'target', we need 'base, target' uniqueness for multi-base support
ALTER TABLE public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_base_target_key;
ALTER TABLE public.exchange_rates ADD CONSTRAINT exchange_rates_base_target_key UNIQUE (base, target);

-- 3. (Optional/Deferred) Add index for faster ledger verification
CREATE INDEX IF NOT EXISTS idx_incomes_created_at_desc ON public.incomes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at_desc ON public.expenses (created_at DESC);
