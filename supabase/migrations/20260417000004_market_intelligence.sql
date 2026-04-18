-- Milestone 17: Market Intelligence Layer
-- -----------------------------------------------------------------------------

-- 1. Market Trends Table
-- Stores macroeconomic data (CPI, Inflation, Interest Rates)
CREATE TABLE public.market_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id TEXT NOT NULL, -- FRED Series ID (e.g., 'CPIAUCSL')
  series_name TEXT NOT NULL,
  category expense_category, -- Optional link to our internal categories
  value DECIMAL NOT NULL,
  period DATE NOT NULL, -- The month/day of the data point
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, period)
);

-- 2. RLS Policies
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Market trends are readable by everyone" ON public.market_trends 
FOR SELECT TO authenticated USING (true);

-- 3. Initial Seeding of Series IDs to track
-- CPIAUCSL: Consumer Price Index (General Inflation)
-- CUSR0000SAF11: Food at home (Groceries)
-- CUSR0000SAH1: Housing
-- CUSR0000SAT: Transportation
-- CUSR0000SEHF01: Electricity
