# StashFlow — API Reference

> StashFlow uses Supabase as its sole backend. Standard CRUD operations execute through the Supabase JS client against Postgres with Row Level Security enforced at the DB layer. Complex aggregations and admin operations are routed through Supabase Edge Functions.
>
> All requests require authentication unless noted otherwise.

---

## Authentication

All API access requires a valid Supabase JWT. On web, the JWT is managed automatically in httpOnly cookies via `@supabase/ssr`. On mobile, it is stored in `expo-secure-store`.

| Action | Client method |
|--------|--------------|
| Sign up | `supabase.auth.signUp({ email, password })` |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` |
| Sign in (Google OAuth) | `supabase.auth.signInWithOAuth({ provider: 'google' })` — PKCE flow |
| Sign out | `supabase.auth.signOut()` |
| Get session | `supabase.auth.getSession()` |
| Reset password | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` |
| Update password | `supabase.auth.updateUser({ password })` |
| MFA enroll | `supabase.auth.mfa.enroll({ factorType: 'totp' })` |
| MFA challenge | `supabase.auth.mfa.challenge({ factorId })` |
| MFA verify | `supabase.auth.mfa.verify({ factorId, challengeId, code })` |

Edge functions: include `Authorization: Bearer <access_token>` header.

---

## Profile

One `profiles` row per authenticated user. Auto-created on first login.

### Get profile

```typescript
const { data } = await supabase
  .from('profiles')
  .select('id, full_name, preferred_currency, budgeting_enabled, global_rollover_enabled')
  .eq('id', userId)
  .single()
```

### Update profile

```typescript
const { data } = await supabase
  .from('profiles')
  .update({ full_name, preferred_currency })
  .eq('id', userId)
  .select()
  .single()
```

---

## Transactions

Incomes and expenses share a unified timeline. Stored in separate tables (`incomes`, `expenses`) and merged via `UnifiedTransaction` type in `@stashflow/core`.

### List transactions (filtered)

Via `@stashflow/api TransactionQuery.getTransactionsFiltered(userId, opts)`:

```typescript
interface TransactionFilterOpts {
  dateFrom?: string    // ISO date
  dateTo?: string      // ISO date
  type?: 'all' | 'income' | 'expense'
  search?: string      // matches description/source
  limit?: number       // defaults to 100
  cursor?: string      // Format: "date|id" for stable pagination
}
```

This method queries the `unified_transactions` view. Sorting is always `date DESC, id DESC`.

### Period summary

Via `TransactionQuery.getSummaryForPeriod(userId, dateFrom, dateTo)`:

```typescript
interface PeriodSummary {
  totalIncome: number        // converted to preferred_currency
  totalExpenses: number      // converted to preferred_currency
  netFlow: number
  count: number
  currency: string           // preferred_currency
}
```

### Historical summaries (12 months)

Via `TransactionQuery.getHistoricalSummaries(userId, months)`. Returns array of `{ month, income, expenses, net }` objects.

### Spending by category

Via `TransactionQuery.getSpendingByCategory(userId, period)` where `period` is `YYYY-MM`.

### Transaction Import (CSV)

Executed via browser-side parsing using `papaparse`. Users map columns to `date`, `description`, and `amount`. Bulk insert performed via `supabase.from('incomes' | 'expenses').insert([...])`.

### Create income

```typescript
await supabase.from('incomes').insert({
  user_id: userId,
  amount: number,
  currency: string,           // ISO 4217
  source: string,
  frequency: 'one-time' | 'weekly' | 'monthly',
  date: string,               // ISO date
  notes?: string
})
```

### Create expense

```typescript
await supabase.from('expenses').insert({
  user_id: userId,
  amount: number,
  currency: string,
  description: string,
  category: ExpenseCategory,  // see enum in @stashflow/core
  date: string,
  is_recurring: boolean,
  notes?: string
})
```

### Update / delete

```typescript
// Update
await supabase.from('incomes').update(payload).eq('id', id)
await supabase.from('expenses').update(payload).eq('id', id)

// Delete
await supabase.from('incomes').delete().eq('id', id)
await supabase.from('expenses').delete().eq('id', id)
```

---

## Loans

### List loans

Via `LoanQuery.getAll(userId)`. Returns all loans with `status`, `principal`, `interest_rate`, `currency`, `installment_amount`, `duration_months`, `start_date`, `end_date`.

**Critical:** `interest_rate` is stored as a percentage integer (e.g. `12` = 12% annual). Always divide by 100 before passing to `generateAmortizationSchedule`.

### Get loan with amortization schedule

Via `LoansService.getLoanDetail(userId, loanId)`. Returns `{ loan, schedule, payments }`.

### Get loans page data

Via `LoansService.getLoansPageData(userId)`. Returns `{ loans, metrics }` where `metrics` is `LoanMetrics` from `@stashflow/core` (total debt, monthly installments, avg rate, active count — converted to preferred currency).

### Create loan

```typescript
await supabase.from('loans').insert({
  user_id: userId,
  name: string,
  principal: number,
  interest_rate: number,     // stored as percentage (12 = 12%)
  installment_amount: number,
  duration_months: number,
  start_date: string,
  currency: string,
  interest_type: LoanInterestType,
  interest_basis: LoanInterestBasis,
  commercial_category: LoanCommercialCategory,
  status: 'active'
})
```

After creating a loan, generate the amortization schedule using `generateAmortizationSchedule` from `@stashflow/core` and insert all entries into `loan_payments`.

### Update / delete

```typescript
await supabase.from('loans').update(payload).eq('id', id)
await supabase.from('loans').delete().eq('id', id)   // cascades loan_payments
```

### Mark payment paid

```typescript
await supabase.from('loan_payments')
  .update({ status: 'paid', paid_date: string })
  .eq('id', paymentId)
```

### Upcoming payments

Via `LoanQuery.getPaymentSummaries(userId)`. Returns payments with due dates, loan name, amount, and currency.

---

## Assets

### List assets

Via `AssetQuery.getAll(userId)`.

### Create / update / delete

```typescript
// Create
await supabase.from('assets').insert({
  user_id: userId,
  name: string,
  type: 'cash' | 'investment' | 'property' | 'retirement' | 'other',
  balance: number,
  currency: string,
  institution?: string,
  notes?: string
})

// Update
await supabase.from('assets').update(payload).eq('id', id)

// Delete
await supabase.from('assets').delete().eq('id', id)
```

---

## Net Worth Snapshots

### List snapshots

Via `NetWorthSnapshotQuery.getAll(userId)`.

### Get latest snapshot

Via `NetWorthSnapshotQuery.getLatest(userId)`.

### Create snapshot

Via `NetWorthSnapshotQuery.create(userId, snapshot)`:

```typescript
interface SnapshotInput {
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  currency: string;
}
```

---

## Goals

### List goals

Via `GoalQuery.getAll(userId)`.

### Create / update / delete

```typescript
// Create
await supabase.from('goals').insert({
  user_id: userId,
  name: string,
  type: 'savings' | 'debt',
  target_amount: number,
  current_amount: number,
  currency: string,
  deadline?: string
})

// Update
await supabase.from('goals').update(payload).eq('id', id)

// Delete
await supabase.from('goals').delete().eq('id', id)
```

---

## Budgets

One budget row per user per `expense_category`. Upsert pattern required.

### List active budgets

Via `BudgetQuery.getActive(userId)`.

### Get budget periods

Via `BudgetQuery.getPeriods(userId, period)` where `period` is `YYYY-MM`. Returns `budget_periods` rows with `budgeted`, `spent`, `rolled_over_amount`.

### Upsert budget

Via `BudgetQuery.upsert(userId, category, amount, currency)`. Uses `ON CONFLICT (user_id, category)` — creates or updates.

### Delete budget

Via `BudgetQuery.delete(userId, category)`.

---

## Exchange Rates

Rates are cached in `exchange_rates`, synced hourly by the `sync-exchange-rates` cron.

### Get latest rates

Via `ExchangeRateQuery.getLatest(userId)`. Returns rates relevant to the user's data currencies.

### Currency conversion

Via `convertToBase(amount, rate)` from `@stashflow/core`. `rate` = units of base currency per 1 unit of foreign currency.

---

## Edge Functions

All edge functions are at `{SUPABASE_URL}/functions/v1/{name}`.

### `delete-account`

Permanently deletes the authenticated user and all their data via cascade.

```
POST /functions/v1/delete-account
Authorization: Bearer <access_token>
Content-Type: application/json

Body: { "userId": "<user_id>" }

Response 200: { "success": true }
Response 403: { "error": "Forbidden" }   // userId mismatch
```

`userId` in body must match the JWT subject. Account deletion cascades to all user-owned rows via `ON DELETE CASCADE`.

### `get-dashboard`

Aggregates full dashboard payload for mobile app.

```
POST /functions/v1/get-dashboard
Authorization: Bearer <access_token>
```

Returns net worth, DTI, cashflow, upcoming payments, recent transactions.

### `calculate-dti`

DTI ratio with regional thresholds (US 36%, PH 40%, SG 55%).

```
POST /functions/v1/calculate-dti
Authorization: Bearer <access_token>
```

Returns `DTIRatioResult`: `ratio`, `isHealthy`, `regionalThreshold`, `breakdown`.

### `macro-financial-advisor`

AI-powered financial insights. Cached by `(region, currency, data_version_hash)` — 24h TTL. Rate-limited to 5 AI calls per user per day.

```
POST /functions/v1/macro-financial-advisor
Authorization: Bearer <access_token>
```

### `parse-loan-document`

Webhook-triggered or manually invoked for password-protected files.

**Manual Invocation (Auth required):**
```
POST /functions/v1/parse-loan-document
Authorization: Bearer <access_token>
x-document-password: <password>
Content-Type: application/json

Body: { "id": "<document_id>" }
```

Processes PDF through 3-tier AI pipeline; writes `extracted_data` + `processing_status` back to the row. Supports `x-document-password` for encrypted PDFs.

---

## Error Handling

### Supabase Client Errors

```typescript
const { data, error } = await supabase.from('table').select()
if (error) {
  // error.message — human-readable description
  // error.code    — Postgres error code
  // error.hint    — optional fix suggestion
}
```

### Edge Function Error Shape

```json
{ "error": "Unauthorized" }
{ "error": "Forbidden" }
{ "error": "Invalid request body" }
```

Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 500 internal.

### Document Processing Errors

`documents.processing_error` JSONB column:

```typescript
interface ProcessingError {
  code: string        // e.g. 'PDF_PARSE_FAILED', 'OCR_TIMEOUT', 'AI_UNAVAILABLE'
  message: string
  stage: 'pdf' | 'ocr' | 'ai'
  timestamp: string
}
```

---

## Rate Limits

| Resource | Limit |
|----------|-------|
| AI advisor (`macro-financial-advisor`) | 5 per user per day |
| Edge function invocations | Supabase plan limits |
| Storage uploads | Supabase plan limits |
| Exchange rate sync | 1× per hour (cron) |
| Auth endpoints | Supabase built-in rate limiting |
