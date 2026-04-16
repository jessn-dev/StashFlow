# FinTrack — Master Development Plan

> Last updated: 2026-04-14
> Active Branch: `feature/m6-income-web`
> Status: Milestone 6 — Income Module (Web)

---

## Working Rules (Non-Negotiable)

These rules govern every step of this project. They do not change unless explicitly requested.

1. **Plan before executing** — `plan.md` is always updated before any code is written or modified.
2. **Approval before milestones** — Every new milestone must be approved before execution begins. No exceptions.
3. **Requirements first** — A requirements document is iterated on until the problem is fully understood before any implementation starts.
4. **Source analysis before changes** — Existing code structure, dependencies, and runtime details are always analyzed before modifying anything.
5. **Tests before code** — A test suite is defined based on requirements before the implementation is written.
6. **Execution plan per milestone** — Every milestone includes a detailed list of exactly which files and folders will be created or modified.
7. **Latest stable versions** — All libraries, frameworks, and language runtimes must use the latest stable version that satisfies the project's compatibility requirements. No pinning to outdated versions without explicit justification. Version selections are documented in `agentic.md`.
8. **Session context file** — At the end of every working session, `agentic.md` is created or updated. It serves as the AI session cheat sheet and must include: high-level instructions, confirmed dependency versions, architecture diagrams, errors encountered, error fixes applied, and exactly where the session ended.

---

## Requirements Document

### Problem Statement
Users need a single cross-platform application (Web + iOS + Android) to:
- Track daily spending by category
- Log income (one-time and recurring)
- Manage loans with auto-generated installment schedules
- Monitor their debt-to-income (DTI) ratio in real time
- Work across multiple currencies with live exchange rates

### Target Users
- Individuals managing personal finances
- People with one or more active loans
- Users dealing with multiple currencies (expats, freelancers, international workers)

### Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User can sign up, log in, reset password | Critical |
| FR-02 | User can log an expense with amount, currency, category, date | Critical |
| FR-03 | User can log income with source, frequency, currency | Critical |
| FR-04 | User can add a loan (name, principal, rate, duration, start date) | Critical |
| FR-05 | System auto-generates full installment schedule on loan creation | Critical |
| FR-06 | User can mark a loan installment as paid | Critical |
| FR-07 | System calculates and displays DTI ratio in real time | Critical |
| FR-08 | User can view spending breakdown by category | High |
| FR-09 | User can convert amounts between currencies using live rates | High |
| FR-10 | Dashboard shows balance, DTI, cash flow, upcoming bills | High |
| FR-11 | Dark and light mode toggle | Medium |
| FR-12 | Upcoming payment reminders (push notifications) | Medium |
| FR-13 | CSV export of transactions | Low |
| FR-14 | Budget limits per category | Low |

### Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | App must work on Web, iOS, and Android from a single codebase (shared logic) |
| NFR-02 | All user data is isolated — no user can access another user's data (RLS) |
| NFR-03 | Currency rates cached for 24h to avoid excessive external API calls |
| NFR-04 | App must function on free-tier infrastructure until 50k MAUs |
| NFR-05 | Auth tokens stored securely (httpOnly cookie on web, SecureStore on mobile) |
| NFR-06 | TypeScript strict mode across all packages |
| NFR-07 | All shared business logic lives in packages/core — never duplicated |

### Out of Scope (Phase 1)
- Bank/account linking (Plaid, Mono)
- Premium subscription / paywall
- Multi-user / family accounts
- AI-powered financial advice

---

## Milestone Map

```
M0  — Requirements & Planning              ✅ Complete
M1  — Monorepo Scaffold                    ✅ Complete
M2  — Supabase Schema + RLS               ✅ Complete
M3  — Auth Flow (Web + Mobile)             ✅ Complete
M4a — Core Logic, API Layer & Seed Data    ✅ Complete
M4b — Live Dashboards (Web & Mobile)       ✅ Complete
M5  — Spending Module (Web)                ✅ Complete
M6  — Income Module (Web)                  ✅ Complete
M7  — Loans Module + Scheduler (Web)       🟡 In Progress
M8  — DTI Module (Web)                     ⏳ Pending
M9  — Currencies Module (Web)              ⏳ Pending
M10 — Mobile App (all screens)             ⏳ Pending
M11 — Edge Functions (3 functions)         ⏳ Pending
M12 — Testing Suite (full coverage)        ⏳ Pending
M13 — CI/CD + Deployment                   ⏳ Pending
```

---

## Milestone 0 — Requirements & Planning
**Status: ✅ Complete**

---

## Milestone 1 — Monorepo Scaffold
**Status: ✅ Complete**

---

## Milestone 2 — Supabase Schema + RLS
**Status: ✅ Complete**

---

## Milestone 3 — Auth Flow (Web + Mobile)
**Status: ✅ Complete (Testing Foundation Established)**

---

## Milestone 4a — Core Logic, API Layer & Seed Data
**Status: ✅ Complete (Core Logic Verified)**

---

## Milestone 4b — Live Dashboards (Web & Mobile)
**Status: ✅ Complete**

---

## Milestone 5 — Spending Module (Web)
**Status: ✅ Complete**

### Objective
Enable users to manage their expenses via a dedicated web interface with real-time updates to the dashboard.

### Delivered
- **API Layer**: Full CRUD for expenses implemented in `@fintrack/api`.
- **Expense Components**: Created `ExpenseForm`, `ExpenseList`, and `CategoryBreakdown` components.
- **Spending Page**: Developed `/dashboard/spending` with Server Actions for real-time updates.
- **UI Consistency**: Integration with `@fintrack/theme` and updated Dashboard UI labels.
- **API Tests**: Verified expense query logic with unit tests.

### Pending
- [ ] **Unit Tests (Web Components)**: (Technical Debt) Resolve "Invalid hook call" in Vitest for components using React 19 hooks.

---

## Milestone 6 — Income Module (Web)
**Status: 🟡 In Progress**

### Objective
Enable users to manage their income sources (one-time and recurring) via a dedicated web interface.

### Requirements Addressed
- FR-03: User can log income with source, frequency, currency.

### Source Analysis
- `public.incomes` table exists with RLS enabled.
- `income_frequency` enum exists in database ('one-time', 'weekly', 'monthly').
- Shared `@fintrack/api` needs methods for CRUD operations on income.

### Delivered
- **API Layer**: Created `packages/api/src/queries/income.ts` with full CRUD operations.
- **Income Components**: Developed `IncomeForm` and `IncomeList` using DaisyUI.
- **Income Page**: Created `/dashboard/income` with Server Actions for real-time updates.
- **Dashboard Integration**: Updated Dashboard summary cards and navigation to link to the Income module.
- **API Tests**: Verified income query logic with unit tests.

### Pending
- [ ] **Unit Tests (Web Components)**: (Technical Debt) Resolve "Invalid hook call" in Vitest for components using React 19 hooks.

---

## Milestones 7–13
**Detailed execution plans will be written and submitted for approval before each milestone begins.**

---

## Change Log

| Date | Change | Approved By |
|---|---|---|
| 2026-04-01 | Initial plan created, M0 complete | — |
| 2026-04-08 | Completed unit tests for @fintrack/core, @fintrack/api, and Web Auth | — |
| 2026-04-14 | M4b complete, Web upgraded to Next.js 16, M5 complete, M6 defined | — |
