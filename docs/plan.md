# FinTrack — Master Development Plan

> Last updated: 2026-04-07
> Active Branch: `feature/m3-m4a-AuthTest-CoreTest`
> Status: Milestone 4 — Dashboard, Core Packages & Testing

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
M4a — Core Logic, API Layer & Seed Data    🟡 In Progress
M4b — Live Dashboards (Web & Mobile)       ⏳ Pending
M5  — Spending Module (Web)                ⏳ Pending
M6  — Income Module (Web)                  ⏳ Pending
M7  — Loans Module + Scheduler (Web)       ⏳ Pending
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

- [x] App concept defined
- [x] Tech stack chosen (Next.js 15, Expo 54, Supabase, Turborepo)
- [x] System architecture documented
- [x] API design documented (all endpoints, types, Edge Functions)
- [x] UI/UX prototype built (interactive, dark/light mode)
- [x] Database schema designed
- [x] Branch strategy defined
- [x] README.md generated
- [x] plan.md created

---

## Milestone 1 — Monorepo Scaffold
**Status: ✅ Complete**

### Objective
Initialize the full project structure so all future milestones have a working foundation.

### Requirements Addressed
- NFR-01 (cross-platform shared codebase)
- NFR-06 (TypeScript strict mode)
- NFR-07 (shared logic in packages/core)

### Delivered
- Turborepo workspace with pnpm
- `apps/web` (Next.js 15), `apps/mobile` (Expo 54)
- `packages/core`, `packages/ui`, `packages/api` (shells)
- **Enhanced `setup.sh`**: Automated bootstrap, local Supabase lifecycle management, dynamic port configuration, and automatic environment variable synchronization (`.env` / `.env.local`).
- TypeScript strict mode across all packages

---

## Milestone 2 — Supabase Schema + RLS
**Status: ✅ Complete**

### Objective
Full database schema with Row Level Security so data is isolated per user from day one.

### Delivered
- 6 tables: profiles, incomes, expenses, loans, loan_payments, exchange_rates
- RLS policies enforcing `user_id = auth.uid()` on all user tables
- Auto-generated TypeScript types in `packages/core/src/types/database.types.ts`
- Custom enums: expense_category, loan_status, payment_status, income_frequency
- Local Supabase dev environment via Docker

---

## Milestone 3 — Auth Flow (Web + Mobile)
**Status: 🟡 In Progress**

### Objective
Secure login/signup and session management across both platforms.

### Requirements Addressed
- FR-01 (sign up, log in, reset password)
- NFR-05 (secure token storage)

### Delivered — Web
- `@supabase/ssr` with Next.js 15 async `cookies()` compliance
- Modular Server Actions for Login and Signup flows
- **Reset Password flow** (forgot-password, reset-password pages + actions)
- **Auth Callback route** for email verification and password resets
- Landing page with Chart.js and scroll animations
- Secure routing via Supabase Middleware
- POST `/auth/signout` route for secure session termination
- Two-Tone design system (Tailwind v3 + DaisyUI)

### Delivered — Mobile
- `@supabase/supabase-js` with custom `expo-secure-store` adapter
- Global `AuthContext` for session management
- Conditional routing orchestrator in `App.tsx`
- **UI Parity**: LoginScreen mirrors the Web "Two-Tone" design and dynamic states.

### Pending
- [ ] **Unit Tests (Web)**: Unit tests for Forgot Password and Reset Password flows.
- [ ] **Unit Tests (Mobile)**: Auth flow tests in Mobile app (none currently exist).

---

## Milestone 4a — Core Logic, API Layer & Seed Data
**Status: 🟡 In Progress**

### Objective
Build foundational shared packages, verify them with tests, and provide a realistic local development environment.

### Delivered
- **Shared Types**: Unified `Transaction`, `DashboardSummary`, and Database types in `@fintrack/core`.
- **Shared Utilities**: `formatCurrency`, `convertAmount`, `calculateDTIRatio`, `generateInstallmentSchedule`.
- **API Layer**: Shared Supabase query functions in `@fintrack/api`.

### Pending
- [ ] **Unit Tests**: Full coverage for `@fintrack/core` and `@fintrack/api`.

---

## Milestone 4b — Live Dashboards (Web & Mobile)
**Status: 🟡 In Progress**

### Objective
Connect both platforms to the live data layer and implement the "Two-Tone" design language.

### Delivered
- **Web Dashboard Integration**: Live summary cards and recent transactions list fetching from `@fintrack/api`.
- **Mobile Dashboard Integration**: Fully functional dashboard screen mirroring the Web UI with summary cards and live transaction data.
- **Monorepo Integration**: Fixed TypeScript path resolution and workspace dependency linking across all packages.
- **Dev Standards**: Explicit dev ports (Web: 3000, Mobile: 8081).

### Pending
- [ ] **Unit Tests (Web)**: Test live dashboard data rendering and formatting.
- [ ] **Unit Tests (Mobile)**: Test mobile dashboard data display and refresh logic.
- [ ] **Seed Data Persistence**: Resolve "Invalid Credentials" error when logging in with `test@fintrack.com` on local Supabase.
- [ ] **Seed Data Validation**: Ensure `seed.sql` reliably creates a working test user.

---

## Milestones 5–13
**Detailed execution plans will be written and submitted for approval before each milestone begins.**

Each will follow the same structure: Objective, Requirements addressed, Pre-execution source analysis, Test criteria, Exact files and folders to create/modify.

---

## Change Log

| Date | Change | Approved By |
|---|---|---|
| 2026-04-01 | Initial plan created, M0 complete | — |
| 2026-04-01 | Rules 7 & 8 added (latest stable versions + agentic.md) | — |
| 2026-04-06 | Consolidated plan.md, defined M4 scope | — |
| 2026-04-06 | Split M4 into M4a and M4b, added seed data requirement | — |
| 2026-04-07 | Enhanced setup.sh (Supabase port/env automation) | — |
| 2026-04-07 | Branched to feature/m3-m4a-AuthTest-CoreTest; moved seed tasks to M4b | — |
