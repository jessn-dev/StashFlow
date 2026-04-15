-- Seed Data for FinTrack
-- -----------------------------------------------------------------------------
-- Run with: pnpm supabase db reset
-- Test credentials: test@fintrack.com / password123
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000000';
  test_loan_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN

-- 1. Create a test user in auth.users
--    Note: Column order and metadata content are critical for Supabase Auth to work locally.
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  test_user_id,                             -- id
  '00000000-0000-0000-0000-000000000000',   -- instance_id
  'authenticated',                          -- aud
  'authenticated',                          -- role
  'test@fintrack.com',                      -- email
  crypt('password123', gen_salt('bf')),     -- encrypted_password
  now(),                                    -- email_confirmed_at
  now(),                                    -- recovery_sent_at
  now(),                                    -- last_sign_in_at
  '{"provider":"email","providers":["email"]}',  -- raw_app_meta_data (JSONB)
  '{"full_name":"Test User"}',                   -- raw_user_meta_data (JSONB)
  now(),                                    -- created_at
  now(),                                    -- updated_at
  '',                                       -- confirmation_token
  '',                                       -- email_change
  '',                                       -- email_change_token_new
  ''                                        -- recovery_token
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Profile
INSERT INTO public.profiles (id, email, full_name, preferred_currency)
VALUES (
  test_user_id,
  'test@fintrack.com',
  'Test User',
  'USD'
) ON CONFLICT (id) DO NOTHING;

-- 3. Add Income
INSERT INTO public.incomes (user_id, amount, currency, source, frequency, date)
VALUES
  (test_user_id, 5000.00, 'USD', 'Monthly Salary',   'monthly',  '2026-04-01'),
  (test_user_id,  500.00, 'USD', 'Freelance Project', 'one-time', '2026-04-05');

-- 4. Add Expenses
INSERT INTO public.expenses (user_id, amount, currency, category, description, date, is_recurring)
VALUES
  (test_user_id, 1200.00, 'USD', 'housing',       'Monthly Rent',      '2026-04-01', true),
  (test_user_id,  150.00, 'USD', 'food',          'Grocery Store',     '2026-04-02', false),
  (test_user_id,   60.00, 'USD', 'transport',     'Gas Station',       '2026-04-03', false),
  (test_user_id,   25.00, 'USD', 'entertainment', 'Streaming Service', '2026-04-04', true);

-- 5. Add Loan
INSERT INTO public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status)
VALUES (
  test_loan_id,
  test_user_id,
  'Car Loan',
  25000.00,
  'USD',
  5.5,
  60,
  '2026-01-01',
  '2031-01-01',
  477.53,
  'active'
);

-- 6. Add Loan Payments (first 3 of 60)
INSERT INTO public.loan_payments (loan_id, user_id, due_date, status, paid_date, amount_paid)
VALUES
  (test_loan_id, test_user_id, '2026-02-01', 'paid',    '2026-01-28', 477.53),
  (test_loan_id, test_user_id, '2026-03-01', 'paid',    '2026-02-27', 477.53),
  (test_loan_id, test_user_id, '2026-04-01', 'pending', NULL,         0.00);

END $$;

-- 7. Add Exchange Rates (Global table)
INSERT INTO public.exchange_rates (base, target, rate, fetched_at)
VALUES
  ('USD', 'EUR', 0.92,   now()),
  ('USD', 'GBP', 0.79,   now()),
  ('USD', 'JPY', 151.50, now())
ON CONFLICT (base, target) DO UPDATE SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at;
