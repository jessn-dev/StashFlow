-- Budget Automation: Triggers for Period Management
-- -----------------------------------------------------------------------------

-- 1. Function to ensure budget_period exists and update it
CREATE OR REPLACE FUNCTION public.sync_budget_period()
RETURNS TRIGGER AS $$
DECLARE
  current_period TEXT := to_char(NEW.date, 'YYYY-MM');
  v_user_id UUID := NEW.user_id;
  v_category public.expense_category := NEW.category;
  v_budget_amount NUMERIC(12, 2) := 0;
BEGIN
  -- Get baseline budget amount
  SELECT amount INTO v_budget_amount 
  FROM public.budgets 
  WHERE user_id = v_user_id AND category = v_category;

  -- Upsert period snapshot
  INSERT INTO public.budget_periods (user_id, category, period, budgeted, spent)
  VALUES (v_user_id, v_category, current_period, COALESCE(v_budget_amount, 0), NEW.amount)
  ON CONFLICT (user_id, category, period) 
  DO UPDATE SET 
    spent = (
      SELECT SUM(amount) FROM public.expenses 
      WHERE user_id = EXCLUDED.user_id 
      AND category = EXCLUDED.category 
      AND to_char(date, 'YYYY-MM') = EXCLUDED.period
    ),
    budgeted = COALESCE(v_budget_amount, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on Expenses
DROP TRIGGER IF EXISTS tr_sync_budget_on_expense ON public.expenses;
CREATE TRIGGER tr_sync_budget_on_expense
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.sync_budget_period();

-- 3. Function to sync when baseline budget changes
CREATE OR REPLACE FUNCTION public.sync_baseline_to_periods()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.budget_periods
  SET budgeted = NEW.amount
  WHERE user_id = NEW.user_id AND category = NEW.category AND period = to_char(NOW(), 'YYYY-MM');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on Budgets baseline
DROP TRIGGER IF EXISTS tr_sync_baseline_to_periods ON public.budgets;
CREATE TRIGGER tr_sync_baseline_to_periods
AFTER INSERT OR UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.sync_baseline_to_periods();
