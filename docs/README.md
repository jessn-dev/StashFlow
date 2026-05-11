# StashFlow

Personal finance platform for multi-currency users. Tracks income, expenses, loans, budgets, and goals — with AI-powered document parsing and region-specific financial rules.

Targets users in the Philippines, United States, and Singapore with appropriate regional thresholds (DTI, tax categories, loan conventions).

---

## Overview

StashFlow is a calm financial command center. It reduces financial anxiety through automated calculations, multi-currency normalization, and intelligent loan contract parsing — without requiring bank account linking.

Data entry is manual or via PDF upload. The AI pipeline extracts loan terms from uploaded contracts automatically.

---

## Core Features

- **Multi-currency tracking** — Incomes, expenses, and loans in any currency. All dashboard metrics normalize to the user's preferred base currency via live FX rates.
- **Loan management** — Supports Standard Amortized, Add-on Interest, Interest-Only, and Fixed Principal loan types. Generates full amortization schedules. Tracks payment status.
- **AI loan document parsing** — Upload a loan contract PDF; the 3-tier pipeline (regex → OCR → LLM) extracts principal, rate, term, and payment structure automatically.
- **Intelligent loan modeling** — Numerical inference engine classifies loan type from principal/payment/rate/term without asking technical questions.
- **Cryptographic ledger integrity** — HMAC-SHA256 signatures on financial records to detect unauthorized tampering.
- **Session anomaly detection** — Monitors login patterns and geographic shifts to identify and block potential account takeovers.
- **DTI health** — Debt-to-income ratio with regional thresholds (PH 40%, US 36%, SG 55%). Zero-income edge case handled correctly.
- **Plans** — Savings and debt goals with progress tracking. Per-category budgets with monthly spend snapshots.
- **Transaction timeline** — Unified income + expense feed with URL-driven filtering, inline edit/delete, and date-range presets.
- **MFA** — TOTP-based multi-factor authentication via Supabase Auth.

---

## Architecture

Domain-driven monorepo. Pure business logic in `@stashflow/core` → service layer in `@stashflow/api` → Next.js web app + Expo mobile app. Supabase handles database, auth, storage, and edge functions.

```
Browser / Mobile App
        │
        ▼
   Next.js 16 (RSC + Server Actions)
   Expo SDK 55 (React Native)
        │
        ▼
   @stashflow/api (Supabase queries + service layer)
        │
        ▼
   Supabase (Postgres + Auth + Storage + Edge Functions)
        │
        ▼
   @stashflow/core (pure financial logic — no I/O)
```

For full architecture detail: `docs/ARCHITECTURE.md`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.9.0 |
| Web framework | Next.js | 16.2.6 |
| UI runtime | React | 19.2.0 |
| Mobile | Expo SDK | ~55.0.23 |
| Styling (web) | Tailwind CSS | 4.2.4 |
| Styling (mobile) | NativeWind | ^4.1.23 |
| Backend | Python (Intelligence) | 3.12 |
| Component library | shadcn/ui | latest |
| Database + Auth | Supabase | Postgres 17 |
| Supabase JS | @supabase/supabase-js | ^2.105.4 |
| SSR auth | @supabase/ssr | ^0.10.3 |
| Unit testing | Vitest / Pytest | ^4.1.5 / latest |
| E2E testing | Playwright | ^1.59.1 |
| Monorepo | Turborepo | 2.9.12 |
| Package manager | pnpm | 10.33.2 |
| Edge functions | Deno | 2 |

---

## Monorepo Structure

```
StashFlow/
├── apps/
│   ├── web/                  # Next.js 16, App Router, RSC, Tailwind 4, shadcn/ui
│   ├── mobile/               # Expo SDK 55, React Native, NativeWind
│   └── backend-py/           # FastAPI, Python 3.12, ML, OCR
│
├── packages/
│   ├── core/                 # @stashflow/core — pure TS, zero deps, Deno-compatible
│   ├── api/                  # @stashflow/api  — Supabase queries, service layer (web/Node only)
│   ├── db/                   # @stashflow/db   — platform-specific client factories (browser/server/mobile)
│   ├── auth/                 # @stashflow/auth — server-side session helpers
│   ├── ui/                   # @stashflow/ui   — shared component primitives
│   └── theme/                # @stashflow/theme — design tokens
│
├── supabase/
│   ├── functions/            # Deno edge functions
│   └── migrations/           # Versioned SQL migrations (20+)
│
├── docs/                     # Engineering documentation
├── .node-version             # Node.js 24
├── deno.json                 # Deno workspace root
├── turbo.json                # Turborepo pipeline
└── pnpm-workspace.yaml
```

---

## Local Development

### Prerequisites

- Node.js 24 LTS
- Docker Desktop
- pnpm 10
- Python 3.12 (via uv)

### Setup

```bash
chmod +x setup.sh
./setup.sh
```

This installs pnpm if missing, installs all workspace dependencies, starts local Supabase containers, and applies all migrations.

If `setup.sh` installed pnpm, refresh your shell:
```bash
source ~/.zshrc
```

### Environment Variables

**`apps/web/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
```

**`apps/mobile/.env`:**
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
```

---

## Running the Project

```bash
pnpm dev            # run web + mobile in parallel
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| Mobile (Metro) | http://localhost:8081 |
| Supabase Studio | http://localhost:54323 |

---

## Testing

```bash
pnpm test                                    # all packages
pnpm test --filter=@stashflow/core           # single package
pnpm test:coverage --filter=@stashflow/core  # with coverage
turbo run typecheck                          # typecheck all packages
```

Coverage thresholds enforced in CI:

| Package | Required |
|---------|----------|
| `@stashflow/core` | 90% |
| `@stashflow/api` | 70% |
| `apps/web` | 30% |
| `apps/backend-py` | 80% |

---

## Database

```bash
pnpm db:start       # start Supabase containers
pnpm db:reset       # wipe + reapply all migrations
pnpm gen:types      # regenerate TypeScript types from schema
```

Run `gen:types` after any schema change. The generated file is `packages/core/src/schema/database.types.ts`.

---

## Deployment

| Platform | Target |
|----------|--------|
| Web | Vercel (planned) |
| Mobile | Expo EAS (planned) |
| Edge functions | Supabase (deployed via `supabase functions deploy`) |

See `docs/OPERATIONS.md` for deployment procedures.

---

## Documentation

| Document | Contents |
|----------|---------|
| `docs/ARCHITECTURE.md` | System design, data flows, package boundaries |
| `docs/SECURITY.md` | Threat model, auth, RLS strategy, security checklist |
| `docs/DATA_MODEL.md` | All DB entity schemas, relationships, currency handling |
| `docs/API.md` | Full API reference — Supabase client methods + edge functions |
| `docs/OPERATIONS.md` | Environments, CI/CD, migrations, incident response |
| `docs/CONTRIBUTING.md` | Branching, commit standards, PR requirements, testing |
| `docs/DECISIONS.md` | Architectural decision records (ADRs) |
| `docs/ROADMAP.md` | What is built, what is next, what is deferred |
| `docs/CHANGELOG.md` | Versioned history of changes |

---

## Security Notes

- Financial data is isolated at the database layer via Row Level Security — no query can return another user's data
- JWTs stored in httpOnly cookies on web; `expo-secure-store` on mobile
- Service role key never exposed to the browser
- AI document parsing runs server-side in Deno edge functions — uploaded PDFs never reach the client
- See `docs/SECURITY.md` for full threat model and security checklist

---

## License

MIT. See `LICENSE.md`.







