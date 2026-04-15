# FinTrack — Agentic Session Context

> Current Session: 011 — Next.js 16 Upgrade, Shared Theme & Dashboard Testing
> Date: 2026-04-14
> Status: Web upgraded to Next.js 16/React 19. Shared Theme package created. Web Dashboard tests passing. Mobile tests documented as technical debt.

> Current Session: 010 — Core & Auth Unit Testing
> Date: 2026-04-08
> Status: Milestone 3 & 4a unit tests complete (Web, Core, API).

> Current Session: 009 — Database CLI & Environment Automation
> Date: 2026-04-07
> Status: setup.sh enhanced with lifecycle management and automated env syncing.

---

## High-Level Instructions

You are a senior full-stack developer building **FinTrack**, a cross-platform personal finance app (Web + iOS + Android). The tech stack uses a Turborepo monorepo with Next.js 16, Expo React Native 54, and Supabase as the backend.

**Always follow these rules before doing anything:**
1. Update `plan.md` before writing any code.
2. Get explicit user approval before starting a new milestone.
3. Iterate on requirements until fully understood.
4. Analyze existing source code before making changes.
5. Write tests before writing implementation code.
6. Produce a file/folder execution plan for every milestone.
7. Always use the latest stable library/runtime versions compatible with the project.
8. Create or update `agentic.md` at the end of every session.

---

## Confirmed Dependency Versions

| Package | Version | Location | Notes |
|---|---|---|---|
| Next.js | 16.2.3 | apps/web | App Router (using Proxy convention) |
| React | 19.2.5 | Shared | Web (Mobile on 19.1.0 due to test debt) |
| Expo SDK | ~54.0.33 | apps/mobile | iOS + Android |
| @fintrack/core | workspace:* | apps/web + apps/mobile | Internal Shared Logic |
| @fintrack/api | workspace:* | apps/web + apps/mobile | Internal API Layer |
| @fintrack/theme | workspace:* | Shared | Centralized design tokens |
| Tailwind CSS | ^3.4.19 | apps/web | v3 Integrated with shared theme |
| Vitest | 4.1.4 | Monorepo | Latest stable test runner |

---

## Critical Technical Constraints

### 1. Next.js 16 Conventions
- **Proxy instead of Middleware:** The `middleware.ts` convention is deprecated. Use `proxy.ts` and export a `proxy` function instead.
- **Async APIs:** `cookies()` and `headers()` must be awaited.

### 2. React 19 Testing (Web)
- **Action:** Wrap `render` in `act` and use `await screen.findBy*` methods to handle the new asynchronous rendering behavior in React 19.

### 3. Styling Consistency
- **Rule:** Never use hardcoded hex colors in components.
- **Action:** Use `@fintrack/theme` for all design tokens. In Web, map them in `tailwind.config.ts`. In Mobile, import the `theme` object into `StyleSheet`.

### 4. Supabase Seed Data
- **Rule:** Use `DO $$ ... END $$;` blocks in `seed.sql` for constants to ensure compatibility with Supabase CLI batch execution (avoids `\set` errors).

---

## Milestone Status

| Milestone | Status |
|---|---|
| M0 — Requirements & Planning | ✅ Complete |
| M1 — Monorepo Scaffold | ✅ Complete |
| M2 — Supabase Schema + RLS | ✅ Complete |
| M3 — Auth Flow (Web + Mobile) | ✅ Complete |
| M4a — Core Logic, API Layer & Seed Data | ✅ Complete |
| M4b — Live Dashboards (Web & Mobile) | ✅ Complete (Mobile Tests deferred as Tech Debt) |
| M5 — Spending Module (Web) | 🟡 In Progress |

---

## Errors Encountered & Fixed (Session 011)

| Error / Issue | Fix | File |
|---|---|---|
| `middleware` deprecated in Next.js 16 | Renamed `middleware.ts` -> `proxy.ts` and updated export. | `apps/web/proxy.ts` |
| `String.raw` in Next.js config matcher | Replaced with standard string literal. | `apps/web/proxy.ts` |
| Web Dashboard tests failing (empty body) | Wrapped `render` in `act` and switched to `findBy` queries. | `apps/web/__tests__/dashboard.test.tsx` |
| Mobile Vitest `SyntaxError: typeof` | Documented as technical debt. Likely Flow/React 19 transformation conflict. | `apps/mobile/vitest.config.ts` |
| `seed.sql` syntax error near `\` | Switched from `psql` metacommands to PL/pgSQL `DO` blocks. | `supabase/seed.sql` |

---

## Technical Debt

| Debt Item | Priority | Context |
|---|---|---|
| Mobile Unit Tests | High | `DashboardScreen` and `LoginScreen` tests currently fail with transformation errors in Vitest 4 + React 19. Needs architectural fix or alternative runner. |

---

## Where We Stopped

**Session 011 (Current) ended after:**
- Upgraded Web app to Next.js 16.2.3 and React 19.2.5.
- Created `@fintrack/theme` package and integrated it into both Web and Mobile.
- Refactored Web Dashboard to separate UI (`DashboardUI`) from data fetching.
- Achieved passing unit tests for Web Dashboard.
- Fixed `seed.sql` to reliably create test users without syntax or auth errors.
- Merged all bugfix changes into `feature/m4b-dashboard-live`.

**Session 010 ended after:**
- Branched to `feature/m3-m4a-AuthTest-CoreTest`.
- 100% test coverage for `@fintrack/core` utilities (DTI, Loans, Currency).
- 100% test coverage for `@fintrack/api` dashboard queries (mocked Supabase).
- 100% test coverage for Web Auth Server Actions (`login`, `signup`, `forgotPassword`, `resetPassword`).
- Upgraded `setup.sh` to support dev-dependencies and multiple packages in the `add` command.
- Established Vitest infra in `packages/core` and `packages/api`.

**Session 009 ended after:**
- Enhanced `setup.sh` with lifecycle automation:
    - Added `db:port <port>` to modify Supabase config.
    - Added `db:env` to automatically extract and sync Supabase keys to `apps/web/.env.local` and `apps/mobile/.env`.
    - Integrated `db:env` into `db:start` for a "one-click" developer setup experience.
- Updated `plan.md` and `agentic.md` to reflect these developer experience improvements.

**Next actions required:**
1. **M5 Spending Module** — Implement the spending logging module on Web.
2. **Dashboard UI label** — Update "Total Assets" card to "Total Income" on both platforms.
