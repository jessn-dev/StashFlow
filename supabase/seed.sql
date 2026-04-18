-- Seed Data for StashFlow
-- -----------------------------------------------------------------------------
-- Run with: pnpm supabase db reset
-- Test credentials: test@stashflow.com / password123
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000000';
  
  -- Loan IDs
  active_mortgage_id   uuid := gen_random_uuid();
  student_loan_id      uuid := gen_random_uuid();
  auto_loan_id         uuid := gen_random_uuid();
  personal_loan_id     uuid := gen_random_uuid();
  delinquent_loan_id   uuid := gen_random_uuid();
  high_interest_id     uuid := gen_random_uuid();
  pagibig_loan_id      uuid := gen_random_uuid();
  hdb_loan_id          uuid := gen_random_uuid();
  sme_loan_id          uuid := gen_random_uuid();
  euro_biz_loan_id     uuid := gen_random_uuid();
  euro_bridge_loan_id  uuid := gen_random_uuid();
  jhf_loan_id          uuid := gen_random_uuid();
  jp_biz_loan_id       uuid := gen_random_uuid();
  guarantor_loan_id    uuid := gen_random_uuid();
  joint_loan_id        uuid := gen_random_uuid();
  zero_interest_id     uuid := gen_random_uuid();
  one_month_loan_id    uuid := gen_random_uuid();
BEGIN

-- 1. Create a test user in auth.users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  test_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test@stashflow.com',
  crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test User"}',
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Profile
INSERT INTO public.profiles (id, email, full_name, preferred_currency, budgeting_enabled, rollover_start_month)
VALUES (test_user_id, 'test@stashflow.com', 'Test User', 'USD', TRUE, '2026-04')
ON CONFLICT (id) DO UPDATE SET budgeting_enabled = TRUE, rollover_start_month = '2026-04';

-- 3. Incomes (Diverse frequencies and currencies)
INSERT INTO public.incomes (user_id, amount, currency, source, frequency, date)
VALUES
  -- Fixed Monthly Inflows
  (test_user_id, 3000.00,  'USD', 'Main Salary (Bi-weekly P1)', 'weekly',   '2026-04-01'), -- Using weekly as proxy for bi-weekly since enum is limited
  (test_user_id, 3000.00,  'USD', 'Main Salary (Bi-weekly P2)', 'weekly',   '2026-04-15'),
  (test_user_id, 1500.00,  'USD', 'Freelance Project',         'monthly',  '2026-04-28'),
  (test_user_id, 25000.00, 'PHP', 'Online Selling (PHP)',      'monthly',  '2026-04-05'),
  (test_user_id, 500.00,   'SGD', 'Part-time SGD',             'monthly',  '2026-04-10'),
  -- Scenario Testing: Irregular/Fluctuating
  (test_user_id, 2000.00,  'USD', 'Annual Bonus',              'one-time', '2026-06-15');

-- 4. Expenses (Diverse categories, frequencies, and currencies)
INSERT INTO public.expenses (user_id, amount, currency, category, description, date, is_recurring)
VALUES 
  -- Fixed Monthly Outflows
  (test_user_id, 1800.00, 'USD', 'housing',     'Rent',              '2026-04-01', TRUE),
  (test_user_id, 2200.00, 'USD', 'housing',     'Mortgage Payment',  '2026-04-03', TRUE),
  (test_user_id, 15.99,   'USD', 'entertainment', 'Netflix',          '2026-04-10', TRUE),
  (test_user_id, 10.00,   'USD', 'entertainment', 'Spotify',          '2026-04-10', TRUE),
  (test_user_id, 14.99,   'USD', 'entertainment', 'Amazon Prime',     '2026-04-10', TRUE),
  
  -- Irregular / Variable
  (test_user_id, 150.00,  'USD', 'food',        'Groceries Week 1',  '2026-04-05', FALSE),
  (test_user_id, 120.00,  'USD', 'food',        'Groceries Week 2',  '2026-04-12', FALSE),
  (test_user_id, 180.00,  'USD', 'food',        'Groceries Week 3',  '2026-04-19', FALSE),
  (test_user_id, 140.00,  'USD', 'food',        'Groceries Week 4',  '2026-04-26', FALSE),
  
  -- Seasonal Utilities
  (test_user_id, 200.00,  'USD', 'utilities',   'Electricity (Summer)', '2026-04-15', TRUE),
  (test_user_id, 80.00,   'USD', 'utilities',   'Water Bill',           '2026-04-15', TRUE),
  
  -- Healthcare
  (test_user_id, 50.00,   'USD', 'healthcare',  'Monthly Prescription', '2026-04-20', TRUE),
  (test_user_id, 250.00,  'USD', 'healthcare',  'Dental Checkup',       '2026-05-10', FALSE),
  
  -- Scenario Testing: Large annual payment
  (test_user_id, 1200.00, 'USD', 'personal',    'Annual Insurance',     '2026-08-01', FALSE),
  
  -- Multi-currency expenses
  (test_user_id, 5000.00, 'PHP', 'transport',   'Grab/Taxi (PHP)',      '2026-04-10', FALSE),
  (test_user_id, 20.00,   'EUR', 'food',        'Dining in Paris (EUR)','2026-04-12', FALSE);

-- 5. Diverse Loans scenarios

-- Active Mortgage (30-year term)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (active_mortgage_id, test_user_id, 'Primary Residence', 450000.00, 'USD', 4.25, 360, '2025-01-01', '2055-01-01', 2212.00, 'active', 'Asset-Backed', 'US');

-- Student Loan (Graduated)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (student_loan_id, test_user_id, 'University Debt', 35000.00, 'USD', 6.8, 120, '2023-01-01', '2033-01-01', 402.00, 'active', 'Educational', 'US');

-- Auto Loan (Active)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (auto_loan_id, test_user_id, 'Tesla Model 3', 45000.00, 'USD', 2.9, 60, '2026-01-01', '2031-01-01', 806.00, 'active', 'Asset-Backed', 'US');

-- Personal Loan (Paid-off)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category)
VALUES (personal_loan_id, test_user_id, 'Old Wedding Loan', 15000.00, 'USD', 8.0, 24, '2024-01-01', '2026-01-01', 678.00, 'completed', 'Personal / Cash');

-- Personal Loan (Delinquent)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category)
VALUES (delinquent_loan_id, test_user_id, 'Late Credit Line', 5000.00, 'USD', 18.0, 12, '2026-01-01', '2027-01-01', 458.00, 'active', 'Personal / Cash');

-- High Interest Loan (Avalanche Testing)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category)
VALUES (high_interest_id, test_user_id, 'High-Interest Credit Card', 8000.00, 'USD', 26.5, 24, '2026-02-01', '2028-02-01', 432.00, 'active', 'Personal / Cash');

-- PagIBIG Housing Loan (Philippines)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (pagibig_loan_id, test_user_id, 'Condo Unit (PagIBIG)', 2500000.00, 'PHP', 6.375, 240, '2026-03-01', '2046-03-01', 18458.00, 'active', 'Statutory / Government', 'PH');

-- HDB Loan (Singapore)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (hdb_loan_id, test_user_id, 'HDB Flat Loan', 350000.00, 'SGD', 2.6, 300, '2026-01-01', '2051-01-01', 1588.00, 'active', 'Statutory / Government', 'SG');

-- SME Working Capital Loan (Singapore)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (sme_loan_id, test_user_id, 'Business Expansion (SME)', 100000.00, 'SGD', 7.5, 60, '2026-04-01', '2031-04-01', 2003.00, 'active', 'Personal / Cash', 'SG');

-- Business/SME Loan (Europe)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (euro_biz_loan_id, test_user_id, 'Euro Factory Equipment', 80000.00, 'EUR', 3.5, 48, '2026-01-01', '2030-01-01', 1788.00, 'active', 'Personal / Cash', 'FR');

-- Bridge Loan (Europe - Short Term)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (euro_bridge_loan_id, test_user_id, 'Bridge Loan FR', 50000.00, 'EUR', 12.0, 6, '2026-04-01', '2026-10-01', 8626.00, 'active', 'Asset-Backed', 'FR');

-- Japan Housing Finance Agency (JHF)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (jhf_loan_id, test_user_id, 'Tokyo Apartment (JHF)', 45000000.00, 'JPY', 1.2, 420, '2026-01-01', '2061-01-01', 131230.00, 'active', 'Statutory / Government', 'JP');

-- Business Loan Program (Japan)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (jp_biz_loan_id, test_user_id, 'Osaka Shop Loan', 15000000.00, 'JPY', 2.1, 120, '2026-04-01', '2036-04-01', 138760.00, 'active', 'Personal / Cash', 'JP');

-- Guarantor Loan (UK)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (guarantor_loan_id, test_user_id, 'UK Guarantor Loan', 10000.00, 'GBP', 39.9, 36, '2026-01-01', '2029-01-01', 448.00, 'active', 'Personal / Cash', 'GB');

-- Joint Loan (UK)
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category, country_code)
VALUES (joint_loan_id, test_user_id, 'Joint Home Improvement', 25000.00, 'GBP', 5.5, 60, '2026-02-01', '2031-02-01', 477.00, 'active', 'Personal / Cash', 'GB');

-- Boundary Testing: 0% Interest
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category)
VALUES (zero_interest_id, test_user_id, 'Zero Interest Promo', 1200.00, 'USD', 0, 12, '2026-04-01', '2027-04-01', 100.00, 'active', 'Specialized Retail');

-- Boundary Testing: 1-month term
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status, commercial_category)
VALUES (one_month_loan_id, test_user_id, 'Micro Bridge', 1000.00, 'USD', 5.0, 1, '2026-04-01', '2026-05-01', 1004.17, 'active', 'Personal / Cash');


-- 6. Generate Payments and Extra Payments (Amortization Validation)

-- Payments for Credit Card (High Interest) with one-time extra payment
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status, amount_paid, paid_date)
VALUES 
  (high_interest_id, test_user_id, '2026-03-01', 'paid', 432.00, '2026-03-01'),
  (high_interest_id, test_user_id, '2026-04-01', 'paid', 1432.00, '2026-04-01'); -- $1000 extra payment

-- Payments for Delinquent Loan
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status)
VALUES 
  (delinquent_loan_id, test_user_id, '2026-02-01', 'overdue'),
  (delinquent_loan_id, test_user_id, '2026-03-01', 'overdue'),
  (delinquent_loan_id, test_user_id, '2026-04-01', 'pending');

-- Payments for HDB Loan (Singapore)
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status, amount_paid, paid_date)
SELECT hdb_loan_id, test_user_id, '2026-01-01'::date + (m || ' months')::interval, 'paid', 1588.00, '2026-01-01'::date + (m || ' months')::interval 
FROM generate_series(0, 2) m;

-- Pending payments for the next 12 months for cash flow projections
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status)
SELECT active_mortgage_id, test_user_id, '2026-04-01'::date + (m || ' months')::interval, 'pending' FROM generate_series(0, 11) m;
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status)
SELECT auto_loan_id, test_user_id, '2026-04-01'::date + (m || ' months')::interval, 'pending' FROM generate_series(0, 11) m;
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status)
SELECT hdb_loan_id, test_user_id, '2026-04-01'::date + (m || ' months')::interval, 'pending' FROM generate_series(0, 11) m;

-- 7. Goals (Assets for Net Worth)
INSERT INTO public.goals (user_id, name, target_amount, current_amount, type, currency)
VALUES
  (test_user_id, 'High-Yield Savings', 50000.00, 12500.00, 'savings', 'USD'),
  (test_user_id, 'Stock Portfolio',    100000.00, 45000.00, 'savings', 'USD'),
  (test_user_id, 'Emergency Fund',     20000.00,  8000.00,  'savings', 'USD'),
  (test_user_id, 'House Downpayment',  150000.00, 0.00,     'savings', 'USD');

END $$;

-- 8. Exchange Rates (Ensure GBP and JPY are included)
INSERT INTO public.exchange_rates (base, target, rate, fetched_at)
VALUES
  ('USD', 'EUR', 0.92,   now()), ('EUR', 'USD', 1.087,  now()),
  ('USD', 'GBP', 0.79,   now()), ('GBP', 'USD', 1.265,  now()),
  ('USD', 'JPY', 151.50, now()), ('JPY', 'USD', 0.0066, now()),
  ('USD', 'PHP', 56.12,  now()), ('PHP', 'USD', 0.0178, now()),
  ('USD', 'SGD', 1.34,   now()), ('SGD', 'USD', 0.746,  now())
ON CONFLICT (base, target) DO UPDATE SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at;
