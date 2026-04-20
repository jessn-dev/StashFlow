-- -----------------------------------------------------------------------------
-- StashFlow Realistic Seed (Dev)
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper Function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_realistic_data(
  u_id uuid,
  curr text,
  monthly_base float,
  lifestyle text -- 'frugal', 'balanced', 'overspender', 'improving'
) RETURNS void AS $$
DECLARE
  d date;
  i int;
  j int;
  txn_count int;
  cat text;
  amt float;
  income float;
  expense_multiplier float;
  day_offset int;
  is_sub boolean;
  sub_name text;

  categories text[] := ARRAY['food','transport','entertainment','personal','other'];
  subscriptions text[][] := ARRAY[
    ARRAY['Netflix','entertainment','15.99'],
    ARRAY['Spotify','entertainment','9.99'],
    ARRAY['iCloud','other','2.99'],
    ARRAY['Gym Membership','personal','45.00'],
    ARRAY['Adobe CC','education','52.99']
  ];
BEGIN
  FOR i IN 0..5 LOOP
    d := (date_trunc('month', now()) - (i || ' month')::interval)::date;

    -- 🎯 Lifestyle control (Dynamic for 'improving')
    IF lifestyle = 'frugal' THEN
      expense_multiplier := 0.6;
    ELSIF lifestyle = 'balanced' THEN
      expense_multiplier := 0.8;
    ELSIF lifestyle = 'overspender' THEN
      expense_multiplier := 1.15;
    ELSIF lifestyle = 'improving' THEN
      -- Starts at 1.1 (overspender-ish) 5 months ago, drops to 0.7 (frugal-ish) now.
      expense_multiplier := 0.7 + (i * 0.08); 
    ELSE
      expense_multiplier := 1.0;
    END IF;

    -- 🎯 Seasonal Income
    income := monthly_base;
    IF EXTRACT(MONTH FROM d) = 12 THEN
      income := income * 1.25; -- bonus season
    ELSIF EXTRACT(MONTH FROM d) = 1 THEN
      income := income * 0.9; -- slow January
    END IF;

    -- Salary (1st of month)
    INSERT INTO public.incomes (user_id, amount, currency, source, frequency, date)
    VALUES (u_id, income, curr, 'Salary', 'monthly'::income_frequency, d + 1);

    -- ───── Recurring Expenses (Realistic Anchors) ─────
    INSERT INTO public.expenses (user_id, amount, currency, category, description, date, is_recurring)
    VALUES
        (u_id, income * 0.25, curr, 'housing'::expense_category, 'Rent', d + 1, TRUE),
        (u_id, income * 0.05, curr, 'utilities'::expense_category, 'Utilities', d + 10, TRUE);

    -- ───── Monthly Subscriptions (Elite Detection Logic) ─────
    -- Pick 2-3 random subscriptions from the list for each user
    FOR j IN 1..3 LOOP
      sub_name := subscriptions[j][1];
      amt := subscriptions[j][3]::float;
      
      -- Currency scaling for subs
      IF curr = 'PHP' THEN amt := amt * 55;
      ELSIF curr = 'JPY' THEN amt := amt * 150;
      ELSIF curr = 'SGD' THEN amt := amt * 1.3;
      END IF;

      INSERT INTO public.expenses (user_id, amount, currency, category, description, date, is_recurring)
      VALUES (u_id, amt, curr, subscriptions[j][2]::expense_category, sub_name, d + 15, TRUE);
    END LOOP;

    -- 🎯 Transaction volume varies by lifestyle
    IF lifestyle = 'frugal' THEN
      txn_count := 25 + floor(random()*10);
    ELSIF lifestyle = 'balanced' THEN
      txn_count := 35 + floor(random()*10);
    ELSE
      txn_count := 50 + floor(random()*15);
    END IF;

    FOR j IN 1..txn_count LOOP
      -- Skip some days (natural gaps)
      IF random() < 0.2 THEN CONTINUE; END IF;

      day_offset := floor(random()*28)::int;

      -- Category bias
      IF lifestyle = 'overspender' AND random() < 0.4 THEN
        cat := 'entertainment';
      ELSE
        cat := categories[1 + floor(random()*array_length(categories,1))];
      END IF;

      -- Base amounts
      IF cat = 'food' THEN amt := 5 + random()*25;
      ELSIF cat = 'transport' THEN amt := 3 + random()*15;
      ELSIF cat = 'entertainment' THEN amt := 20 + random()*80;
      ELSE amt := 10 + random()*40;
      END IF;

      -- Weekend boost (simulate behavior)
      IF EXTRACT(DOW FROM d + day_offset) IN (0,6) THEN
        amt := amt * 1.4;
      END IF;

      -- 🎯 Seasonality
      IF EXTRACT(MONTH FROM d) = 12 THEN
        amt := amt * 1.4;
      ELSIF EXTRACT(MONTH FROM d) = 1 THEN
        amt := amt * 0.75;
      END IF;

      -- Rare big purchase
      IF random() < 0.05 THEN
        amt := amt * 4;
      END IF;

      -- Currency scaling
      IF curr = 'PHP' THEN amt := amt * 55;
      ELSIF curr = 'JPY' THEN amt := amt * 150;
      ELSIF curr = 'EUR' THEN amt := amt * 0.9;
      ELSIF curr = 'GBP' THEN amt := amt * 0.8;
      ELSIF curr = 'SGD' THEN amt := amt * 1.3;
      END IF;

      INSERT INTO public.expenses (
          user_id, amount, currency, category, description, date, is_recurring
      )
      VALUES (
          u_id,
          amt * expense_multiplier,
          curr,
          cat::expense_category,
          CASE
              WHEN cat = 'food' THEN 'Food & Dining'
              WHEN cat = 'transport' THEN 'Transport'
              WHEN cat = 'entertainment' THEN 'Entertainment'
              WHEN cat = 'personal' THEN 'Personal'
              ELSE 'Misc'
          END,
          d + day_offset,
          FALSE
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
id_us uuid := gen_random_uuid();
  id_ph uuid := gen_random_uuid();
  id_sg uuid := gen_random_uuid();
  id_jp uuid := gen_random_uuid();
  id_uk uuid := gen_random_uuid();
  id_eu uuid := gen_random_uuid();
BEGIN

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change_token, reauthentication_token
)
VALUES
  (id_us, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'us@stashflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sam (USA)"}', now(), now(), false, '', '', '', '', '', '', ''),
  (id_ph, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ph@stashflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pilar (PH)"}', now(), now(), false, '', '', '', '', '', '', ''),
  (id_sg, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sg@stashflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Liling (SG)"}', now(), now(), false, '', '', '', '', '', '', ''),
  (id_jp, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jp@stashflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kenji (JP)"}', now(), now(), false, '', '', '', '', '', '', ''),
  (id_uk, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'uk@stashflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Oliver (UK)"}', now(), now(), false, '', '', '', '', '', '', ''),
  (id_eu, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eu@stashflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marco (EU)"}', now(), now(), false, '', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, preferred_currency, budgeting_enabled)
VALUES
  (id_us, 'us@stashflow.com', 'Sam (USA)', 'USD', TRUE),
  (id_ph, 'ph@stashflow.com', 'Pilar (PH)', 'PHP', TRUE),
  (id_sg, 'sg@stashflow.com', 'Liling (SG)', 'SGD', TRUE),
  (id_jp, 'jp@stashflow.com', 'Kenji (JP)', 'JPY', TRUE),
  (id_uk, 'uk@stashflow.com', 'Oliver (UK)', 'GBP', TRUE),
  (id_eu, 'eu@stashflow.com', 'Marco (EU)', 'EUR', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PERSONA-BASED DATA
-- ─────────────────────────────────────────────────────────────────────────────

PERFORM public.seed_realistic_data(id_us, 'USD', 6500, 'balanced');
PERFORM public.seed_realistic_data(id_ph, 'PHP', 45000, 'overspender');
PERFORM public.seed_realistic_data(id_sg, 'SGD', 7200, 'improving');
PERFORM public.seed_realistic_data(id_jp, 'JPY', 450000, 'frugal');
PERFORM public.seed_realistic_data(id_uk, 'GBP', 4200, 'overspender');
PERFORM public.seed_realistic_data(id_eu, 'EUR', 3800, 'improving');

-- ─────────────────────────────────────────────────────────────────────────────
-- LOANS (Selective)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.loans (user_id, name, principal, currency, interest_rate, duration_months, start_date, end_date, installment_amount, status)
VALUES
    (id_ph, 'Personal Loan', 150000, 'PHP', 12.0, 36, '2026-01-01', '2029-01-01', 4982, 'active'::loan_status),
    (id_uk, 'Credit Loan', 5000, 'GBP', 18.5, 24, '2026-02-01', '2028-02-01', 251, 'active'::loan_status),
    (id_jp, 'Home Loan', 35000000, 'JPY', 0.8, 360, '2023-01-01', '2053-01-01', 109200, 'active'::loan_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- GOALS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.goals (user_id, name, target_amount, current_amount, type, currency)
VALUES
    (id_us, 'Emergency Fund', 20000, 9000, 'savings', 'USD'),
    (id_ph, 'Emergency Fund', 100000, 15000, 'savings', 'PHP'),
    (id_sg, 'Emergency Fund', 15000, 5000, 'savings', 'SGD'),
    (id_jp, 'Emergency Fund', 1000000, 500000, 'savings', 'JPY'),
    (id_uk, 'Emergency Fund', 8000, 1200, 'savings', 'GBP'),
    (id_eu, 'Emergency Fund', 7000, 3000, 'savings', 'EUR');

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- GLOBAL EXCHANGE RATES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.exchange_rates (base, target, rate, fetched_at)
VALUES
  ('USD', 'EUR', 0.92,   now()), ('EUR', 'USD', 1.087,  now()),
  ('USD', 'GBP', 0.79,   now()), ('GBP', 'USD', 1.265,  now()),
  ('USD', 'JPY', 151.50, now()), ('JPY', 'USD', 0.0066, now()),
  ('USD', 'PHP', 56.12,  now()), ('PHP', 'USD', 0.0178, now()),
  ('USD', 'SGD', 1.34,   now()), ('SGD', 'USD', 0.746,  now())
ON CONFLICT (base, target) DO UPDATE SET rate = EXCLUDED.rate, fetched_at = EXCLUDED.fetched_at;

DROP FUNCTION public.seed_realistic_data(uuid, text, float, text);