-- Seed Data for FinTrack
-- -----------------------------------------------------------------------------
-- Run with: pnpm supabase db reset  (applies migrations + this seed file)
-- Test credentials: test@fintrack.com / password123
-- -----------------------------------------------------------------------------

-- 0. Define Constants
\set test_user_id '00000000-0000-0000-0000-000000000000'
\set test_loan_id '11111111-1111-1111-1111-111111111111'

-- 1. Create a test user in auth.users
--    Column order must match exactly: misaligned values cause "Invalid Credentials"
--    because the Auth service reads raw_app_meta_data to resolve the provider.
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  :'test_user_id',                          -- id
  :'test_user_id',                          -- instance_id
  'authenticated',                          -- aud
  'test@fintrack.com',                      -- email
  crypt('password123', gen_salt('bf')),     -- encrypted_password
  now(),                                    -- email_confirmed_at
  '',                                       -- confirmation_token
  '',                                       -- recovery_token
  '',                                       -- email_change_token_new
  '',                                       -- email_change_token_current
  now(),                                    -- created_at
  now(),                                    -- updated_at
  '{"provider":"email","providers":["email"]}',  -- raw_app_meta_data (JSONB)
  '{"full_name":"Test User"}',                   -- raw_user_meta_data (JSONB)
  false,                                    -- is_super_admin
  'authenticated'                           -- role
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Profile
--    ON CONFLICT DO NOTHING handles both manual seeds and any future
--    on-insert trigger that auto-creates profiles from auth.users.
INSERT INTO profiles (id, email, full_name, preferred_currency)
VALUES (
  :'test_user_id',
  'test@fintrack.com',
  'Test User',
  'USD'
) ON CONFLICT (id) DO NOTHING;

-- 3. Add Income
INSERT INTO incomes (user_id, amount, currency, source, frequency, date)
VALUES
  (:'test_user_id', 5000.00, 'USD', 'Monthly Salary',   'monthly',  '2026-04-01'),
  (:'test_user_id',  500.00, 'USD', 'Freelance Project', 'one-time', '2026-04-05');

-- 4. Add Expenses
INSERT INTO expenses (user_id, amount, currency, category, description, date, is_recurring)
VALUES
  (:'test_user_id', 1200.00, 'USD', 'housing',       'Monthly Rent',      '2026-04-01', true),
  (:'test_user_id',  150.00, 'USD', 'food',          'Grocery Store',     '2026-04-02', false),
  (:'test_user_id',   60.00, 'USD', 'transport',     'Gas Station',       '2026-04-03', false),
  (:'test_user_id',   25.00, 'USD', 'entertainment', 'Streaming Service', '2026-04-04', true);

-- 5. Add Loan
--    start_date: 2026-01-01, duration: 60 months
--    First payment: 2026-02-01, last payment: 2031-01-01
--    end_date must be 2031-01-01 (not 2030-12-01, which is only 59 months out)
INSERT INTO loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status)
VALUES (
  :'test_loan_id',
  :'test_user_id',
  'Car Loan',
  25000.00,
  'USD',
  5.5,
  60,
  '2026-01-01',
  '2031-01-01',   -- corrected: 60 months from start = Jan 2031
  477.53,
  'active'
);

-- 6. Add Loan Payments (first 3 of 60)
INSERT INTO loan_payments (loan_id, user_id, due_date, status, paid_date, amount_paid)
VALUES
  (:'test_loan_id', :'test_user_id', '2026-02-01', 'paid',    '2026-01-28', 477.53),
  (:'test_loan_id', :'test_user_id', '2026-03-01', 'paid',    '2026-02-27', 477.53),
  (:'test_loan_id', :'test_user_id', '2026-04-01', 'pending', NULL,         0.00);


-- 7. Add Exchange Rates (global table — readable by all authenticated users)
INSERT INTO exchange_rates (base, target, rate, fetched_at)
VALUES
  ('USD', 'EUR', 0.92,   now()),
  ('USD', 'GBP', 0.79,   now()),
  ('USD', 'JPY', 151.50, now())
ON CONFLICT (base, target) DO UPDATE SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at;
