# StashFlow — Project Reference

> **Single source of truth.** Architecture, features, milestones, testing, security, and dev guidelines in one place.
> Active branch: `rewrite/greenfield` | Spec reference (read-only): `feature/agenthelper`

---

## Table of Contents
1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Design System](#4-design-system)
5. [Package & Dependency Rules](#5-package--dependency-rules)
6. [Features](#6-features)
7. [Milestones & Status](#7-milestones--status)
8. [Testing Strategy](#8-testing-strategy)
9. [Security](#9-security)
10. [Free Tier Strategy](#10-free-tier-strategy)
11. [Development Guidelines](#11-development-guidelines)
12. [Environment Variables](#12-environment-variables)

---

## 1. Overview

**StashFlow** is a personal finance platform for multi-currency users across the Philippines, US, and Singapore. It helps users track income, expenses, loans, budgets, and financial goals — with AI-powered insights and a regional strategy layer that applies localised financial rules.

**Platforms:** Web (Next.js) + Mobile (Expo React Native)
**Backend:** Supabase (Postgres + Edge Functions + Auth + Storage)
**Architecture:** Domain-driven monorepo — pure business logic → service layer → apps

---

## 2. Architecture

### Monorepo Structure

```
StashFlow/
├── apps/
│   ├── web/          # Next.js 16 — App Router, RSC, Tailwind 4, shadcn/ui
│   └── mobile/       # Expo SDK 55 — React Native, NativeWind
├── packages/
│   ├── core/         # @stashflow/core — pure financial logic, zero UI/network deps
│   ├── api/          # @stashflow/api  — Supabase queries + service layer (web/Node only)
│   ├── ui/           # @stashflow/ui   — shared primitives (web + native exports)
│   └── theme/        # @stashflow/theme — design tokens (colours, spacing, typography)
├── supabase/
│   ├── functions/    # Deno edge functions — thin orchestrators, import from @stashflow/core
│   └── migrations/   # 16 versioned SQL migrations
├── deno.json         # Deno workspace root — packages/core is a Deno workspace member
└── tsconfig.base.json
```

### Dependency Hierarchy

```
@stashflow/theme   ← no deps
@stashflow/core    ← no deps  (pure TS, also a Deno workspace member)
@stashflow/ui      ← theme
@stashflow/api     ← core + supabase-js  (web/Node only — has React hooks)
apps/web           ← api + ui + theme
apps/mobile        ← core + ui + theme  (talks Supabase directly, does NOT use api)
supabase/functions ← @stashflow/core via Deno workspace
```

### Key Architectural Rules

1. **`@stashflow/core` has zero runtime dependencies.** No Supabase, no React, no network calls. Pure TypeScript functions and types only. This is what makes it Deno-compatible.
2. **Edge functions are thin orchestrators.** Auth check → DB fetch (user JWT) → delegate to `@stashflow/core` → return JSON. No inline business logic.
3. **`@stashflow/api` is web/Node only.** It contains React hooks and browser APIs. Mobile does NOT import from it.
4. **No cross-feature imports in `apps/web`.** The `modules/` feature folders have strict public APIs via `index.ts`. A component in `modules/loans` cannot import from `modules/spending`.
5. **Deno workspace — no `_shared/` copies or symlinks.** `packages/core/deno.json` registers `@stashflow/core` as a Deno workspace member. The edge runtime resolves it directly with zero file duplication.

### Supabase Edge Function Pattern

```typescript
// Every user-facing edge function follows this exact pattern:
Deno.serve(async (req) => {
  // 1. Auth — user JWT only, never SERVICE_ROLE_KEY
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') } } })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return errorResponse('Unauthorized', 401)

  // 2. Fetch — parallel, resilient
  const [res1, res2] = await Promise.all([...])

  // 3. Compute — delegate entirely to @stashflow/core
  const payload = aggregateDashboardData({ ... })

  // 4. Return
  return new Response(JSON.stringify(payload), { headers: corsHeaders })
})
```

---

## 3. Tech Stack

### Versions (pinned at greenfield scaffold — 2026-04-24)

| Layer | Package | Version |
|-------|---------|---------|
| **Language** | TypeScript | 6.0.3 |
| **Web framework** | Next.js | 16.2.4 |
| **UI runtime** | React | 19.2.5 |
| **Mobile framework** | Expo SDK | 55.0.17 |
| **Styling — web** | Tailwind CSS | 4.2.4 |
| **Styling — mobile** | NativeWind | latest stable |
| **Component lib — web** | shadcn/ui | latest |
| **Database / Auth** | @supabase/supabase-js | 2.104.1 |
| **SSR Auth helper** | @supabase/ssr | 0.10.2 |
| **Unit testing** | Vitest | 4.1.5 |
| **Coverage** | @vitest/coverage-v8 | 4.1.5 |
| **E2E testing** | Playwright | 1.59.1 |
| **Monorepo orchestration** | Turborepo | 2.9.6 |
| **Package manager** | pnpm | 10.33.2 |

> **Tamagui was intentionally excluded** — still RC at scaffold time. Tailwind 4 (web) + NativeWind (mobile) chosen as stable cross-platform alternative.

---

## 4. Design System

### Web (`apps/web`)
- **Tailwind CSS 4** — CSS-first config via `@import "tailwindcss"` in globals.css, no `tailwind.config.js`
- **shadcn/ui** — component library built on Radix UI primitives + Tailwind
- Design tokens defined in `packages/theme/src/tokens.ts` and mapped to Tailwind CSS variables

### Mobile (`apps/mobile`)
- **NativeWind** — Tailwind utility classes compiled for React Native
- Shares the same design tokens from `packages/theme`
- Platform-specific components in `packages/ui/src/native/`

### Shared (`packages/ui`)
- **Web export** (`@stashflow/ui`): Tailwind-styled React components
- **Native export** (`@stashflow/ui/native`): NativeWind-styled React Native components
- Both exports share the same API surface (prop names, variants) — only the rendering differs

### Core Primitives to Build
`Card`, `Button`, `Input`, `Badge`, `MetricsRow` (4-stat summary strip), `InsightsPanel` (bullet insight list), `FormModal`, `ConfirmationModal`, `PageLayout`

---

## 5. Package & Dependency Rules

| Package | Can import | Cannot import |
|---------|-----------|---------------|
| `@stashflow/core` | nothing | everything |
| `@stashflow/theme` | nothing | everything |
| `@stashflow/ui` | theme | core, api, supabase |
| `@stashflow/api` | core, supabase-js | ui, Next.js internals |
| `apps/web` | api, ui, theme | react-native |
| `apps/mobile` | core, ui, theme | api, next |
| `supabase/functions` | @stashflow/core (Deno workspace) | api, ui |

---

## 6. Features

### Core Domain Logic (`packages/core`)

| Module | Functions |
|--------|-----------|
| `math/dti` | `calculateDTIRatio(income, debts, region)` |
| `math/loans` | `generateInstallmentSchedule(loan)`, `calculateAmortization(loan)` |
| `math/currency` | `convertToBase(amount, from, rates)`, `formatCurrency(amount, currency)` |
| `regional` | `getRegionalStrategy(currency)` — Strategy Pattern for US, PH, SG |
| `analysis/dashboard` | `aggregateDashboardData(inputs)` — full dashboard payload |
| `analysis/budget` | `generateSmartBudget(income, expenses, macro)` |

### Web App Features (`apps/web`)

| Feature | Route | Status |
|---------|-------|--------|
| Landing page | `/` | 🔄 Rebuild |
| Login (email + OAuth) | `/login` | 🔄 Rebuild |
| Password reset | `/reset-password` | 🔄 Rebuild |
| Dashboard overview | `/dashboard` | 🔄 Rebuild |
| Income management | `/dashboard/income` | 🔄 Rebuild |
| Spending / Expenses | `/dashboard/spending` | 🔄 Rebuild |
| Budgets | `/dashboard/budgets` | 🔄 Rebuild |
| Loans + amortization | `/dashboard/loans` | 🔄 Rebuild |
| Goals | `/dashboard/goals` | 🔄 Rebuild |
| Cash Flow | `/dashboard/cash-flow` | 🔄 Rebuild |
| DTI Simulator | `/dashboard/dti` | 🔄 Rebuild |
| Document Intelligence | `/dashboard/documents` | 🔄 Rebuild |
| Settings | `/dashboard/settings` | 🔄 Rebuild |
| Onboarding wizard | First-run modal | 🔄 Rebuild |

### Mobile App Features (`apps/mobile`) — MVP scope

| Feature | Status |
|---------|--------|
| Auth (email + OAuth via Expo AuthSession) | ⏳ Not started |
| Dashboard (net worth, DTI, recent transactions) | ⏳ Not started |
| Income / Expenses (add, list) | ⏳ Not started |
| Goals (view progress) | ⏳ Not started |
| Settings (currency, profile) | ⏳ Not started |

*Deferred to after web is stable: document upload, loan management, budget management*

### Supabase Edge Functions

| Function | Type | Status |
|----------|------|--------|
| `get-dashboard` | User-facing | 🔄 Rebuild |
| `get-cash-flow` | User-facing | 🔄 Rebuild |
| `calculate-dti` | User-facing | 🔄 Rebuild |
| `analyze-financial-document` | User-facing | 🔄 Rebuild |
| `upload-document` | User-facing | 🔄 Rebuild |
| `macro-financial-advisor` | User-facing | 🔄 Rebuild |
| `sync-exchange-rates` | Cron | 🔄 Rebuild + CRON_SECRET |
| `sync-market-data` | Cron | 🔄 Rebuild + CRON_SECRET |
| `check-market-data` | Internal | 🔄 Rebuild |
| `get-platform-stats` | Internal | 🔄 Rebuild |

### Database (carry migrations as-is — schema is not dirty code)

16 tables: `profiles`, `incomes`, `expenses`, `loans`, `loan_payments`, `loan_fees`, `budgets`, `budget_periods`, `goals`, `exchange_rates`, `market_trends`, `documents`, `ai_insights_cache`, `category_metadata`

8 enums: `expense_category`, `income_frequency`, `loan_status`, `payment_status`, `goal_type`, `loan_interest_type`, `loan_commercial_category`, `loan_interest_basis`

---

## 7. Milestones & Status

### Rewrite Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Foundation — orphan branch, workspace, all package scaffolds, DB types | ✅ Done |
| **Phase 2** | `packages/core` — schema index, math, regional strategies, analysis + full test suite | ⏳ Next |
| **Phase 3** | `packages/api` — Supabase client, all queries + service layer + tests | ⏳ Upcoming |
| **Phase 4** | `apps/web` scaffold + auth (login, OAuth, reset password) | ⏳ Upcoming |
| **Phase 5** | `apps/web` all dashboard features (income → settings) | ⏳ Upcoming |
| **Phase 6** | `supabase/` — migrations, all edge functions with security hardening | ⏳ Upcoming |
| **Phase 7** | `apps/mobile` — Expo scaffold, NativeWind, auth + core screens | ⏳ Upcoming |
| **Phase 8** | CI/CD — GitHub Actions, Playwright E2E, coverage gates, Vercel + Supabase deploy | ⏳ Upcoming |

### Completed Tasks

- [x] Diagnosed `_shared/core` symlink breaking Supabase edge runtime (sandbox escape)
- [x] Researched 3 architectural fix options (Deno workspace, reverse symlink, turbo artifact)
- [x] Chose Deno workspace as the correct long-term solution
- [x] Created orphan branch `rewrite/greenfield` — clean slate, zero legacy code
- [x] Root workspace files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `deno.json`, `tsconfig.base.json`
- [x] All 4 packages scaffolded with `package.json`, `tsconfig.json`, `vitest.config.ts`
- [x] `packages/core/src/schema/database.types.ts` ported from spec branch

### Upcoming (Phase 2 — next session)

- [ ] `packages/core/src/schema/index.ts` — typed entity exports
- [ ] `packages/core/src/math/currency.ts` — `convertToBase`, `formatCurrency`
- [ ] `packages/core/src/math/dti.ts` — `calculateDTIRatio` with regional thresholds
- [ ] `packages/core/src/math/loans.ts` — amortization schedules (all 4 interest types)
- [ ] `packages/core/src/regional/` — Strategy interface + US, PH, SG strategies
- [ ] `packages/core/src/analysis/dashboard.ts` — `aggregateDashboardData`
- [ ] `packages/core/src/analysis/budget.ts` — `generateSmartBudget`
- [ ] Full test suite for all math functions (90%+ threshold, sad-path mandatory)

---

## 8. Testing Strategy

### Coverage Thresholds (enforced in CI — PRs fail if below)

| Package | Lines | Functions | Branches |
|---------|-------|-----------|---------|
| `@stashflow/core` | 90% | 90% | 90% |
| `@stashflow/api` | 70% | 70% | 70% |
| `apps/web` | 20% | 20% | 20% |

### Test Types

**Unit (Vitest)** — `packages/core` and `packages/api`
- Sad-path mandatory for all financial math: null inputs, negatives, zero values, invalid dates
- Mock Supabase at the client level in `packages/api` — no real DB calls

**E2E (Playwright)** — `apps/web`
- 8 critical user journeys:
  1. Register → login
  2. Add income source
  3. Add expense
  4. Create budget
  5. Add loan + view amortization
  6. Set a savings goal
  7. View cash flow
  8. Upload a financial document
- Run on PRs to `maintemp` only (saves CI minutes)

**Mobile (Maestro)**
- 3 core flows: login → dashboard → add transaction
- Run manually during mobile phase; add to CI in Phase 8

### Pre-commit Hook
Husky + lint-staged runs `pnpm test --filter=...[HEAD]` on `*.{ts,tsx}` files (only affected packages).

---

## 9. Security

### Principles
- **Zero-trust client**: frontend is untrusted, all validation server-side
- **RLS-first**: every table has Row Level Security; all queries go through user JWT
- **Least privilege at the edge**: user-facing functions use user JWT only

### Issues & Status

| Issue | Severity | Status |
|-------|---------|--------|
| IDOR prevention via RLS | High | ✅ Fixed (migrations carry RLS policies) |
| Auth tokens in httpOnly cookies (web) | High | ✅ Fixed (`@supabase/ssr`) |
| Edge functions using SERVICE_ROLE_KEY for user requests | High | 🔄 Fix in Phase 6 — all user-facing functions must use user JWT |
| Cron endpoints publicly accessible (no secret) | Medium | 🔄 Fix in Phase 6 — `CRON_SECRET` header validation |
| Mobile auth tokens (SecureStore, not AsyncStorage) | High | ⏳ Phase 7 |
| AI cost runaway (no rate limiting or caching) | Medium | 🔄 Fix in Phase 6 — cache by `(region, currency, hash)`, TTL 24h |
| Document storage quota enforcement | Low | 🔄 Fix in Phase 5 — warn at 80% of per-user quota |

### Cron Function Security Pattern

```typescript
// Required in sync-exchange-rates and sync-market-data:
const secret = req.headers.get('Authorization')
if (secret !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
  return new Response('Forbidden', { status: 403 })
}
```

---

## 10. Free Tier Strategy

### Supabase (Free tier)

| Resource | Limit | Current usage | Risk |
|----------|-------|--------------|------|
| Database | 500 MB | ~10 MB | ✅ Safe |
| Edge function invocations | 2M / month | ~40/user/month | ✅ Safe to ~50K MAU |
| File storage | 1 GB | Minimal | ✅ Safe |
| Bandwidth | 5 GB / month | Low | ✅ Safe |

**Guardrails:**
- Cache `exchange_rates` — TTL 24h, do not call Frankfurter API on every request
- Cache `market_trends` — TTL 6h, FRED API is rate-limited
- Cache `ai_insights_cache` — TTL 24h, keyed by `(region, currency, data_version_hash)`

### AI Services (fallback chain, cheapest first)

```
Gemini 2.5 Flash (1M tokens/day free) → Groq Llama 3 (6K req/day free) → Anthropic Claude (tertiary) → Heuristic fallback
```

- Always try heuristic first for budget recommendations; call AI only on cache miss
- Rate limit per user: max 5 AI advisor calls/day, stored in `ai_insights_cache`

### Vercel (Free tier: 100 GB bandwidth, 100K serverless invocations)
- Use React Server Components aggressively — minimal client JS bundle
- Static generation for landing, auth pages
- API routes for mutations only

### GitHub Actions (Free: 2,000 min/month)
- E2E (Playwright) runs only on PRs to `maintemp`
- Cache pnpm store + Turborepo outputs
- Estimate: ~8 min per full CI run → safe for ~250 PRs/month

---

## 11. Development Guidelines

### Branch Strategy

```
maintemp          ← stable, production-ready
rewrite/greenfield ← active development (this branch)
feature/*         ← individual features, PR into rewrite/greenfield
```

### Commit Conventions
- `feat:` new feature
- `fix:` bug fix
- `refactor:` restructure without behaviour change
- `test:` test additions only
- `chore:` tooling, deps, config

### Adding a New Edge Function

1. Create `supabase/functions/<name>/index.ts`
2. Follow the orchestrator pattern (auth → fetch → core → return)
3. Use user JWT — never `SUPABASE_SERVICE_ROLE_KEY` in user-facing functions
4. If it's a cron function, add `CRON_SECRET` validation
5. No inline business logic — import from `@stashflow/core`

### Adding a New Region

1. Create `packages/core/src/regional/strategies/<CC>Strategy.ts`
2. Implement the `RegionalStrategy` interface (thresholds, rationales, currency)
3. Register in `packages/core/src/regional/index.ts`
4. Add tests in `packages/core/src/__tests__/regional/`
5. No changes needed anywhere else

### Adding a New Web Feature

1. Create `apps/web/modules/<feature>/` with an `index.ts` public API
2. Data fetching: add query to `packages/api/src/queries/<feature>.ts`
3. Route: add `apps/web/app/dashboard/<feature>/page.tsx`
4. No cross-module imports — use shared state or pass props through the parent orchestrator

---

## 12. Environment Variables

### Required for `apps/web`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI services
ANTHROPIC_API_KEY=          # Claude (tertiary fallback)
GROQ_API_KEY=               # Llama 3 (secondary fallback)
GEMINI_API_KEY=             # Gemini Flash (primary)

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# External APIs
FRED_API_KEY=               # Federal Reserve Economic Data
```

### Required for Supabase Edge Functions

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
CRON_SECRET=                # Required for sync-exchange-rates + sync-market-data
ANTHROPIC_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
FRED_API_KEY=
```

### Required for `apps/mobile`

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
