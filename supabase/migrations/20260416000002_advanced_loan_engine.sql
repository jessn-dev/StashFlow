-- 1. Custom Types for Advanced Loans
CREATE TYPE loan_commercial_category AS ENUM (
  'Asset-Backed', 
  'Personal / Cash', 
  'Statutory / Government', 
  'Educational', 
  'Specialized Retail'
);

CREATE TYPE loan_interest_type AS ENUM (
  'Standard Amortized', 
  'Interest-Only', 
  'Add-on Interest', 
  'Fixed Principal'
);

CREATE TYPE loan_interest_basis AS ENUM (
  '30/360', 
  'Actual/360', 
  'Actual/365'
);

-- 2. Update Loans Table
ALTER TABLE public.loans 
ADD COLUMN country_code TEXT DEFAULT 'US',
ADD COLUMN commercial_category loan_commercial_category DEFAULT 'Personal / Cash',
ADD COLUMN interest_type loan_interest_type DEFAULT 'Standard Amortized',
ADD COLUMN interest_basis loan_interest_basis DEFAULT 'Actual/365',
ADD COLUMN payment_start_date DATE,
ADD COLUMN effective_interest_rate NUMERIC(5, 2);

-- Set payment_start_date default to start_date for existing records
UPDATE public.loans SET payment_start_date = start_date WHERE payment_start_date IS NULL;

-- 3. Loan Fees Table
CREATE TABLE public.loan_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_financed BOOLEAN DEFAULT FALSE, -- Added to principal
  is_recurring BOOLEAN DEFAULT FALSE, -- Added to monthly due
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS Policies
ALTER TABLE public.loan_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own loan fees" ON public.loan_fees FOR ALL USING (auth.uid() = user_id);
