-- P1-B: Replace FOR ALL blanket policies with explicit per-operation policies + WITH CHECK
-- FOR ALL with no WITH CHECK allows users to insert/update rows with any user_id value.
-- Explicit policies enforce ownership at both read AND write time.

-- ─── incomes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own incomes" ON public.incomes;

CREATE POLICY "incomes_select_own" ON public.incomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "incomes_insert_own" ON public.incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes_update_own" ON public.incomes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes_delete_own" ON public.incomes
  FOR DELETE USING (auth.uid() = user_id);

-- ─── expenses ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;

CREATE POLICY "expenses_select_own" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ─── loans ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own loans" ON public.loans;

CREATE POLICY "loans_select_own" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "loans_insert_own" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loans_update_own" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loans_delete_own" ON public.loans
  FOR DELETE USING (auth.uid() = user_id);

-- ─── loan_payments ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own loan payments" ON public.loan_payments;

CREATE POLICY "loan_payments_select_own" ON public.loan_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "loan_payments_insert_own" ON public.loan_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loan_payments_update_own" ON public.loan_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loan_payments_delete_own" ON public.loan_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ─── loan_fees ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own loan fees" ON public.loan_fees;

CREATE POLICY "loan_fees_select_own" ON public.loan_fees
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "loan_fees_insert_own" ON public.loan_fees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loan_fees_update_own" ON public.loan_fees
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "loan_fees_delete_own" ON public.loan_fees
  FOR DELETE USING (auth.uid() = user_id);

-- ─── goals ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;

CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- ─── budgets ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;

CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- ─── budget_periods ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own budget periods" ON public.budget_periods;

CREATE POLICY "budget_periods_select_own" ON public.budget_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "budget_periods_insert_own" ON public.budget_periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_periods_update_own" ON public.budget_periods
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budget_periods_delete_own" ON public.budget_periods
  FOR DELETE USING (auth.uid() = user_id);

-- ─── documents ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;

CREATE POLICY "documents_select_own" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "documents_insert_own" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- ─── category_metadata ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own category metadata" ON public.category_metadata;

CREATE POLICY "category_metadata_select_own" ON public.category_metadata
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "category_metadata_insert_own" ON public.category_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "category_metadata_update_own" ON public.category_metadata
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "category_metadata_delete_own" ON public.category_metadata
  FOR DELETE USING (auth.uid() = user_id);
