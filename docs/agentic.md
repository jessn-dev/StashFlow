# FinTrack — Agentic Session Context
> Session: 001 — Initial Planning & Architecture
> Date: 2026-04-01
> Status: Session Complete — Awaiting M1 Approval

---

## 🧭 High-Level Instructions

You are a senior full-stack developer building **FinTrack**, a cross-platform personal finance app (Web + iOS + Android). The tech stack uses a Turborepo monorepo with Next.js (web), Expo React Native (mobile), and Supabase as the backend.

**Always follow these rules before doing anything:**
1. Update `plan.md` before writing any code
2. Get explicit user approval before starting a new milestone
3. Iterate on requirements until fully understood
4. Analyze existing source code before making changes
5. Write tests before writing implementation code
6. Produce a file/folder execution plan for every milestone
7. Always use the latest stable library/runtime versions compatible with the project
8. Create or update `agentic.md` at the end of every session

**The user makes all final decisions.** Never proceed past a milestone gate without a green light.

---

## 📦 Confirmed Dependency Versions

> These are the latest stable versions as of 2026-04-01. Verify before M1 execution.

| Package | Version | Notes |
|---|---|---|
| Node.js | 22.x LTS | Runtime for web + tooling |
| pnpm | 9.x | Monorepo package manager |
| TypeScript | 5.x | Strict mode enabled |
| Turborepo | 2.x | Monorepo build system |
| Next.js | 15.x | App Router, web app |
| React | 19.x | Web + shared |
| Expo SDK | 52.x | Mobile app (iOS + Android) |
| React Native | 0.76.x | Via Expo SDK 52 |
| Expo Router | 4.x | File-based mobile navigation |
| Supabase JS | 2.x | DB + Auth + Realtime client |
| Supabase CLI | latest | Schema migrations + type gen |
| TailwindCSS | 4.x | Web styling |
| shadcn/ui | latest | Web component library |
| Vitest | 2.x | Unit testing (web + packages) |
| Jest / jest-expo | latest | Mobile testing |
| Frankfurter API | — | External, no SDK — raw fetch |
| PostHog | 1.x (JS) | Analytics |

> ⚠️ All versions must be re-verified at the start of M1 using `npm info <package> version` before any install command is run.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                      │
│                                                     │
│   ┌──────────────┐         ┌──────────────────┐    │
│   │  Next.js 15  │         │  Expo SDK 52     │    │
│   │  (Web App)   │         │  (iOS + Android) │    │
│   └──────┬───────┘         └────────┬─────────┘    │
│          │                          │               │
│          └──────────┬───────────────┘               │
│                     │  Shared via Turborepo          │
│              @fintrack/core  (hooks, utils, types)  │
│              @fintrack/ui    (components)           │
│              @fintrack/api   (Supabase queries)     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WebSocket (Supabase Realtime)
┌─────────────────────▼───────────────────────────────┐
│                  BACKEND LAYER (Supabase)            │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│   │   Auth   │  │Postgres  │  │ Realtime + RLS  │  │
│   └──────────┘  └──────────┘  └─────────────────┘  │
│                                                     │
│   Edge Functions (Deno runtime):                    │
│   • generate-loan-schedule                          │
│   • calculate-dti                                   │
│   • sync-exchange-rates (cron daily)                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               EXTERNAL SERVICES                      │
│  frankfurter.app  │  PostHog  │  Expo EAS  │ Vercel │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (Designed, Not Yet Built)

```sql
-- 5 tables, all with RLS: user_id = auth.uid()

users           → id, email, full_name, preferred_currency, created_at
incomes         → id, user_id, amount, currency, source, frequency, date, notes
expenses        → id, user_id, amount, currency, category, description, date, is_recurring, notes
loans           → id, user_id, name, principal, currency, interest_rate,
                  duration_months, start_date, end_date, installment_amount, status
loan_payments   → id, loan_id, user_id, amount_paid, due_date, paid_date,
                  status (paid | pending | overdue)
exchange_rates  → id, base, target, rate, fetched_at  (cached, refreshed daily)
```

---

## 🌿 Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production only — never commit directly |
| `develop` | Active integration branch |
| `poc/initial-planning` | Planning artefacts — UI prototype, API design, architecture. NOT merged to main |
| `feature/*` | Feature branches off develop |
| `fix/*` | Bug fixes off develop |
| `release/*` | Release candidates before merging to main |

---

## 📋 Milestone Status

| Milestone | Status |
|---|---|
| M0 — Requirements & Planning | ✅ Complete |
| M1 — Monorepo Scaffold | ⏳ Awaiting Approval |
| M2 — Supabase Schema + RLS | ⏳ Pending |
| M3 — Auth Flow | ⏳ Pending |
| M4 — Core Package | ⏳ Pending |
| M5 — API Package | ⏳ Pending |
| M6 — Dashboard (Web) | ⏳ Pending |
| M7 — Spending Module | ⏳ Pending |
| M8 — Income Module | ⏳ Pending |
| M9 — Loans Module + Scheduler | ⏳ Pending |
| M10 — DTI Module | ⏳ Pending |
| M11 — Currencies Module | ⏳ Pending |
| M12 — Mobile App | ⏳ Pending |
| M13 — Edge Functions | ⏳ Pending |
| M14 — Testing Suite | ⏳ Pending |
| M15 — CI/CD + Deployment | ⏳ Pending |

---

## 📁 Files Generated This Session

| File | Location | Purpose |
|---|---|---|
| `README.md` | repo root | GitHub project readme |
| `plan.md` | repo root | Master development plan |
| `agentic.md` | repo root | This file — session context |
| `fintrack-prototype.jsx` | `poc/initial-planning` | Interactive UI/UX prototype |

---

## 🎨 Design Decisions Locked In

- **Color theme:** Green accent (`#1A7A3C` / `#2EA85A`) on white (light) and `#0A0F0C` (dark)
- **Font:** Helvetica Neue (UI) + Georgia (display numbers/headings)
- **Dark/light toggle:** Top bar, persisted in user preferences
- **Layout:** Fixed left sidebar (220px) + top bar (64px) + scrollable content area
- **Mobile:** Bottom tab navigation (5 tabs: Dashboard, Spending, Income, Loans, More)
- **Reference design:** FinSight dashboard (provided by user)

---

## ⚠️ Errors Encountered

None this session — no code was executed. All work was planning and design.

---

## 🔑 Key Decisions Made

| Decision | Rationale |
|---|---|
| Turborepo monorepo | Share core logic between web and mobile without duplication |
| Supabase over custom backend | Auth + DB + RLS + Realtime in one free-tier service |
| pnpm over npm/yarn | Best monorepo workspace support, faster installs |
| Frankfurter API for currencies | Completely free, no API key, open-source |
| Edge Functions for loan schedule | Complex amortization calc doesn't belong on the client |
| Cache exchange rates in DB | Avoid hammering Frankfurter on every page load |
| Expo Router (file-based) | Consistent routing pattern with Next.js App Router |

---

## ⏸️ Where We Stopped

**Session ended after:**
- Completing full requirements documentation
- Finalizing tech stack and architecture
- Designing complete API surface (all endpoints + types)
- Building interactive UI/UX prototype (5 screens, dark/light mode)
- Writing `plan.md` with all 8 working rules
- Writing `README.md`
- Writing this `agentic.md`

**Next action required:**
> User must approve **Milestone 1 — Monorepo Scaffold** before any code is written.
> Awaiting: 🟢 Approved / 🔴 Not yet

---

## 🚀 How to Kick Off Next Session

Paste this into your next AI session:

```
We are building FinTrack — a cross-platform personal finance app (Web + iOS + Android).
Read agentic.md for full context. We are currently at Milestone 1 (Monorepo Scaffold),
pending approval. All working rules are in plan.md — follow them strictly.
Do not execute anything until I give approval.
```

---

## 📝 Session Log

| Session | Date | Covered | Files Produced |
|---|---|---|---|
| 001 | 2026-04-01 | Full planning, architecture, API design, UI prototype, plan.md, README.md | plan.md, README.md, agentic.md, fintrack-prototype.jsx |


# FinTrack — Agentic Session Context
> Current Session: 002 — Supabase & Dev Env
> Date: 2026-04-01
> Status: Milestone 1 & 2 Complete — Awaiting Milestone 3 Approval

---nt

## 🧭 High-Level Instructions
You are a senior full-stack developer building **FinTrack**, a cross-platform personal finance app (Web + iOS + Android). The tech stack uses a Turborepo monorepo with Next.js 15, Expo React Native 52, and Supabase.

**Always follow these rules:**
1. Update `plan.md` before writing any code.
2. Get explicit user approval before starting a new milestone.
3. Iterate on requirements until fully understood.
4. Analyze existing source code before making changes.
5. Write tests before writing implementation code.
6. Produce a file/folder execution plan for every milestone.
7. Always use the latest stable library/runtime versions.
8. Create or update `agentic.md` at the end of every session.

---

## 🏗️ Architecture Diagram
```text
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                     │
│                                                     │
│   ┌──────────────┐         ┌──────────────────┐     │
│   │  Next.js 15  │         │  Expo SDK 52     │     │
│   │  (Web App)   │         │  (iOS + Android) │     │
│   └──────┬───────┘         └────────┬─────────┘     │
│          │                          │               │
│          └──────────┬───────────────┘               │
│                     │  Shared via Turborepo         │
│              @fintrack/core  (hooks, utils, types)  │
│              @fintrack/ui    (components)           │
│              @fintrack/api   (Supabase queries)     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WebSocket (Realtime)
┌─────────────────────▼───────────────────────────────┐
│                  BACKEND LAYER (Supabase)           │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│   │   Auth   │  │Postgres  │  │ Row Level Sec.  │   │
│   └──────────┘  └──────────┘  └─────────────────┘   │
│                                                     │
│   Edge Functions (Deno):                            │
│   • generate-loan-schedule                          │
│   • calculate-dti                                   │
│   • sync-exchange-rates (cron daily)                │
└─────────────────────┬───────────────────────────────┘
```

# FinTrack — Agentic Session Context
> Current Session: 004 — Web UI Overhaul & Landing Page
> Date: 2026-04-06
> Status: Milestone 3 (Web) Complete — Mobile Auth Pending

---

## 🧭 High-Level Instructions
You are a senior full-stack developer building **FinTrack**. Tech stack: Turborepo, Next.js 15, Expo 52, Supabase, Tailwind v3, DaisyUI.

**Core Rules:**
1. Update `plan.md` before writing code.
2. Get explicit approval before milestones.
3. Write tests/execution plans first.
4. Update `agentic.md` at end of session.

---

## 🏗️ Architecture & UI Updates
- **CSS Framework:** Downgraded web workspace from Tailwind v4 to **Tailwind v3** to ensure full compatibility with DaisyUI. Configured standard `postcss` and `autoprefixer`.
- **Data Visualization:** Integrated **Chart.js** (`chart.js/auto`) into the landing page to visualize Net Worth vs. Liabilities.
- **Theme:** Finalized the "Two-Tone" palette implementation across the Landing Page and Login Flow:
  - Primary: Deep Teal (`#0D3D3D`)
  - Accent: Teal (`#1A7A7A`)
  - Background: Light Gray (`#EFEFEF`)
  - Text: Dark Gray (`#444444`)

---

## 📁 Files Generated/Modified This Session
| File | Location | Purpose |
|---|---|---|
| `package.json` | `apps/web/` | Swapped tailwindcss v4 for v3; added chart.js |
| `postcss.config.mjs` | `apps/web/` | Reverted to v3 standard plugins |
| `page.tsx` | `apps/web/app/` | New highly polished landing page w/ animations |
| `page.tsx` | `apps/web/app/(auth)/login/` | Updated Branding column to match landing page |

---

## ⚠️ Errors Encountered & Fixed
- **Tailwind v4 PostCSS Crash:** Next.js threw an error because Tailwind v4 separated its PostCSS plugin. **Fix:** Since DaisyUI requires Tailwind v3 anyway, we completely uninstalled the v4 packages, installed `tailwindcss@3`, and nuked the `.next` cache to force a clean build.
- **Exploding SVGs:** Apple/Google SVGs expanded to full screen. **Fix:** Restored PostCSS/Tailwind compilation so `w-5 h-5` utility classes could apply.

---

## ⏸️ Where We Stopped
- **Completed:** Web Auth Flow, Landing Page, and Global Theming. 
- **Pending:** Mobile Auth Flow (Expo + SecureStore).

**Next Action:** Initialize the Expo Supabase client and build the Mobile Login screen.


# AI Agent Directives & Project Context

Always adhere to these architectural constraints when generating or modifying code in this repository.

## 🏗 Project Architecture
- **Monorepo:** Turborepo managing `apps/web` (Next.js) and `apps/mobile` (Expo React Native).
- **Package Manager:** PNPM.
- **Backend:** Supabase (Local Docker environment for dev).
- **UI:** Tailwind v3 + DaisyUI (Web). standard StyleSheet (Mobile).

## 🛑 Critical Technical Constraints

### 1. Next.js 15 & Supabase SSR
- **Rule:** The Next.js 15 `cookies()` API is completely asynchronous.
- **Action:** You MUST `await cookies()` inside `server.ts`, `middleware.ts`, and any Server Actions before attempting to read, set, or delete cookies.
- **Symptom if ignored:** The Next.js server will silently hang indefinitely (infinite loading screen) without throwing console errors.

### 2. Expo Mobile Authentication
- **Rule:** Never use `@supabase/ssr` or web cookies in the mobile app.
- **Action:** Use standard `@supabase/supabase-js`. You MUST use a custom storage adapter leveraging `expo-secure-store` to persist JWTs to the native iOS/Android keychains.

### 3. PNPM + Vitest + React 19 Monorepo Testing
- **Rule:** PNPM's strict symlinking will cause "Invalid hook call" errors in Vitest due to resolving multiple instances of React. `dedupe` and `preserveSymlinks` are insufficient.
- **Action:** In `apps/web/vitest.config.ts`, you MUST use hardcoded absolute paths pointing to the root `node_modules` for both `react` and `react-dom` inside the `resolve.alias` object.

### 4. Networking & Localhost
- **Rule:** Node.js defaults to IPv6 (`::1`) for `localhost`, but local Supabase listens on IPv4.
- **Action:** Ensure all `.env` files map `SUPABASE_URL` to `http://127.0.0.1:54321` instead of `http://localhost:54321` to prevent silent fetch timeouts.

### 5. Mocking in Vitest
- **Rule:** When mocking browser APIs that use the `new` keyword (like `IntersectionObserver`), do not use `vi.fn().mockReturnValue()`.
- **Action:** You must define a mock `class` and assign it to the `window` object using `Object.defineProperty`.




