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
    │       (webhook-triggered, validates x-webhook-secret + Authorization header)
    │
    ├─ parse-document edge function (Deno):
    │       1. inspect MIME type + validate Magic Bytes
    │       2. download file from Supabase Storage
    │       3. extractPdfText() — raw text cache for secondary inference
    │       4. POST file to Python backend (/api/v1/documents/process) — synchronous
    │
    ├─ Python backend (FastAPI):
    │       1. classify document type (LOAN vs BANK_STATEMENT)
    │       2. extract text (PyMuPDF) with local OCR fallback (Tesseract)
    │       3. RESILIENT SEQUENTIAL EXTRACTION:
    │          - Two sequential AI passes (deterministic 0.0 + creative 0.2)
    │          - Avoids TPM (Tokens Per Minute) bursts common in Groq free tier
    │          - Provider Failover: Groq (70B) -> Gemini (2.0 Flash) on rate limits/errors
    │          - Graceful Degradation: If verification call fails, return primary result
    │            with `verification_status: 'skipped'` to trigger UI warnings.
    │       4. Disagreement Detection: Compare Call 1 and Call 2 if both succeeded.
    │          Disagreement on: document type, principal, loan structure, currency,
    │          interest rate (>20% relative), interest type, loan count → confidence < 0.4
    │       5. return UnifiedDocumentResult JSON with reliability metadata
    │
    └─ parse-document edge function (Deno) — resolution + persist:
...
---

## Future Reliability Roadmap (Post-MVP)

Strategic improvements planned to enhance the AI intelligence layer as scale increases.

### 1. Cross-Provider Verification (Groq vs. Gemini)
- **Current (MVP):** Resilient Self-Verification. We use the same provider (Groq or Gemini) for both extraction passes to manage strict free-tier RPM (Requests Per Minute) limits.
- **Post-MVP:** Dual-Model Cross-Check. Once on paid tiers with higher limits, the system will use Groq (Llama 3) for the primary pass and Gemini (Flash or Pro) for the verification pass.
 Comparing two entirely different model architectures is the "Gold Standard" for eliminating hallucinated numbers.

### 2. Multi-Modal Vision Processing
- **Current:** Text-only extraction (PDF → Markdown/Text → LLM).
- **Post-MVP:** Vision + Text hybrid. Passing raw document screenshots alongside text helps preserve spatial context (letterheads, table cell relationships) which is occasionally lost in linear text extraction.

### 3. Asynchronous Verification Loop
- **Current:** Synchronous processing (User waits for both passes).
- **Post-MVP:** "Instant Result + Background Verify." Return the primary extraction immediately for UX snappiness, then run the second verification pass as a background job that updates the document status asynchronously.

### 4. User Usage & Cost Guardrails (Daily Upload Limits)
- **Current:** No user-level caps. Users can upload unlimited documents, potentially exhausting AI API quotas.
- **Post-MVP:** Tier-based Usage Caps.
  - **Free Tier:** 3 uploads per day.
  - **Pro Tier:** Unlimited (or higher) uploads.
- **Mechanism:** The `parse-document` edge function will query the `documents` table to count recent uploads (`created_at >= NOW() - INTERVAL '24 hours'`). If the limit is reached, it will abort processing with a `error_rate_limit` status and return a user-friendly "Upgrade to Pro" message.
            1. resolveAnnualRate()  — detects monthly rate stored as annual; converts via
               payment math cross-check (Add-on text signals + installment amount ± 2%)
            2. inferInterestTypeFromText() — 6-pattern regex; ≥2 matches → Add-on Interest
            3. extractAnnualEIR()   — regex extracts Annual EIR if explicitly in document
            4. inferCurrency()      — symbol/code pattern scan with ALLOWED_CURRENCIES gate
            5. inferDurationMonths() — repayment plan name → standard term fallback
            6. per-loan validation: principal, rate range, duration, lender, currency
            7. cross-loan currency consistency check (multi-loan docs)
            8. write to documents.extracted_data (JSONB)
            9. update processing_status → 'success' or 'error_generic'
           10. client polls via Supabase Realtime (DocumentStatusWatcher.tsx)
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

## User Tiers & Feature Matrix

StashFlow implements a tiered access model to manage AI costs and provide premium value to subscribers.

### Differentiation Table

| Feature | **Free Tier** (Default) | **Pro Tier** (Subscription) |
| :--- | :--- | :--- |
| **AI Document Parsing** | 3 uploads per day | Unlimited |
| **Multi-Currency Support**| Base currency only | Full multi-currency accounting |
| **Intelligence Advisor** | Basic cash flow insights | Macro-financial advisor + Market trends |
| **Ledger Integrity** | Signature verification | Full immutable audit trail access |
| **Document Storage** | 100MB | 5GB + Versioning |
| **Session Intelligence** | Current session only | 30-day session history + IP/Geo alerts |

### Implementation Path (Post-MVP)
1.  **Database:** Add `plan_tier` (ENUM: 'free', 'pro') to the `profiles` table.
2.  **Edge Functions:** All AI-driven or storage-heavy functions will check the user's `plan_tier` via the `Authorization` header JWT (Supabase includes profile data in the JWT if configured via `auth.users` triggers).
3.  **Frontend:** UI components (like `LoanUploadZone` or `MacroAdvisor`) will conditionally render "Upgrade" prompts based on the user's tier.

### Subscription Lifecycle (Upgrade Workflow)

To enable self-service upgrades, StashFlow supports multiple payment providers to ensure global coverage, following the industry-standard **Webhook Pattern**:

#### Provider Options:
- **Stripe (Global/US-Centric):** Best for US, Singapore, or EU-based legal entities. Provides a seamless "unbranded" card experience. Requires Stripe Atlas for PH-based businesses.
- **PayPal (Asia/PH Native):** Best for Philippines-based legal entities. Supports native PH business registration and local bank linking (BDO/BPI) without requiring a US company.

#### Workflow:
1.  **Selection:** User selects the Pro plan in the app settings.
2.  **Redirect:** App creates a checkout session (Stripe) or subscription plan (PayPal) and redirects the user to the provider's secure payment page.
3.  **Payment:** User completes the payment securely.
4.  **Webhook:** Provider sends a success event (e.g., `checkout.session.completed` for Stripe or `BILLING.SUBSCRIPTION.CREATED` for PayPal) to the StashFlow Edge Function (`supabase/functions/handle-payments`).
5.  **Provisioning:** The Edge Function validates the provider's cryptographic signature, identifies the user, and updates `profiles.plan_tier = 'pro'` in the database.
6.  **Activation:** The app detects the update (via Realtime or Session Refresh) and immediately unlocks Pro features.

### Pro Trial Lifecycle (On-Demand Activation)

To lower the barrier to entry, StashFlow provides a one-time **14-day Pro Trial** that users can activate at any time.

- **On-Demand:** The trial does not start automatically upon signup. Users can click "Start 14-Day Free Trial" from their dashboard whenever they are ready to explore premium features.
- **State Management:** The `profiles` table will track `trial_activated_at` and `trial_expires_at`.
- **Logic:** Once activated, the expiration date is set to `NOW() + INTERVAL '14 days'`. The `Authorization` logic treats an active trial identically to a paid 'pro' tier.

### Data Retention & "The Soft Lock" Strategy

If a Pro Trial or Subscription expires, StashFlow prioritizes **Data Integrity** over aggressive locking:

1.  **Retention:** No data is ever deleted. The user's financial history remains 100% intact.
2.  **The Soft Lock:** Users are moved to a "Read-Only / Legacy" state for Pro features:
    - **Multi-Currency:** Can view existing multi-currency assets/loans but cannot add new ones or change the currency of existing ones.
    - **AI Parsing:** Reverts to the 3-per-day limit. Existing "Pro-verified" document results remain accessible.
    - **Macro Advisor:** Real-time access is disabled, but previous insights remain in the history.
3.  **Upgrade Incentive:** To resume adding data or using advanced intelligence, the user is prompted to upgrade. This ensures they never feel "locked out" of their own financial history, maintaining trust.

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
