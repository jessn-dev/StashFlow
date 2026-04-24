# StashFlow: Development Guide

Welcome to the StashFlow engineering team! This guide outlines our **Domain-Driven** development workflow designed for extreme stability and scale.

## 1. Local Environment Setup

StashFlow is a **Turborepo** monorepo using **pnpm** for package management.

### Prerequisites
*   **Node.js**: v22.x LTS (Recommended)
*   **pnpm**: v10.x
*   **Supabase CLI**: Required for local database development.
*   **Docker**: Required for running the local Supabase environment.

### Installation
```bash
./setup.sh init   # Bootstraps the monorepo and database
pnpm db:reset    # Reset local DB with high-volatility seed data
```

---

## 2. Monorepo Architecture

We maintain strict boundaries between logic, data, and presentation.

### 📦 `@stashflow/core` (Internal Packages)
Located in `packages/core/src`. **Never import from generic "utils" folders.**
*   `schema/`: Global TypeScript types and DB interfaces.
*   `math/`: Pure, side-effect-free financial logic (Amortization, DTI math).
*   `regional/`: Plugin-based regional strategy adapters.
*   `analysis/`: Analytical engines (Smart budgeting).

### 📦 `@stashflow/api` (Services)
Located in `packages/api/src/services`. **Uses a Service-Oriented approach.**
*   `DashboardService`: Orchestrates unified data for the main UI.
*   `FinancialService`: Manages core CRUD and transaction logic.

### 📦 `apps/web` (Feature Modules)
Located in `apps/web/modules`. **Treat every folder like a standalone library.**
*   Each module (e.g., `loans`, `spending`) must expose its public API via `index.ts`.
*   Avoid direct relative imports between modules.

---

## 3. Development Workflow

### Standard Commands
| Command | Description |
|---|---|
| `pnpm dev` | Start Web and API development servers. |
| `pnpm build` | Run a full monorepo build. |
| `pnpm test` | Run Vitest across all packages. |
| `pnpm test:coverage` | Run coverage (Threshold: 90% for Core). |

### Adding a New Region
1.  Create a new strategy class in `packages/core/src/regional/strategies/`.
2.  Register the strategy in `packages/core/src/regional/index.ts`.
3.  Profit. No other core logic changes required.

---

## 4. Resilience & Testing
*   **Sad Path Testing**: All new logic must include tests for null values, negative inputs, and network failures.
*   **Edge Functions**: Local functions are served via `supabase functions serve`.
*   **API Caching**: Always check the PostgreSQL cache (`ai_insights_cache`) before calling external AI APIs to preserve quota.

---

## 5. Deployment
*   **Web**: Automated via Vercel on merge to `main`.
*   **Edge Functions**: Deploy using `supabase functions deploy [name]`.
*   **Mobile (Future)**: Milestone 20.
