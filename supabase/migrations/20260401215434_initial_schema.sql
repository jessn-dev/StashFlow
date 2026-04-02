-- 1. Custom Types (Enums)
CREATE TYPE expense_category AS ENUM ('housing', 'food', 'transport', 'utilities', 'healthcare', 'entertainment', 'education', 'personal', 'other');
CREATE TYPE loan_status AS ENUM ('active', 'completed', 'defaulted');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE income_frequency AS ENUM ('one-time', 'weekly', 'monthly');

-- 2. Profiles Table (Extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Incomes Table
CREATE TABLE public.incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  source TEXT NOT NULL,
  frequency income_frequency DEFAULT 'one-time',
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Expenses Table
CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Loans Table
CREATE TABLE public.loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  principal NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  installment_amount NUMERIC(12, 2) NOT NULL,
  status loan_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Loan Payments Table
CREATE TABLE public.loan_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount_paid NUMERIC(12, 2),
  due_date DATE NOT NULL,
  paid_date DATE,
  status payment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Exchange Rates Cache Table (Global, Read-Only for Users)
CREATE TABLE public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base TEXT NOT NULL,
  target TEXT NOT NULL,
  rate NUMERIC(10, 6) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base, target)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Incomes: Strictly isolated to the user
CREATE POLICY "Users can manage own incomes" ON public.incomes FOR ALL USING (auth.uid() = user_id);

-- Expenses: Strictly isolated to the user
CREATE POLICY "Users can manage own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id);

-- Loans: Strictly isolated to the user
CREATE POLICY "Users can manage own loans" ON public.loans FOR ALL USING (auth.uid() = user_id);

-- Loan Payments: Strictly isolated to the user
CREATE POLICY "Users can manage own loan payments" ON public.loan_payments FOR ALL USING (auth.uid() = user_id);

-- Exchange Rates: Anyone authenticated can read, ONLY Service Role can update/insert
CREATE POLICY "Authenticated users can read rates" ON public.exchange_rates FOR SELECT TO authenticated USING (true);