-- Add currency column to market_trends
ALTER TABLE public.market_trends 
ADD COLUMN currency TEXT DEFAULT 'USD';

-- Optional: Update existing rows to USD if any
UPDATE public.market_trends SET currency = 'USD' WHERE currency IS NULL;
