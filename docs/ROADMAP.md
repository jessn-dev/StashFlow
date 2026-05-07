# StashFlow — Roadmap

> Strategic direction, production-readiness goals, and architectural evolution.
> For a record of what shipped, see `docs/CHANGELOG.md`.
>
> Last updated: 2026-05-11
> Active branch: `develop`

---

## Vision

Build a calm financial command center powered by invisible intelligence and secure financial infrastructure — designed for multi-currency users navigating complex debt structures across the Philippines, United States, and Singapore.

---

## 1. What Is Built

### Core Financial Logic — `packages/core`

| Module | What it does | Status |
|--------|-------------|--------|
| `math/dti` | DTI ratio engine — regional thresholds (PH 40%, US 36%, SG 55%); zero-income handling | ✅ |
| `math/loans` | Amortization engine — Standard Amortized, Add-on, Interest-Only, Fixed Principal | ✅ |
| `math/currency` | `convertToBase`, `formatCurrency` | ✅ |
| `regional` | Strategy pattern — `getRegionByCurrency`, regional DTI/budget rules for PH/US/SG | ✅ |
| `analysis/dashboard` | `aggregateDashboardData` — full dashboard payload (used by mobile) | ✅ |
| `analysis/budget` | `generateSmartBudget` — 50/30 rule across expense categories | ✅ |
| `analysis/loans` | `aggregateLoanFinancials` — totalDebt, totalMonthlyInstallment, avgInterestRate, activeLoanCount | ✅ |
| `inference/loanStructure` | Numerical loan type classifier + Newton-Raphson EIR solver | ✅ |
| `schema/index` | All DB entity types, enums, `DTIRatioResult`, `LoanMetrics`, `UnifiedTransaction` | ✅ |

**Test coverage:** 33/33 tests pass. Core typecheck clean.

---

### Dashboard & Intelligence — `web` / `api`

| Feature | What it does | Status |
|---------|-------------|--------|
| `SecureImportZone` | Password-aware drag-and-drop upload component with client-side detection | ✅ |
| `CsvMapper` | Browser-side CSV parsing + intelligent column mapping | ✅ |
| `getHistoricalSummaries` | 12-month income/expense trend data | ✅ |
| `getSpendingByCategory` | Monthly spending grouped by category | ✅ |
| `Cash Flow Trend` | Bar chart visualization (Recharts) | ✅ |
| `Spending by Category` | Donut chart visualization (Recharts) | ✅ |
| `Currency Fallback` | Authorized preferred_currency usage | ✅ |

---

### API Layer — `packages/api`

| Module | What it does | Status |
|--------|-------------|--------|
| `queries/transaction` | `getTransactionsFiltered`, `getSummaryForPeriod`, `getHistoricalSummaries`, `getSpendingByCategory` | ✅ |
| `queries/loan` | `getAll`, `getById`, `getPayments`, `getPaymentSummaries` | ✅ |
| `queries/profile` | `get`, `update` | ✅ |
| `queries/goal` | `getAll` | ✅ |
| `queries/budget` | `getActive`, `getPeriods` | ✅ |
| `queries/exchange-rate` | `getLatest` | ✅ |
| `services/loans` | `getLoansPageData`, `getLoanDetail` — orchestrates queries + core math | ✅ |

---

### Web App — `apps/web`

| Feature | Route | Status |
|---------|-------|--------|
| Landing page | `/` | ✅ |
| Login — email + Google OAuth | `/login` | ✅ |
| Signup | `/signup` | ⚠️ Exists but orphaned — not linked from login |
| Forgot password | `/forgot-password` | ✅ |
| Password update (email link) | `/auth/update-password` | ✅ |
| Dashboard — snapshot strip, intelligence feed, right rail | `/dashboard` | ✅ |
| Transactions — timeline, filters, inline expand/edit/delete | `/dashboard/transactions` | ✅ |
| Transaction Import | `/dashboard/transactions/import` | ✅ |
| Loans list + metrics strip + upload entry | `/dashboard/loans` | ✅ |
| Loan detail + amortization schedule | `/dashboard/loans/[id]` | ✅ |
| Loan manual entry | `/dashboard/loans/new` | ✅ |
| Loan document upload | `/dashboard/loans/upload` | ✅ |
| Loan post-upload review | `/dashboard/loans/review` | ✅ |
| Loan example (static) | `/dashboard/loans/example` | ✅ |
| Plans — goals + budgets with full CRUD | `/dashboard/plans` | ✅ |
| Settings — profile edit, currency selector, delete account | `/dashboard/settings` | ✅ |
| Auth callback (OAuth PKCE) | `/auth/callback` | ✅ |
| Sign out | `/auth/signout` | ✅ |

---

### Backend & Infrastructure — `supabase/`

| Item | Status |
|------|--------|
| 16+ SQL migrations (schema, RLS, budgeting, loans, documents, compliance) | ✅ |
| `parse-loan-document` edge function — 3-tier AI pipeline + password support | ✅ |
| Explicit per-operation RLS policies | ✅ |
| Immutable audit log triggers (`system_audit_logs`) | ✅ |
| `sync-exchange-rates` cron | ✅ |
| `sync-market-data` cron | ✅ |
| `get-dashboard` edge function | ✅ |
| Row Level Security on all tables | ✅ |
| Storage bucket `user_documents` + signed URL policies | ✅ |

---

## 2. Active Priorities — P1 (Ship Now)

### P1-C — Advanced Analytics Drilldown
Deep drilldown pages for Cash Flow and DTI Simulator as requested in P3 backlog.

---

## 3. Next Sprint — P2

### P2-A — Dashboard charts (remaining 1)
1. **Net Worth Trend** — Needs asset tracking first.

### P2-B — Signup page cleanup
- Wire `/signup` into the login flow OR delete it and use unified auth entry.

### P2-E — Architectural Consolidation (Dry Principle)
- Create `packages/auth` and `packages/db` to centralize Supabase clients and query logic.

### P2-F — Realtime & Feed Scaling
- Transition unified timeline to pagination-first architecture.

---

## 4. Backlog — P3

### P3-A — Advanced Session Intelligence
- Session visibility dashboard with "Revoke All" capability.
- Implementation of login anomaly detection and geo-fencing checks.

### P3-B — CI/CD Security Pipelines
- Integrate `pnpm audit`, secret scanning (Gitleaks/TruffleHog), and automated RLS policy testing into the GitHub Actions workflow.

### P3-C — FX & Ledger Integrity
- **Versioned Exchange Rates:** Immutable snapshots of rates at the time of transaction.
- **Signed Ledgers:** Cryptographic signing of financial mutation events.

### P3-D — Observability & Incident Response
- Transaction spike detection and fraud monitoring alerts.
- Automated escalation workflows for security anomalies.

| # | Feature | Route | Notes |
|---|---------|-------|-------|
| 3 | Document Intelligence history | `/dashboard/documents` | Browse all uploaded documents. |
| 4 | Onboarding wizard | First-run modal | |
| 5 | Phase 10: Self-healing parser | Edge function | Automated telemetry for failed extractions. |

---

## 8. Completed Milestones

| Milestone | Description | Date |
|-----------|-------------|------|
| Greenfield Redesign | Pixel-perfect dashboard, unified ledger, core math centralization | 2026-05-08 |
| Stability Audit | May 2026 audit, logic fixes, type safety restoration | 2026-05-09 |
| Analytics V1 | Recharts integration, historical trends, currency fallbacks, legacy cleanup | 2026-05-10 |
| Secure Import & P1-B | Transaction import (CSV), explicit RLS, audit triggers, Zod validation | 2026-05-11 |
