# FinTrack API Specification

> **Architecture Note:** FinTrack utilizes Supabase. Standard CRUD operations are handled via the Supabase JS client directly against the database with Row Level Security (RLS) enforced. Complex logic (Amortization, DTI, Dashboard Aggregation) is routed through Supabase Edge Functions.

## 1. 🔐 Auth API
Handled entirely by Supabase Auth. No custom backend routes required.

| Action | Method | Notes |
|---|---|---|
| Sign Up | `supabase.auth.signUp()` | Sends verification email |
| Sign In | `supabase.auth.signInWithPassword()` | Returns JWT session |
| Sign Out | `supabase.auth.signOut()` | Clears local session |
| Reset Password | `supabase.auth.resetPasswordForEmail()` | Sends recovery link |
| Session | `supabase.auth.getSession()` | Checks current auth state |

---

## 2. 👤 User Profile

```typescript
// Fetch Profile
getProfile() → { id, email, full_name, preferred_currency, created_at }

// Update Profile
updateProfile(payload: { full_name?: string, preferred_currency?: string }) → Profile
```
## 3. 📥 Income
```
// List Income
listIncome(filters?: { from?: Date, to?: Date, frequency?: "one-time" | "monthly" | "weekly" }) → Income[]

// Create Income
createIncome(payload: { amount: number, currency: string, source: string, frequency: string, date: string, notes?: string }) → Income

// Update / Delete
updateIncome(id: string, payload: Partial<Income>) → Income
deleteIncome(id: string) → { success: true }

// Summary (Aggregated monthly total)
getIncomeSummary(month: string) → { 
  total_local: number, 
  total_converted: number, 
  by_source: { source: string, amount: number }[] 
}
```
## 4. 💳 Expenses / Spending
```
// List Expenses (Paginated)
listExpenses(filters?: { from?: Date, to?: Date, category?: ExpenseCategory, limit?: number, offset?: number }) → { data: Expense[], count: number }

// Create Expense
createExpense(payload: { amount: number, currency: string, category: ExpenseCategory, description: string, date: string, is_recurring: boolean, notes?: string }) → Expense

// Update / Delete
updateExpense(id: string, payload: Partial<Expense>) → Expense
deleteExpense(id: string) → { success: true }

// Summary
getExpenseSummary(month: string) → { 
  total: number, 
  by_category: { category: string, amount: number, percentage: number, count: number }[], 
  vs_last_month: number 
}
```
## 5. 🏦 Loans & Installments
```
// List / Get Loans
listLoans(filters?: { status?: "active" | "completed" | "defaulted" }) → Loan[]
getLoan(id: string) → { loan: Loan, schedule: LoanPayment[], progress: { paid_count: number, remaining: number, paid_amount: number, percent_done: number } }

// Create Loan (⚡ Edge Function: generate-loan-schedule)
createLoan(payload: { name: string, principal: number, currency: string, interest_rate: number, duration_months: number, start_date: string, installment_amount: number }) → { loan: Loan, schedule: LoanPayment[], summary: object }

// Update / Delete
updateLoan(id: string, payload: Partial<Loan>) → Loan
deleteLoan(id: string) → { success: true }

// Payments
listPayments(loanId: string) → LoanPayment[]
markPaymentPaid(loanId: string, paymentId: string, payload: { amount_paid: number, paid_date: string }) → LoanPayment
getUpcomingPayments() → UpcomingPayment[]
```
## 6. 📊 DTI Ratio
```
// Get DTI Ratio (⚡ Edge Function: calculate-dti)
getDTIRatio(month?: string) → { 
  ratio: number, 
  status: "healthy" | "moderate" | "high_risk", 
  gross_income: number, 
  total_debt: number, 
  breakdown: object[], 
  trend: object[], 
  recommendation: string 
}

// Simulate DTI (What-If Calculator)
simulateDTI(payload: { add_loan?: object, add_income?: object, pay_off_loan?: object }) → { current_dti: number, projected_dti: number, change: number, new_status: string }
```
## 7. 🏦 Loans & Installments
```
// Get Cached Rates
getRates(payload: { base: string, targets: string[] }) → { base: string, rates: Record<string, number>, fetched_at: string, is_cached: boolean }

// Convert
convertAmount(payload: { amount: number, from: string, to: string }) → { original: number, converted: number, rate: number }

// Supported List
getSupportedCurrencies() → { code: string, name: string, symbol: string }[]
```
## 8. 🏦 Loans & Installments
```
// Get Dashboard Payload (⚡ Edge Function: getDashboard)
getDashboard() → { 
  summary: object, 
  cash_flow: object[], 
  spending_by_category: object[], 
  upcoming_payments: object[], 
  recent_transactions: object[], 
  loan_summary: object 
}
```