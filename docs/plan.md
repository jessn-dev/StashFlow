# FinTrack — Master Development Plan

> Last updated: 2026-04-01
> Status: Phase 0 — Planning & Requirements

---

## 🔒 Working Rules (Non-Negotiable)

These rules govern every step of this project. They do not change unless explicitly requested.

1. **Plan before executing** — A `plan.md` is always updated before any code is written or modified.
2. **Approval before milestones** — Every new milestone must be approved before execution begins. No exceptions.
3. **Requirements first** — A requirements document is iterated on until the problem is fully understood before any implementation starts.
4. **Source analysis before changes** — Existing code structure, dependencies, and runtime details are always analyzed before modifying anything.
5. **Tests before code** — A test suite is defined based on requirements before the implementation is written.
6. **Execution plan per milestone** — Every milestone includes a detailed list of exactly which files and folders will be created or modified.
7. **Latest stable versions** — All libraries, frameworks, and language runtimes must use the latest stable version that satisfies the project's compatibility requirements. No pinning to outdated versions without explicit justification. Version selections are documented in `agentic.md`.
8. **Session context file** — At the end of every working session, `agentic.md` is created or updated. It serves as the AI session cheat sheet and must include: high-level instructions, confirmed dependency versions, architecture diagrams, errors encountered, error fixes applied, and exactly where the session ended.

---

## 📋 Requirements Document

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

## 🗺️ Milestone Map

```
M0  ── Requirements & Planning          ✅ Complete
M1  ── Monorepo Scaffold                ✅ Complete
M2  ── Supabase Schema + RLS            ✅ Complete
M3  ── Auth Flow (Web + Mobile)         ⏳ Pending
M4  ── Core Package (types, utils)      ⏳ Pending
M5  ── API Package (Supabase queries)   ⏳ Pending
M6  ── Dashboard (Web)                  ⏳ Pending
M7  ── Spending Module (Web)            ⏳ Pending
M8  ── Income Module (Web)              ⏳ Pending
M9  ── Loans Module + Scheduler (Web)   ⏳ Pending
M10 ── DTI Module (Web)                 ⏳ Pending
M11 ── Currencies Module (Web)          ⏳ Pending
M12 ── Mobile App (all screens)         ⏳ Pending
M13 ── Edge Functions (3 functions)     ⏳ Pending
M14 ── Testing Suite                    ⏳ Pending
M15 ── CI/CD + Deployment               ⏳ Pending
```

---

## ✅ Milestone 0 — Requirements & Planning
**Status: Complete**

### Deliverables Completed
- [x] App concept defined
- [x] Tech stack chosen (Next.js 14, Expo, Supabase, Turborepo)
- [x] System architecture documented
- [x] API design documented (all endpoints, types, Edge Functions)
- [x] UI/UX prototype built (interactive, dark/light mode)
- [x] Database schema designed
- [x] Branch strategy defined (`poc/initial-planning`, `develop`, `main`)
- [x] README.md generated
- [x] plan.md created (this file)

---

## ✅ ⏳ Milestone 1 — Monorepo Scaffold
**Status: Complete ✋**

### Objective
Initialize the full project structure so all future milestones have a working foundation to build on.

### Requirements Addressed
- NFR-01 (cross-platform shared codebase)
- NFR-06 (TypeScript strict mode)
- NFR-07 (shared logic in packages/core)

### Pre-Execution Analysis Needed
- [ ] Confirm Node.js version target (18+)
- [ ] Confirm package manager (pnpm recommended for monorepos)
- [ ] Confirm Turborepo version compatibility with Next.js 14 + Expo SDK 51+

### Test Criteria (must pass before M2)
- [ ] `pnpm install` completes with no errors
- [ ] `pnpm --filter web dev` starts Next.js dev server
- [ ] `pnpm --filter mobile start` launches Expo dev server
- [ ] `packages/core` can be imported by both `web` and `mobile` without errors
- [ ] TypeScript compiles with zero errors across all packages
- [ ] Turborepo build pipeline runs successfully

### Execution Plan — Files & Folders to Create

```
fintrack/
├── package.json                  # Root — pnpm workspaces
├── pnpm-workspace.yaml           # Workspace definitions
├── turbo.json                    # Turborepo pipeline config
├── tsconfig.base.json            # Shared TS config
├── .gitignore
├── .env.example
│
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── app/
│   │   │   └── layout.tsx        # Root layout (placeholder)
│   │   └── .env.example
│   │
│   └── mobile/
│       ├── package.json
│       ├── tsconfig.json
│       ├── app.json              # Expo config
│       ├── app/
│       │   └── index.tsx         # Entry screen (placeholder)
│       └── .env.example
│
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts          # Barrel export
    │       ├── types/
    │       │   └── index.ts      # Placeholder types
    │       └── utils/
    │           └── index.ts      # Placeholder utils
    │
    ├── ui/
    │   ├── package.json
    │   └── src/
    │       └── index.ts
    │
    └── api/
        ├── package.json
        └── src/
            └── client.ts         # Supabase client init
```

### Estimated Effort
~1 session

---

## ✅ ⏳ Milestone 2 — Supabase Schema + RLS
**Status: Complete**

### Objective
Create the full database schema with Row Level Security policies so data is isolated per user from day one.

### Execution Plan (High Level)
- Write SQL migration files for all 5 tables
- Define RLS policy for each table (`user_id = auth.uid()`)
- Seed file with sample data for development
- Supabase types auto-generated via CLI

### Test Criteria
- [ ] All 5 tables created successfully in Supabase
- [ ] RLS blocks cross-user data access (verified via Supabase dashboard)
- [ ] TypeScript types generated from schema with no errors
- [ ] Seed data inserts without constraint violations

---

## ⏳ Milestones 3–15
**Detailed execution plans will be written and submitted for approval before each milestone begins.**

Each will follow the same structure:
- Objective
- Requirements addressed
- Pre-execution source analysis
- Test criteria
- Exact files and folders to create/modify

---

## Milestone 3: Authentication Flow 
**Status:** 🟡 In Progress (Web Complete, Mobile Pending)
**Goal:** Secure login/signup and session management.

**Requirements Addressed:**
- **R3.1:** Supabase Auth Integration (Email/Password).
- **R3.2:** Web token persistence via secure `httpOnly` cookies (`@supabase/ssr`).
- **R3.3:** Premium Two-Tone UI using Tailwind v3, DaisyUI, and Chart.js.
- **R3.4:** (Pending) Mobile token persistence via SecureStore.

**Implementation Steps:**
1. ✅ Set up `@supabase/ssr` in the web app.
2. ✅ Build Next.js Middleware for route protection.
3. ✅ Build Server Actions for Login/Signup.
4. ✅ Build Landing Page and Auth UI.
5. ⏳ Initialize Supabase client in Expo.
6. ⏳ Build React Native Auth Context & Login Screens.

# FinTrack Development Plan

## 🎯 Current Status
**Active Branch:** `feat/m4-dashboard`
**Phase:** Transitioning from Authentication (Milestone 3) to Core Dashboard Features & Testing (Milestone 4).

## ✅ Completed Milestones

### M1 & M2: Foundation & Infrastructure
- [x] Initialize Turborepo monorepo structure (`apps/web`, `apps/mobile`).
- [x] Configure Tailwind CSS v3 and DaisyUI for the Next.js web workspace.
- [x] Initialize local Supabase environment via Docker.
- [x] Resolve environment variable sharing across workspaces.

### M3: Authentication Integration
- [x] **Web:** Setup `@supabase/ssr` with Next.js 15 async `cookies()` compliance.
- [x] **Web:** Create modular Server Actions for Login and Signup flows.
- [x] **Web:** Build high-fidelity Landing Page with Chart.js and scroll animations.
- [x] **Web:** Secure routing using Supabase Middleware.
- [x] **Mobile:** Setup `@supabase/supabase-js` with custom `expo-secure-store` adapter.
- [x] **Mobile:** Implement global `AuthContext` for session management.
- [x] **Mobile:** Build conditional routing orchestrator in `App.tsx` (Login vs. Dashboard).

### M4 (Part 1): Web Testing Infrastructure
- [x] Install Vitest and React Testing Library in the `web` workspace.
- [x] Configure Vitest with hardcoded PNPM aliases to fix React hook duplication.
- [x] Write initial passing unit tests for the Landing Page (with `IntersectionObserver` class mocks).

---

## 🚀 Next Steps (Milestone 4 Continued)

**1. Finish Web Unit Testing**
- Mock the Supabase client.
- Write tests for the `login` and `signup` Server Actions.
- Write component tests for the dynamic states on the Login page.

**2. Database Schema & RLS**
- Define the PostgreSQL schema in Supabase for `accounts` and `transactions`.
- Set up Row Level Security (RLS) policies so users can only fetch their own data.

**3. Web Dashboard Data**
- Connect the static Next.js Dashboard to the Supabase database.
- Fetch and calculate Net Worth and Total Assets/Liabilities.
- Render the Recent Transactions list.

**4. Mobile Dashboard Polish**
- Upgrade the bare-bones React Native Dashboard to match the web's "Two-Tone" design language.
- Implement data fetching on mobile to match the web data.

## 📝 Change Log

| Date | Change | Approved By |
|---|---|---|
| 2026-04-01 | Initial plan created, M0 complete | — |
| 2026-04-01 | Rules 7 & 8 added (latest stable versions + agentic.md session file) | — |

### 2. `CHANGELOG.md`
This records the specific technical hurdles we just cleared so you have a historical record of why certain configurations (like the Vite PNPM aliases or the Next.js 15 cookie awaits) exist.

```markdown
# Changelog

All notable changes to the FinTrack project will be documented in this file.

## [Unreleased] - Milestone 3 & 4 (Auth & Testing)

### Added
- **Web:** Vitest testing environment integrated with React Testing Library.
- **Web:** Class-based `IntersectionObserver` mock for testing scroll-animated components.
- **Web:** Secure sign-out POST route to terminate sessions and clear cookies.
- **Mobile:** Expo project initialized inside the Turborepo workspace.
- **Mobile:** Global `AuthContext` to manage session state and protected routing.
- **Mobile:** Unstyled `LoginScreen` and `DashboardScreen` components.

### Changed
- **Web:** Upgraded Supabase SSR utility files to comply with Next.js 15 asynchronous `cookies()` API.
- **Web:** Separated Login and Signup flows into distinct Server Actions.
- **Web:** Refactored web dashboard layout to a Tailwind "Two-Tone" design with static financial summary cards.
- **Web:** Updated `vitest.config.ts` with strict physical path aliases for `react` and `react-dom` to resolve PNPM symlink duplication hook errors.

### Security
- **Mobile:** Configured `@supabase/supabase-js` to bypass insecure `AsyncStorage` and strictly use `expo-secure-store` to write JWTs directly to the iOS Keychain and Android EncryptedSharedPreferences.
- **Web:** Forced localhost IPv4 (`127.0.0.1`) in environment variables to prevent Node.js IPv6 routing timeouts during session validation.
