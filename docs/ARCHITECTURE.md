# StashFlow — Architecture

> Living document. Update when service boundaries, data flows, or infrastructure change.

---

## System Overview

StashFlow is a multi-platform personal finance platform built on a hybrid architecture: **Deterministic TypeScript Core + Python Intelligence Layer**.

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
   Supabase (Postgres 17 + Auth + Storage + Edge Functions)
        │                     │
        ▼                     ▼
   @stashflow/core      Python AI Backend (FastAPI)
   (Deterministic)      (Probabilistic / AI + mypy)
```

---

## Monorepo Structure

```
StashFlow/
├── apps/
│   ├── web/                  # Next.js 16, App Router, RSC, Tailwind 4, shadcn/ui
│   ├── mobile/               # Expo SDK 55, React Native 0.83, NativeWind
│   └── backend-py/           # FastAPI, Python 3.12, ML, OCR, mypy
│
├── packages/
│   ├── core/                 # @stashflow/core — pure TS, zero deps, Deno-compatible
│   ├── document-parser/      # @stashflow/document-parser — shared parsing logic + schemas
│   ├── api/                  # @stashflow/api  — Supabase queries, service layer (web/Node only)
│   ├── db/                   # @stashflow/db   — platform-specific client factories
│   ├── auth/                 # @stashflow/auth — server-side session helpers
│   ├── ui/                   # @stashflow/ui   — shared component primitives
│   └── theme/                # @stashflow/theme — design tokens
│
├── supabase/
│   ├── functions/            # Deno edge functions (Gateway to Python AI)
│   └── migrations/           # Versioned SQL migrations (20+)
│
├── .node-version             # Node.js 24
├── deno.json                 # Deno workspace root
├── turbo.json                # Turborepo pipeline
└── pnpm-workspace.yaml
```

---

## Development & Readability Standards

Maintainability is treated as a first-class architectural requirement. StashFlow mandates a **Three-Layer Documentation** strategy for all logic:

1.  **High-Level Docstrings**: Comprehensive TSDoc/Google-style documentation for all public APIs, defining intent, parameters, and results.
2.  **Algorithmic Pseudocode**: Human-readable logic outlines (`PSEUDOCODE:`) before complex algorithms to lower the barrier for understanding.
3.  **Strategic Inline Comments**: Explanations for the "Why" behind non-obvious business rules or technical workarounds.

This approach ensures the system remains "self-documenting" and accessible to both human contributors and AI agents.

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
apps/mobile        ← db, ui, theme (never api)
apps/backend-py    ← Python-only (uv)
supabase/functions ← @stashflow/core, @stashflow/document-parser
```

### Rules

| Package | Can import | Cannot import |
|---------|-----------|---------------|
| `@stashflow/core` | nothing | everything |
| `@stashflow/theme` | nothing | everything |
| `@stashflow/document-parser`| core | everything else |
| `@stashflow/db` | core, supabase-js | everything else |
| `@stashflow/auth` | core, supabase-js | everything else |
| `@stashflow/ui` | theme | core, api, supabase |
| `@stashflow/api` | core, db | ui, Next.js internals |
| `apps/web` | api, auth, db, ui, theme | react-native |
| `apps/mobile` | db, ui, theme | api, next |
| `apps/backend-py` | nothing (Python) | TypeScript packages |
| `supabase/functions` | core, document-parser | api, ui |


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

### Unified document processing

```
User uploads PDF → Supabase Storage (user_documents bucket)
    │
    ├─ Postgres trigger (tr_on_document_inserted) fires on INSERT to documents
    │
    ├─ pg_net HTTP call → parse-document edge function
    │       (webhook-triggered, validates x-webhook-secret)
    │
    ├─ Security Gate (Deno Edge Function):
    │       1. inspect MIME type
    │       2. validate Magic Bytes (file signature)
    │       3. enqueue job to Redis (local/Upstash)
    │
    ├─ Intelligence Worker Layer (Python RQ/Celery):
    │       1. download file from Supabase Storage
    │       2. extract text (PyMuPDF) with local OCR fallback (Tesseract)
    │       3. Parallel AI Classification & Structured Extraction
    │       4. callback to Supabase via document-processed-webhook
    │
    └─ persistence path (Deno Edge Function - Webhook):
            1. enforce "Rule 1" financial validation
            2. write extracted data + provenance to documents.extracted_data (JSONB)
            3. update processing_status to 'success'
```

---

## Shared Schema Governance

To prevent contract drift between the Python AI layer and the TypeScript application, StashFlow implements an automated governance pipeline.

1.  **Source of Truth**: Pydantic models in `apps/backend-py/src/schemas/`.
2.  **Export**: `./setup.sh schema:sync` triggers a Python script to export models as JSON Schemas.
3.  **Generation**: `json-schema-to-typescript` converts these to TypeScript interfaces in `@stashflow/document-parser`.
4.  **Synchronization**: The generated types are automatically copied to the Supabase Edge Function environment.

---

## Security & Integrity

### Ledger Integrity

To detect unauthorized tampering with financial records, StashFlow implements a cryptographic ledger.
- **Mechanism**: Every `income` and `expense` record includes a `signature` column.
- **Algorithm**: HMAC-SHA256.
- **Verification**: The `verify-ledger-integrity` edge function scans the last 1,000 transactions to ensure all signatures match the current record data.

### Session Intelligence

StashFlow monitors session health to detect potential account takeovers.
- **Event Logging**: The `log-session-event` webhook captures IP, country, and User-Agent metadata on every login.
- **Anomaly Scoring**: A pure algorithm in `@stashflow/core` scores logins based on geographic shifts and unusual hours.
- **Management**: Users can view and revoke active sessions directly from the Settings dashboard.

---

## CI/CD Pipeline

StashFlow uses a gated, backend-first deployment strategy to ensure system stability.

```
Merge to develop/main
        │
        ▼
   CI Job (Lint, Typecheck, Unit Tests, RLS Tests)
        │
        ▼
   Manual Approval Gate (GitHub Environments)
        │
        ▼
   Backend Deploy (Supabase Secrets + Migrations + Edge Functions)
        │
        ▼
   Frontend Deploy (Vercel --prebuilt)
```

- **Backend-First**: Supabase infrastructure is fully updated before the frontend goes live.
- **Vercel Prebuilt**: Artifacts built in CI are deployed directly, ensuring parity between testing and production.
- **Rollback**: A dedicated `rollback-prod.yml` workflow allows for near-instant reversion to previous stable deployment IDs.

---

## Realtime Architecture

Used for loan document processing status updates and live ledger status.

```
Client (DocumentStatusWatcher.tsx)
    │
    ├─ supabase.channel('documents')
    │  .on('postgres_changes', { event: 'UPDATE', filter: 'id=eq.DOC_ID' })
    │  .subscribe()
    │
    └─ triggers re-fetch on status change to 'processed'
```
