# StashFlow — Changelog

> Versioned record of changes per release. Format: [Keep a Changelog](https://keepachangelog.com).
For current status and what is planned, see `docs/ROADMAP.md`.
For architecture context behind decisions, see `docs/DECISIONS.md`.

---

## [0.15.0] - 2026-05-13

### Added
- **P1-C Advanced Analytics Drilldown**
  - **Cash Flow Drilldown**: New page at `/dashboard/analytics/cash-flow` with 12-month trend chart and detailed tabular breakdown.
  - **DTI Simulator**: Interactive projected health tool at `/dashboard/analytics/dti-simulator` for testing financial scenarios.
  - **Core Simulation**: Migrated `simulateDTI` to `@stashflow/core/math/dti.ts` with fraction-based accuracy and full unit tests.
- **P2-A Asset Tracking & Net Worth**
  - **Multi-currency Assets**: New `assets` and `net_worth_snapshots` tables in Supabase with strict RLS and audit logging.
  - **Asset Management**: Dedicated management UI at `/dashboard/assets` for bank accounts, investments, and property.
  - **Live Net Worth Trend**: Replaced dashboard placeholder with real-time Recharts visualization calculating true Net Worth (Total Assets - Total Liabilities).
  - **API Extension**: Added `AssetQuery` and `NetWorthSnapshotQuery` to `@stashflow/api`.
- **P2-B Signup Page Cleanup**
  - **Unified Auth UI**: Standardized Signup page with high-fidelity Login design; extracted shared icons to `modules/auth`.
  - **Flow Integration**: Wired orphaned Signup link in Login page; corrected email confirmation redirect to `/auth/callback`.
  - **Code Quality**: Resolved type errors in signup page.

### Fixed
- **API Test Failure**: Corrected `dtiRatio` assertion in `loans.service.test.ts` (0–1 fraction vs 0–100 percentage).
- **Vitest Config**: Excluded `e2e` directory from web app unit tests to prevent runner collisions.
- **Import Types**: Resolved Supabase field name inconsistencies in transaction import page.

---

## [0.14.0] - 2026-05-10

### Added
- `apps/web/modules/dashboard/components/DebtPayoffChart.tsx` — AreaChart (recharts) showing total remaining debt declining to zero across all active loans. Indigo gradient fill, debt-free reference line, every-6th-month x-axis labels for long projections.
- `apps/web/app/dashboard/page.tsx` — `computeDebtPayoff()` helper: generates per-loan amortization schedules via `@stashflow/core`, offsets to current month, sums base-currency-converted remaining balances month-by-month. Null `interest_type` defaults to `Standard Amortized`.
- `apps/web/modules/dashboard/components/AnalyticsSection.tsx` — Debt Payoff Projection chart replaces bottom-right placeholder; accepts `payoffData: DebtPayoffPoint[]` prop.

### Fixed
- `packages/api/src/__tests__/loans.service.test.ts` — `mockPayment` fixture corrected to only use fields present in `Tables<'loan_payments'>` (`amount_paid`, `due_date`, `paid_date`, `status`, `created_at`). Previous fixture had `principal_component`, `interest_component`, etc. which don't exist in the DB schema and would fail `tsc --noEmit`.

### Infrastructure
- `.gitleaks.toml` — allowlist for Supabase local dev demo JWT (hardcoded in `20260506000002_documents_webhook.sql`) and known local dev passphrase patterns (`super-secret-jwt-token-with-at-least-32-characters-long`, `dev-secret-123`). Prevents CI secret scan false positives.
- `supabase/functions/.env.example` — documents all required edge function env vars with setup notes.
- `apps/web/vitest.config.ts` — vitest config with `jsdom` environment, 20% coverage thresholds, `modules/**` include pattern, `passWithNoTests: true` for zero-test packages.
- `apps/web/package.json` — added `test` + `test:coverage` scripts; added `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `jsdom` devDependencies. CI coverage enforcement for web is now wired.

### Schema
- `supabase/migrations/20260510000004_precision_upgrade.sql` (P2-C) — upgrades financial amount columns from `NUMERIC(12,2)` to `NUMERIC(18,6)` across `incomes`, `expenses`, `loans`, `loan_payments`, `exchange_rates`, `budgets`, `budget_periods`, `goals`. Interest rate columns upgraded to `NUMERIC(8,4)`. Run `pnpm gen:types` after applying.

---

## [0.13.0] - 2026-05-10

### Infrastructure
- `.github/workflows/ci.yml` — full rewrite; three jobs: `test` (typecheck + lint + unit tests with coverage), `security` (pnpm audit `--audit-level=high` + Gitleaks v8.27.2 secret scan), `e2e` (Playwright, PRs to `develop` only, depends on `test`). Branch triggers corrected to `main`/`develop`. Typecheck now uses `turbo run typecheck` instead of broken `build --filter="..."`. `concurrency` cancel-in-progress added to save CI minutes on rapid pushes.
- `docs/OPERATIONS.md` — CI/CD section updated to reflect actual job structure.
- P3-B security audit items now active: `pnpm audit` and Gitleaks run on every PR.

---

## [0.12.0] - 2026-05-10

### Fixed
- `apps/web/modules/loans/components/LoanForm.tsx` — removed `as any` from Supabase insert call; imported `LoanInterestType` and `LoanInterestBasis` from `@stashflow/core`; `interest_type` and `interest_basis` now use correct enum casts; `status: 'active' as const`; `loan_id` update uses `loan?.id ?? null` instead of `as never`. (TD-2)

### Infrastructure
- `supabase/functions/parse-loan-document/index.ts` — added `file_size` to document record select; MIME type whitelist gate (`application/pdf`, `image/jpeg`, `image/png`, `image/tiff`, `image/webp`) rejects unsupported types before storage download; 5MB hard cap rejects oversized files with `FILE_TOO_LARGE` / `UNSUPPORTED_TYPE` structured errors stored to `processing_error` column. (P2-D partial)

### Tests
- `packages/api/src/__tests__/loans.service.test.ts` — 11 tests for `LoansService.getLoansPageData` and `LoansService.getLoanDetail`; mock factory pattern (`makeLoanQuery`, `makeExchangeRateQuery`, `makeProfileQuery`, `makeTransactionQuery`); covers currency fallback, zero-income DTI, paidPercent math, null loan guard, and no-payments-fetched assertion. (TD-3)

---

## [0.11.0] - 2026-05-10

### Added
- **P1-A Secure Transaction & Document Import**
  - **`SecureImportZone`**: High-fidelity React component for drag-and-drop uploads with client-side encryption detection.
  - **`CsvMapper`**: Intelligent column mapping UI with live data preview and automated header detection.
  - **Client-Side PDF Intelligence**: Implemented `lib/utils/pdf.ts` for proactive password detection using `pdfjs-dist`.
  - **Bulk Import Integration**: Enabled direct transaction imports into the unified timeline via `/dashboard/transactions/import`.
  - **Password-Protected Documents**: Refactored `LoanUploadZone` and `parse-loan-document` edge function to support encrypted PDF statements via manual password entry headers.

### Security
- **P1-B Security Hardening**
- `apps/web/middleware.ts` created — scoped matcher covers `/dashboard/*`, `/login`, `/`, `/auth/*` only. Handles `@supabase/ssr` session refresh, unauthenticated redirect to `/login`, and authenticated redirect to `/dashboard`. `proxy.ts` deleted — it was dead code; Next.js never picks up a `proxy.ts` file regardless of what it exports. Session refresh and route protection were both silently not running since the greenfield rewrite. See ADR-015.
- `supabase/migrations/20260510000001_explicit_rls_policies.sql` — replaced all `FOR ALL` blanket policies with explicit `SELECT`, `INSERT`, `UPDATE`, `DELETE` per table, each with `WITH CHECK (auth.uid() = user_id)`. Affected: `incomes`, `expenses`, `loans`, `loan_payments`, `loan_fees`, `goals`, `budgets`, `budget_periods`, `documents`, `category_metadata`.
- `supabase/migrations/20260510000002_audit_log_triggers.sql` — `log_financial_mutation()` trigger function (`SECURITY DEFINER`) + triggers on `incomes`, `expenses`, `loans` for INSERT/UPDATE/DELETE. Writes to `system_audit_logs` with entity ID, table name, and operation — no PII.
- `supabase/functions/_shared/validate.ts` — `parseBody(req, schema)` helper wrapping Zod `safeParse`; returns typed data or 400 Response.
- `supabase/functions/import_map.json` — added `"zod": "npm:zod@3"`.
- `supabase/functions/delete-account/index.ts` — replaced ad-hoc body parsing with `parseBody(req, DeleteAccountSchema)`; `userId` validated as UUID string; 401/403/500 now correctly separated (was all 400).

### Fixed
- **Commit Block**: Resolved `lint-staged` path passing bug causing Turborepo "Missing tasks" errors.

---

## [0.10.0] - 2026-05-10

### Added
- `docs/ARCHITECTURE.md` — full architecture reference (system overview, domain boundaries, auth flows, AI pipeline, shared packages)
- `docs/DATA_MODEL.md` — complete DB schema documentation with column-level notes, relationships, currency handling, precision strategy
- `docs/DECISIONS.md` — 14 ADRs covering all key architectural decisions from foundation to current
- `docs/SECURITY.md` — full threat model, auth model, RLS strategy, token management, file upload security, audit logging, incident response, dependency security, and security checklist
- `docs/OPERATIONS.md` — environments, local setup, CI/CD pipeline, DB migration procedures, rollback, disaster recovery
- `docs/API.md` — complete API reference for all Supabase client operations and edge functions
- `docs/CONTRIBUTING.md` — branching strategy, commit standards, PR requirements, testing requirements, security guidelines
- `docs/README.md` — full project overview with correct current stack, monorepo structure, local dev setup

### Changed
- All docs aligned to governance spec in `docs/stashflow_engineering_governance_documentation_suite.md`
- ROADMAP.md restructured to Vision/Strategy format with all P1/P2/P3/mobile priorities preserved

### Infrastructure
- `docs/OPERATIONS.md` — Deployment Process section replaced with complete First-Time Deploy Runbook. Phase 0 (Platform Setup) covers step-by-step account creation and credential collection for Supabase (project creation, where to find ref/anon/service_role keys, enabling pg_net), Vercel (import wizard settings, finding VERCEL_TOKEN/ORG_ID/PROJECT_ID), all AI API keys (Groq/Gemini/Anthropic/Vision), and Google OAuth (Cloud Console config + Supabase Auth configuration). Phases 1–8 cover CLI operations: link, migrations, secrets, pg_net trigger SQL, edge function deploy, Vercel CLI link, GitHub Actions secrets (exact UI path), CI deploy job YAML. Post-deploy smoke test checklist (11 items). Full environment variable reference table (15 vars).
- `apps/web/vercel.json` — monorepo install command override (`cd ../.. && pnpm install --frozen-lockfile`) so Vercel can resolve workspace packages from the repo root when root directory is set to `apps/web`.

---

## [0.9.0] - 2026-05-10

### Added
- `recharts` installed in `apps/web`
- `TransactionQuery.getHistoricalSummaries(userId, months)` — 12-month income/expense trend data
- `TransactionQuery.getSpendingByCategory(userId, period)` — monthly spending grouped by expense category
- `DashboardCharts.tsx` — `CashFlowChart` (12-month bar chart) and `SpendingPieChart` (categorical donut)
- `AnalyticsSection.tsx` updated to display real chart data (was placeholder)
- Dashboard currency fallback: `profile.preferred_currency` now authoritative base currency

### Security
- Comprehensive production-readiness security audit conducted; findings incorporated into ROADMAP.md as P1-B Critical Security Hardening
- Identified gaps: `FOR ALL` RLS policies (need per-operation), missing `system_audit_logs` triggers for financial mutations, no Zod validation in edge functions, middleware auth amplification

### Infrastructure
- Deleted 200+ legacy v1 files: `components/`, old auth routes (`app/(auth)`), Tamagui configurations
- `apps/web/next.config.ts` — removed Tamagui plugins, standardized `@stashflow` package transpilation
- `apps/mobile/tsconfig.json` + `nativewind-env.d.ts` — clean `tsc` build confirmed
- Tamagui officially deprecated — web uses Tailwind CSS 4 exclusively

---

## [0.8.0] - 2026-05-09

### Added
- `gen:types` script in root `package.json` — `supabase gen types typescript --local | tail -n +2 > packages/core/src/schema/database.types.ts` (`tail -n +2` strips CLI update notice that caused TS parse errors)
- `apps/web/modules/settings/components/ProfileEditForm.tsx` — full name + preferred currency selector; calls `ProfileQuery.update()`; `router.refresh()` on save
- `apps/web/modules/settings/components/DeleteAccountButton.tsx` — two-step confirm; calls `delete-account` edge function with `session.access_token`; signs out on success
- `supabase/functions/delete-account/index.ts` — validates JWT, checks `body.userId === user.id` (IDOR prevention), uses service role for `admin.deleteUser()`
- `apps/web/modules/plans/components/GoalForm.tsx` — create + update; fields: name, type, currency, target/current amounts, deadline
- `apps/web/modules/plans/components/GoalDrawer.tsx` — slide-over wrapping `GoalForm`; Escape key closes
- `apps/web/modules/plans/components/BudgetEditor.tsx` — inline per-category budget editing; live spend-vs-budget bars; bulk upsert on save
- `apps/web/modules/plans/components/PlansClient.tsx` — `'use client'` shell; accepts `budgetPeriods: BudgetPeriod[]` array (not Map — not JSON-serializable across RSC boundary)
- `IGoalQuery.create`, `update`, `delete` — extended interface + implementation
- `IBudgetQuery.upsert`, `delete` — `ON CONFLICT (user_id, category)` upsert for budget singleton per user per category
- `GoalInput` type in `packages/api/src/queries/interfaces.ts`

### Changed
- `GoalCard.tsx` converted to `'use client'`; Edit opens pre-populated `GoalDrawer`; Delete two-step confirm → `GoalQuery.delete()` → `router.refresh()`
- `apps/web/app/dashboard/plans/page.tsx` — RSC now delegates to `PlansClient`; passes `budgetPeriods` array instead of Map
- Settings page replaced dead "Edit Profile" and "Delete Account" buttons with functional components

### Fixed
- `exactOptionalPropertyTypes` violation: conditional spread `{...(x !== undefined ? { prop: x } : {})}` applied to all optional prop passes
- `BudgetEditor` was referencing `period.actual_spend` (non-existent); corrected to `period.spent`
- Orphaned legacy files (`settings/actions.ts`, `settings/SettingsUI.tsx` with Tamagui import) removed; `actions.ts` replaced with no-op stub to prevent cascade errors

### Security
- `delete-account` edge function validates `userId` in request body matches JWT subject before calling `admin.deleteUser()` — prevents IDOR

---

## [0.7.0] - 2026-05-08

### Added
- Dashboard rebuilt against `docs/stashflow_dashboard_pixel_perfect_ui_spec.md`
- `SidebarNav.tsx` — `'use client'`; PRIMARY/SECONDARY/UTILITY nav sections; active state `bg-gray-900 text-white`
- `FinancialSnapshotStrip.tsx` — 6 metric cards: Net Cash Flow, Net Worth, Total Liabilities, Savings Rate, DTI (colored dot), Active Loans
- `IntelligenceFeed.tsx` — 5 item type configs; high-priority health items flip red; auto-generates items from data
- `RightUtilityRail.tsx` — upcoming payments (30 days), DTI + savings rate progress bars, plans CTA
- `AnalyticsSection.tsx` — chart placeholders at exact spec dimensions
- Transactions rebuilt against `docs/stashflow_transactions_foundation_and_ux_flow_spec.md`
- `TransactionSummaryStrip.tsx` — 4 tiles: Net Flow, Income, Expenses, Transaction count
- `TransactionFiltersBar.tsx` — 400ms debounced search, date presets (7D/30D/Month/Last Mo./Quarter/Year), type tabs; all changes use `router.replace()` in `startTransition`
- `TransactionTimeline.tsx` — date-grouped (Today/Yesterday/Earlier This Week/Earlier This Month/Older); inline expansion with core details + exchange metadata; Edit opens pre-populated drawer; Delete two-step confirm
- `TransactionDrawer.tsx` — slide-over; `initialData?: UnifiedTransaction` for edit mode; Escape key closes
- `TransactionPageActions.tsx` — owns Add Transaction drawer state
- `apps/web/app/forgot-password/page.tsx` — `resetPasswordForEmail({ redirectTo })` with success banner
- `apps/web/app/auth/update-password/page.tsx` — password + confirm, min 8 chars, `updateUser({ password })` → `/dashboard`
- Plans scaffold — `GoalCard`, `BudgetCategoryRow`; parallel RSC fetches
- `TransactionQuery.getTransactionsFiltered` and `getSummaryForPeriod` — new API methods
- `PeriodSummary` type (extends `TransactionSummary` with `count: number`)
- `TransactionFilterOpts` interface

### Changed
- `packages/core/src/schema/database.types.ts` regenerated (926 lines); new tables: `ai_insights_cache`, `system_audit_logs`; new columns on `loans`: `inference_confidence`, `inference_source`
- `expense_category` enum: `savings` removed; fixed `generateSmartBudget` and its test
- `Json` type now exported from `@stashflow/core` — fixes TS2883 on Supabase client helpers
- `DTIRatioResult` moved from `math/dti.ts` → `schema/index.ts` (SOLID: types in schema layer)
- `LoanMetrics` moved from `api/services/loans.ts` → `packages/core/src/schema/index.ts`
- `LoanAggregates` interface + `aggregateLoanFinancials(loans, rates)` added to `packages/core/src/analysis/loans.ts`; `LoansService` now calls this instead of inline loops

### Fixed
- Login page "Forgot password?" changed from dead `<span>` to `<Link href="/forgot-password">`

### Infrastructure
- `packages/api/src/services/dashboard.ts` deleted — unused; test file deleted with it
- `DashboardServiceFactory` removed from `factory.ts`; only `LoansServiceFactory` remains
- Orphaned routes `app/dashboard/budgets/` and `app/dashboard/goals/` deleted
- `packages/api/vitest.config.ts` — added `passWithNoTests: true`

---

## [0.6.0] - 2026-05-07

### Added
- `packages/core/src/inference/loanStructure.ts` — `inferLoanStructure(input)`: numerical 3-stage classifier (hard rules → benchmark matching → contextual boost); `computeAddOnEIR(flatRatePct, months)` Newton-Raphson IRR solver
- 15 inference tests covering all loan types, hard rules, EIR convergence, edge cases
- `supabase/migrations/20260507000002_loan_inference_metadata.sql` — `inference_confidence NUMERIC(4,2)`, `inference_source TEXT` on `loans`
- LoanForm inference UX: `useMemo` runs `inferLoanStructure` on every field change; `useEffect` auto-applies inferred type when confidence ≥ 60% and user hasn't overridden; green/amber banner
- `computeAddOnEIR` shown as 4th "Effective Rate" card in `LoanForm` for add-on loans

### Fixed
- **CRITICAL** — `packages/api/src/services/loans.ts:90` — `annualInterestRate: loan.interest_rate` → `loan.interest_rate / 100`. Raw DB percentage integer (12) was passed where decimal (0.12) was expected. Caused remaining balance to use 100× the actual rate.
- **HIGH** — `LoanForm.tsx` — `userOverrodeInterestType` initialized to `false` caused inference `useEffect` to overwrite document-extracted `interest_type`. Fixed: initialize from `extractedFields.includes('interest_type')`.
- **MEDIUM** — `computeAddOnEIR` Newton-Raphson — added `Math.abs(fprime) < 1e-14` guard to prevent division by near-zero.

---

## [0.5.0] - 2026-05-06

### Added
- `supabase/functions/parse-loan-document/index.ts` — 3-tier AI pipeline: `unpdf` text extraction (free) → deterministic regex parser → Google Vision OCR (if confidence < 0.85) → Groq → Gemini → Claude (if confidence < 0.70)
- `supabase/functions/_shared/document-parser/` — `types.ts`, `inspect.ts`, `extract/pdf.ts`, `extract/vision.ts`, `parse/loan.ts`, `score.ts`
- `supabase/migrations/20260507000001_documents_pipeline_columns.sql` — `extraction_source`, `processing_error JSONB`, `processing_attempts INT`, `last_processed_at TIMESTAMPTZ` on `documents`
- `DocumentStatusWatcher.tsx` — 90s client-side timeout; `processing_error.code` mapped to user-facing messages
- `system_audit_logs` table — GDPR/GLBA append-only audit trail
- TOTP-based MFA via Supabase Auth; `MfaManager` component in settings; mandatory challenge step at login
- `MfaNudgeBanner` — global MFA enrollment nudge with `sessionStorage` dismissal
- `COMPLIANCE.md`, `SECURITY_POLICIES.md`, `SIRP.md` authored

### Fixed
- Amortization offset: `remainingBalance` when `paidCount === 0` now returns `loan.principal` (was returning balance after first payment)
- DTI zero-income: engine returned `isHealthy: true, ratio: 0` when debts existed with no income. Now returns `isHealthy: false, ratio: 1`
- Loan rate extraction: `Annual EIR:` regex was missing from PH loan parser; added as priority-1 pattern
- Regex double-backslash bug: `/annual\\s*EIR/` used literal backslash+s. Rewritten as `new RegExp(...)` string form
- `apps/web/app/dashboard/loans/[id]/page.tsx` — missing `/100` on `interest_rate` before `generateAmortizationSchedule`
- `LoanForm.tsx` review preview: summary cards now use `installment_amount` if non-zero; formula is fallback only
- `apps/web/app/login/page.tsx` — potential crash accessing `enrolledFactors[0].id` without checking array length
- `apps/web/app/signup/page.tsx` — field error clearing changed from `undefined` to `""` (type mismatch)
- `packages/core/src/math/loans.ts` — `date.toISOString().split('T')[0]` non-null assertion added
- `apps/mobile/package.json` — was running `next lint` (invalid for Expo); changed to `tsc --noEmit`

### Infrastructure
- `unpdf@0.11.0` used instead of `pdfjs-dist` — `pdfjs-dist` via esm.sh pulls in `canvas.node` (native binary) that crashes the Deno edge runtime
- `turbo.json` — output mode changed from `"tui"` to `"stream"` (was unreadable in CI logs)
- Webhook-triggered edge functions: `parse-loan-document` uses `SUPABASE_SERVICE_ROLE_KEY` + validates `x-webhook-secret`; `verify_jwt` stays enabled; trigger sends real JWT signed with local JWT secret
- `./setup.sh db:jwt` — generates dev service role JWT from running Postgres, updates pg_net trigger, stores in `supabase/functions/.env` as `DEV_SERVICE_ROLE_JWT`
- `apps/web/package.json` — added `@playwright/test`; `playwright.config.ts` — `workers: undefined` → numeric value

---

## [0.4.0] - 2026-04-30

### Added
- 16 SQL migrations covering: initial schema, advanced budgeting, profile rollover, advanced loan engine, secure documents, loan lender, contingency protocol, loan completion timestamp, market intelligence, budget automation, currency on market trends
- RLS policies on all user-owned tables
- `ai_insights_cache` with `(region, currency, data_version_hash)` composite key; 24h TTL; rate limit 5 AI advisor calls/user/day enforced at DB level
- `user_documents` storage bucket with signed URL policies and `{user_id}/` storage isolation
- `get-dashboard` edge function — aggregates net worth, DTI, cashflow, recent activity
- `calculate-dti` edge function — regional DTI with PH/US/SG thresholds
- `macro-financial-advisor` edge function — AI insights with cache layer; Gemini 1.5 Flash → Groq/Llama3.3 fallback on 429
- `sync-exchange-rates` cron function — validates `CRON_SECRET` header; hourly FX rate refresh
- `sync-market-data` cron function — FRED® API macro data sync
- GitHub Actions CI pipeline: install → typecheck → test (coverage gates) → Playwright E2E (PR to develop only)
- `system_audit_logs` table (initial, pre-triggers)

### Infrastructure
- Deno workspace: `deno.json` registers `@stashflow/core` as Deno workspace member; edge functions resolve it directly without `_shared/` copies
- CI coverage gates: `@stashflow/core` 90%, `@stashflow/api` 70%, `apps/web` 20%
- Husky pre-commit hooks: `pnpm test --filter=...[HEAD]` on `*.{ts,tsx}` — affected packages only

---

## [0.3.0] - 2026-04-24

> Greenfield rewrite on an orphan branch. Prior v1 codebase superseded. All prior architectural decisions carried forward; implementation rebuilt from scratch with corrected patterns.

### Added
- Turborepo monorepo scaffold on orphan branch: `packages/core`, `packages/api`, `packages/ui`, `packages/theme`, `apps/web`, `apps/mobile`
- `tsconfig.base.json` — `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: bundler`
- `pnpm-workspace.yaml`, `turbo.json`, `deno.json`
- `@stashflow/core` — `math/dti`, `math/loans`, `math/currency`, `regional/` (Strategy pattern), `analysis/dashboard`, `analysis/budget`, `schema/index`; 33 tests, 90%+ coverage
- `@stashflow/api` — `queries/transaction`, `queries/loan`, `queries/profile`, `queries/goal`, `queries/budget`, `queries/exchange-rate`, `services/loans`; all queries implement interfaces (Dependency Inversion)
- Dependency injection pattern throughout: all queries accept Supabase client as constructor parameter

### Breaking Changes
- v1 codebase abandoned. All v1 routes, components, and services replaced. No migration path — clean slate.

---

## [0.2.0] - 2026-04-14 to 2026-04-19

> Pre-greenfield v1 build: modules, intelligence, compliance. Superseded by v0.3.0 greenfield rewrite.

### Added (2026-04-14 to 2026-04-16)
- Next.js 14 → 16 upgrade (React 19.2.5; `cookies()` and `headers()` now async)
- `@stashflow/theme` package — centralized design tokens
- M5 Spending Module: `listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`, `getExpenseSummary(month)`. `/dashboard/spending` route.
- M6 Income Module: `listIncome`, `createIncome`, `updateIncome`, `deleteIncome`, `getIncomeSummary(month)`. `/dashboard/income` route.
- M7 Loans Module: `createLoan`, `deleteLoan`, `getLoan`, `getLoanPayments`, `togglePaymentStatus`. `/dashboard/loans` and `/dashboard/loans/[id]`.
- M10 Advanced Budgeting: per-category budget limits with rollover; `sync_budget_period` Postgres trigger auto-updates monthly budget snapshot on expense insert
- M11 Edge functions scaffold: `get-dashboard`, `get-cash-flow`, `calculate-dti` stubbed
- `generateAmortizationSchedule` — Standard Amortized, Add-on, Interest-Only, Fixed Principal; day-count conventions 30/360, Actual/360, Actual/365

### Added (2026-04-17 to 2026-04-19)
- `sync-market-data` edge function: FRED® API macro sector trend data → `market_trends` table
- Contingency Protocol ("Survival Mode"): one-click mode pauses discretionary goals; stored as `contingency_mode_active` on `profiles`
- Elite Dashboard V7: Financial Assistant model (See → Understand → Fix); SVG line charts; Smart Budget Drawer
- `macro-financial-advisor`: Gemini 1.5 Flash → Groq/Llama3.3 dual-provider fallback
- 94%+ branch coverage on `@stashflow/core`

---

## [0.1.0] - 2026-04-01 to 2026-04-08

> Initial project kickoff. Foundation, auth, core logic, first dashboard.

### Added
- Product scope defined: multi-currency personal finance for PH/US/SG users
- Supabase as sole backend (Auth + Postgres + Edge Functions + Storage)
- Turborepo monorepo: `packages/core`, `packages/api`, `packages/theme`, `apps/web`, `apps/mobile`
- TypeScript `strict: true` with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `moduleResolution: bundler`
- Initial Supabase schema: `profiles`, `incomes`, `expenses`, `loans`, `loan_payments`, `goals`, `budgets`, `budget_periods`, `exchange_rates`
- RLS on all tables from day one
- Auth flow: email/password sign-up + sign-in, Google OAuth (PKCE), password reset; JWT in httpOnly cookies (web), SecureStore (mobile)
- `@stashflow/core` v0: DTI engine, amortization engine (Standard Amortized), currency conversion, regional strategies (PH/US/SG)
- `@stashflow/api` v0: typed Supabase query functions for all tables; dependency injection pattern
- Web dashboard: Net Worth, Monthly Cash Flow, Total Liabilities, DTI metric cards; loan summary; recent activity
- Mobile dashboard stub: `DashboardScreen.tsx` with `useDashboardData` hook
- `aggregateDashboardData` in `@stashflow/core`: computes all 6 dashboard metrics from raw DB data
- Unit tests: auth flow, core logic (DTI all regions, amortization all types, currency), API layer; ≥90% coverage on `core`, ≥70% on `api`

### Security
- RLS enabled on all tables before any data is stored — not retrofitted
- JWT never in `localStorage` or `sessionStorage` from the start
