-- 1. Update Profiles with Budgeting Settings
ALTER TABLE public.profiles 
ADD COLUMN budgeting_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN rollover_start_month TEXT; -- Format: YYYY-MM

-- 2. Baseline Budgets Table
CREATE TABLE public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category expense_category NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  rollover_enabled BOOLEAN DEFAULT TRUE,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- 3. Monthly Budget Periods (Snapshots)
CREATE TABLE public.budget_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category expense_category NOT NULL,
  period TEXT NOT NULL, -- Format: YYYY-MM
  budgeted NUMERIC(12, 2) NOT NULL DEFAULT 0,
  spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  rolled_over_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, period)
);

-- 4. Goals Table
CREATE TYPE goal_type AS ENUM ('savings', 'debt');

CREATE TABLE public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  type goal_type NOT NULL DEFAULT 'savings',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own budget periods" ON public.budget_periods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
