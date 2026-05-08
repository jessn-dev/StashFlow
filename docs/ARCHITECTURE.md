# StashFlow — Architecture

> Living document. Update when service boundaries, data flows, or infrastructure change.

---

## System Overview

StashFlow is a multi-platform personal finance platform built on a domain-driven monorepo. Business logic is pure and isolated; all platform-specific code (HTTP, DB, React) stays at the edges.

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

---

## Monorepo Structure

```
StashFlow/
├── apps/
│   ├── web/                  # Next.js 16, App Router, RSC, Tailwind 4, shadcn/ui
│   └── mobile/               # Expo SDK 55, React Native, NativeWind
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
├── deno.json                 # Deno workspace root
├── turbo.json                # Turborepo pipeline
└── pnpm-workspace.yaml
```

---

## Dependency Hierarchy

Strictly enforced. No violations permitted.

```
@stashflow/theme   ← no deps
@stashflow/core    ← no deps
@stashflow/db      ← core + supabase-js
@stashflow/auth    ← core + supabase-js
@stashflow/ui      ← theme
@stashflow/api     ← core + db
apps/web           ← api, auth, db, ui, theme
apps/mobile        ← db, ui, theme  (never api)
supabase/functions ← @stashflow/core via Deno workspace
```

### Rules

| Package | Can import | Cannot import |
|---------|-----------|---------------|
| `@stashflow/core` | nothing | everything |
| `@stashflow/theme` | nothing | everything |
| `@stashflow/db` | core, supabase-js | everything else |
| `@stashflow/auth` | core, supabase-js | everything else |
| `@stashflow/ui` | theme | core, api, supabase |
| `@stashflow/api` | core, db | ui, Next.js internals |
| `apps/web` | api, auth, db, ui, theme | react-native |
| `apps/mobile` | db, ui, theme | api, next |
| `supabase/functions` | core (Deno workspace) | api, ui |

**Mobile never imports `@stashflow/api`** — it contains React browser APIs incompatible with React Native. Mobile talks directly to Supabase and imports `@stashflow/core` for business logic.

---
## Domain Boundaries

Each domain owns its schemas, services, business logic, and validation.

```
transactions/   → unified timeline via unified_transactions view (incomes + expenses)
loans/          → loan lifecycle, amortization, documents
...
assets/         → asset tracking, multi-currency holdings
plans/          → goals + budgets
dashboard/      → aggregated financial snapshot
auth/           │ session, tokens, MFA
exchange-rates/ → FX rates, currency conversion
analytics/      → drilldowns (cash flow), simulators (DTI)
```

---

## Authentication Architecture

### Web (`apps/web`)

```
Client → Next.js Middleware → Supabase SSR (@supabase/ssr)
                                    │
                           JWT stored in httpOnly cookies
                           Session refreshed server-side
                                    │
                          Protected routes checked in layout RSCs
                          Unauthenticated → redirect /login
```

- `@supabase/ssr` handles cookie management and server-side session hydration
- `createClient()` (server): reads session from cookies, never touches `localStorage`
- `createClient()` (client): browser-side for mutations and realtime
- OAuth (Google): PKCE flow via `/auth/callback` route
- MFA: TOTP via Supabase Auth; enrollment in Settings, challenge at login

### Mobile (`apps/mobile`)

```
Expo app → supabase.auth.signIn → JWT stored in SecureStore
                                        │
                               Direct Supabase client (not via api package)
                               RLS enforces user isolation at DB layer
```

- `expo-secure-store` for token persistence (encrypted, hardware-backed)
- No shared session state with web (separate auth context)

### Edge Functions

User-facing functions: receive user JWT in `Authorization` header, validate via `supabase.auth.getUser()`. Never use service role key for user-scoped operations.

Webhook/cron functions: validate `x-webhook-secret` header against env secret. Service role key used only here.

---

## Data Flow

### Read path (dashboard)

```
RSC page.tsx
    │
    ├─ parallel fetches via @stashflow/api queries
    │       (ProfileQuery, TransactionQuery, LoanQuery, ExchangeRateQuery, AssetQuery)
    │
    ├─ aggregation via @stashflow/core pure functions
    │       (aggregateLoanFinancials, calculateDTIRatio, convertToBase)
    │
    └─ renders component tree with serialized data
            (client components receive pre-computed values, not raw DB rows)
```

### Write path (transaction entry)

```
Client component form submit
    │
    ├─ validate input (client-side for UX)
    │
    ├─ supabase.from('incomes' | 'expenses').insert(...)
    │       (direct client — no server action needed for simple inserts)
    │
    └─ router.refresh() → RSC re-fetches from DB
```

### Loan document parsing

```
User uploads PDF → Supabase Storage (user_documents bucket)
    │
    ├─ Postgres trigger (tr_parse_loan_document) fires on INSERT to documents
    │
    ├─ pg_net HTTP call → parse-loan-document edge function
    │       (webhook-triggered, SERVICE_ROLE_KEY, validates x-webhook-secret)
    │
    ├─ 3-tier pipeline:
    │       1. unpdf text extraction → deterministic regex parser → confidence score
    │       2. Google Vision OCR (if confidence < 0.85)
    │       3. Groq → Gemini → Claude AI fallback (if confidence < 0.70)
    │
    └─ extracted data written back to documents.extracted_data (JSONB)
       processing_status updated → client polls via Supabase Realtime
```

---

## Realtime Architecture

Used for loan document processing status updates only (current implementation).

```
Client (DocumentStatusWatcher.tsx)
    │
    ├─ supabase.channel('documents')
    │  .on('postgres_changes', { event: 'UPDATE', filter: 'id=eq.DOC_ID' })
    │  .subscribe()
    │
    └─ triggers re-fetch on status change to 'processed'
```
