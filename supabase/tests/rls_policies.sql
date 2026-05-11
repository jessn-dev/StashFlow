begin;
select plan(23);

-- 1. Setup test users and profiles
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'user1@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'user2@test.com');

insert into public.profiles (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'user1@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'user2@test.com');

-- 2. Test incomes RLS
-- Switch to user 1
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- Can insert own income
insert into public.incomes (id, user_id, amount, currency, source, date)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 1000, 'PHP', 'Salary', '2026-05-01');
select is(
  (select count(*)::int from public.incomes where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own income'
);

-- Cannot insert income for another user
select throws_ok(
  $$ insert into public.incomes (user_id, amount, currency, source, date) values ('00000000-0000-0000-0000-000000000002', 2000, 'PHP', 'Fraud', '2026-05-01') $$,
  'new row violates row-level security policy for table "incomes"',
  'User 1 cannot insert income for User 2'
);

-- Switch to user 2
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000002"}';

-- Cannot see user 1's income
select is(
  (select count(*)::int from public.incomes),
  0,
  'User 2 cannot see User 1 income'
);

-- 3. Test expenses RLS
-- Switch back to user 1
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- Can insert own expense
insert into public.expenses (id, user_id, amount, currency, category, description, date)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 50, 'PHP', 'food', 'Lunch', '2026-05-01');
select is(
  (select count(*)::int from public.expenses where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own expense'
);

-- Cannot update another user's expense (setup User 2 expense first)
reset role;
insert into public.expenses (id, user_id, amount, currency, category, description, date)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000002', 100, 'PHP', 'housing', 'Apartment', '2026-05-01');

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';

update public.expenses set amount = 0 where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
select is(
  (select amount from public.expenses where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  null,
  'User 1 cannot see/update User 2 expense'
);

-- 4. Test loans RLS
-- Can insert own loan
insert into public.loans (id, user_id, name, principal, currency, interest_rate, duration_months, interest_type, start_date, end_date, installment_amount)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Personal Loan', 50000, 'PHP', 5.5, 24, 'Standard Amortized', '2026-05-01', '2028-05-01', 2200);
select is(
  (select count(*)::int from public.loans where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own loan'
);

-- 5. Test documents RLS
-- Can insert own document
insert into public.documents (id, user_id, storage_path, file_name, content_type, file_size)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'path/to/doc.pdf', 'doc.pdf', 'application/pdf', 1024);
select is(
  (select count(*)::int from public.documents where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own document'
);

-- 6. Test goals RLS
insert into public.goals (id, user_id, name, target_amount, currency, type)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Emergency Fund', 100000, 'PHP', 'savings');
select is(
  (select count(*)::int from public.goals where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own goal'
);

-- 7. Test budgets RLS
insert into public.budgets (id, user_id, category, amount, currency)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'food', 30000, 'PHP');
select is(
  (select count(*)::int from public.budgets where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own budget'
);

-- 8. Test cross-user select rejection (Explicit check)
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000002"}';
select is(
  (select count(*)::int from public.incomes),
  0,
  'User 2 sees 0 incomes from User 1'
);
select is(
  (select count(*)::int from public.expenses),
  1, -- Sees their own (the Apartment one we inserted as reset role)
  'User 2 sees only their own expense'
);

-- 9. Test delete own
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';
delete from public.incomes where user_id = '00000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.incomes),
  0,
  'User 1 can delete own income'
);

-- 10. Test loan_payments RLS
insert into public.loan_payments (id, user_id, loan_id, due_date, amount_paid, status)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000001', id, '2026-06-01', 2200, 'paid'
from public.loans limit 1;
select is(
  (select count(*)::int from public.loan_payments where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own loan payment'
);

-- 11. Test loan_fees RLS
insert into public.loan_fees (id, user_id, loan_id, name, amount)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000001', id, 'Processing Fee', 500
from public.loans limit 1;
select is(
  (select count(*)::int from public.loan_fees where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own loan fee'
);

-- 12. Test assets RLS
insert into public.assets (id, user_id, name, balance, currency, type)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Savings Account', 100000, 'PHP', 'cash');
select is(
  (select count(*)::int from public.assets where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own asset'
);

-- 13. Test net_worth_snapshots RLS
insert into public.net_worth_snapshots (id, user_id, snapshot_date, net_worth, total_assets, total_liabilities, currency)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '2026-05-01', 50000, 100000, 50000, 'PHP');
select is(
  (select count(*)::int from public.net_worth_snapshots where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own net worth snapshot'
);

-- 14. Test category_metadata RLS
insert into public.category_metadata (id, user_id, category, is_essential)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'food', true);
select is(
  (select count(*)::int from public.category_metadata where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  'User 1 can insert own category metadata'
);

-- 15. Hostile: Attempt to update another user's user_id (Lateral Movement)
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';
select throws_ok(
  $$ update public.expenses set user_id = '00000000-0000-0000-0000-000000000001' where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' $$,
  'new row violates row-level security policy for table "expenses"', -- Should fail because it shouldn't even find the row (SELECT policy) or WITH CHECK fails
  'User 1 cannot hijack User 2 expense by changing user_id'
);

-- 16. Hostile: Attempt to delete another user's data
select is(
  (select count(*)::int from public.expenses where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  0,
  'User 1 cannot see User 2 expense for deletion'
);
delete from public.expenses where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
-- Verify it still exists (reset role to check)
reset role;
select is(
  (select count(*)::int from public.expenses where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  1,
  'User 2 expense still exists after User 1 attempted deletion'
);

-- 17. Hostile: Attempt to insert for User 2 while being User 1
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';
select throws_ok(
  $$ insert into public.loans (user_id, name, principal, currency, interest_rate, duration_months, interest_type, start_date, end_date, installment_amount)
     values ('00000000-0000-0000-0000-000000000002', 'Stolen Loan', 1000, 'PHP', 5, 12, 'Standard Amortized', '2026-05-01', '2027-05-01', 100) $$,
  'new row violates row-level security policy for table "loans"',
  'User 1 cannot insert loan for User 2'
);

-- 18. Hostile: Attempt to access system_audit_logs as a user
select is(
  (select count(*)::int from public.system_audit_logs),
  0,
  'Regular user cannot see system_audit_logs'
);
select throws_ok(
  $$ insert into public.system_audit_logs (user_id, event_type, action) values ('00000000-0000-0000-0000-000000000001', 'hack', 'attempt') $$,
  'new row violates row-level security policy for table "system_audit_logs"',
  'Regular user cannot write to system_audit_logs'
);

select * from finish();
rollback;
