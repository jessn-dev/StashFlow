# StashFlow API Specification

> **Architecture Note:** StashFlow uses a **Service-Oriented API** (`@stashflow/api`). Logic is decoupled into internal core packages and orchestrated by domain services. Standard CRUD operations are verified server-side via Supabase RLS.

## 1. 🔐 Auth API
Handled entirely by Supabase Auth. No custom backend routes required.

| Action | Method | Notes |
|---|---|---|
| Sign In | `supabase.auth.signInWithPassword` | Returns JWT in httpOnly cookie |
| Sign Up | `supabase.auth.signUp` | Triggers profile creation via DB trigger |
| Sign Out | `supabase.auth.signOut` | Clears cookies |

---

## 2. 📊 Dashboard API (`DashboardService`)
Unified entry point for the main UI. Implements a **Partial Success** model.

### Get Unified Payload
`getDashboardPayload()` → `DashboardPayload`

**Structure:**
*   `summary`: High-level Net Worth, Assets, and Monthly Flow.
*   `dti`: Strategy-aware Debt-to-Income assessment (Regionalized).
*   `trend`: 6-month historical Actuals vs. 12-month Projections.
*   `marketTrends`: Live signals derived from FRED API (Cached).
*   `recentTransactions`: Merged list of latest incomes and expenses.
*   `budgetRecommendation`: AI-driven smart allocations.

---

## 3. 💸 Financial Records (`FinancialService`)
Domain-driven service for managing core records.

### Loans
*   `getLoans()`: Fetches active and completed loans.
*   `createLoan(data)`: Validates input, generates an amortization schedule via `@stashflow/math`, and inserts loan + payments.
*   `deleteLoan(id)`: Removes loan and all associated pending payments.

### Spending & Income
*   `getExpenses(limit)`: Fetched latest transactions.
*   `addExpense(data)`: Appends a new expense record with auto-user-id injection.

---

## 4. 🧠 Intelligence Services (Edge Functions)

### Macro Financial Advisor
`POST /functions/v1/macro-financial-advisor`
*   **Purpose**: Returns regional economic strategy and multipliers.
*   **Fallback**: Gemini → Groq → Claude → Heuristic.
*   **Caching**: Persistent cache in `ai_insights_cache`.

### Universal Document Analysis
`POST /functions/v1/analyze-financial-document`
*   **Purpose**: Extracts data from Payslips, Loans, Bills, etc.
*   **Formats**: PDF, JPG (up to 10MB), HEIC, CSV, XLSX, DOCX.

---

## 5. 🛠️ Regional Extensions
All regional calculations rely on the **Regional Strategy Pattern**.
*   **Interface**: `packages/core/src/regional/interface.ts`
*   **Registration**: To add a country, register a new strategy class in the `regionalRegistry`.
