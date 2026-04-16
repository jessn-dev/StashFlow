# StashFlow — Agentic Session Context

> Current Session: 013 — Income Module (Web) & Testing Bottlenecks
> Date: 2026-04-14
> Status: Income Module implemented on Web (CRUD + UI). API tests passing. Web Component tests for Income deferred as technical debt.

> Current Session: 012 — Spending Module (Web) & Testing Bottlenecks
> Date: 2026-04-14
> Status: Spending Module implemented on Web (CRUD + UI). API tests passing. Web Component tests deferred as technical debt due to React 19/Vitest resolution issues.

> Current Session: 011 — Next.js 16 Upgrade, Shared Theme & Dashboard Testing
> Date: 2026-04-14
> Status: Web upgraded to Next.js 16/React 19. Shared Theme package created. Web Dashboard tests passing. Mobile tests documented as technical debt.

> Current Session: 010 — Core & Auth Unit Testing
> Date: 2026-04-08
> Status: Milestone 3 & 4a unit tests complete (Web, Core, API).

---

## High-Level Instructions

You are a senior full-stack developer building **StashFlow**, a cross-platform personal finance app (Web + iOS + Android). The tech stack uses a Turborepo monorepo with Next.js 16, Expo React Native 54, and Supabase as the backend.

---

## Confirmed Dependency Versions

| Package | Version | Location | Notes |
|---|---|---|---|
| Next.js | 16.2.3 | apps/web | App Router (using Proxy convention) |
| React | 19.2.5 | Shared | Web (Mobile on 19.1.0 due to test debt) |
| Expo SDK | ~54.0.33 | apps/mobile | iOS + Android |
| @stashflow/core | workspace:* | apps/web + apps/mobile | Internal Shared Logic |
| @stashflow/api | workspace:* | apps/web + apps/mobile | Internal API Layer |
| @stashflow/theme | workspace:* | Shared | Centralized design tokens |
| Vitest | 4.1.4 | Monorepo | Latest stable test runner |

---

## Critical Technical Constraints

### 1. Next.js 16 Conventions
- **Proxy instead of Middleware:** Use `proxy.ts` and export a `proxy` function.
- **Async APIs:** `cookies()` and `headers()` must be awaited.

### 2. React 19 Testing (Web)
- **Issue:** Components using hooks may trigger "Invalid hook call" if multiple React instances exist in the test environment.
- **Workaround:** Unit tests for logic (API layer) are prioritized; component tests deferred if resolution fails.

---

## Milestone Status

| Milestone | Status |
|---|---|
| M0 — Requirements & Planning | ✅ Complete |
| M1 — Monorepo Scaffold | ✅ Complete |
| M2 — Supabase Schema + RLS | ✅ Complete |
| M3 — Auth Flow (Web + Mobile) | ✅ Complete |
| M4a — Core Logic, API Layer & Seed Data | ✅ Complete |
| M4b — Live Dashboards (Web & Mobile) | ✅ Complete |
| M5 — Spending Module (Web) | ✅ Complete |
| M6 — Income Module (Web) | ✅ Complete (Component Tests deferred as Tech Debt) |
| M7 — Loans Module + Scheduler (Web) | ⏳ Pending |

---

## Technical Debt

| Debt Item | Priority | Context |
|---|---|---|
| Mobile Unit Tests | High | `DashboardScreen` and `LoginScreen` tests currently fail with transformation errors in Vitest 4 + React 19. |
| Web Component Tests (React 19) | Medium | Tests for `ExpenseForm`, `IncomeForm`, and `DashboardUI` encounter "Invalid hook call" or `null` state errors despite standard fixes. |

---

## Where We Stopped

**Session 013 (Current) ended after:**
- Created `packages/api/src/queries/income.ts` with full CRUD.
- Created `IncomeForm` and `IncomeList` components in `apps/web`.
- Developed `/dashboard/income` page with Server Actions.
- Integrated Income module into the Dashboard UI.
- Verified API layer with unit tests.
- Documented further testing debt for Web components.

**Next actions required:**
1. **M7 Loans Module** — Implement the loans management module on Web (mirroring the CRUD logic + schedule display).
2. **Resolve Test Debt** — Fix the React 19 test environment issues.
