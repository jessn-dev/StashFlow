# StashFlow — Operations

> Defines environments, deployment workflows, CI/CD pipelines, incident handling, and database procedures.

---

## Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| Local (Dev) | Daily feature development and experimentation. | `http://localhost:3000` (web), `http://localhost:8081` (mobile) |
| Test (MVP) | **Active Milestone.** Production-grade preview for the MVP launch. Used for final validation before public release. | `https://test.stashflow.com` (planned) |
| Prod (Post-MVP) | Full-scale production. Deployed after Legal/Mobile MVP completion. | `https://stashflow.com` (planned) |

---

## Testing Strategy

StashFlow enforces a high-quality testing standard across all layers of the stack.

### Unit & Integration Tests

- **Deterministic Core**: `@stashflow/core` requires **90%+ branch coverage**. Tests cover all financial math and regional strategies.
- **Python Backend**: `apps/backend-py` requires **80%+ statement coverage**. Verified via `pytest --cov`.
- **Web Frontend**: `apps/web` uses Vitest for utility and middleware testing.

### End-to-End (E2E) Validation

- **Playwright**: Used for validating critical user journeys (Auth, Imports, Dashboard).
- **Local Run**: `cd apps/web && npx playwright test --project=chromium`
- **CI Run**: Executed on PRs to `develop` to prevent regressions in core flows.

---

## CI/CD Pipeline

GitHub Actions. Defined in `.github/workflows/`.

### Triggers

- Push to `main` or `develop`
- Pull request to `main` or `develop`

### Jobs

StashFlow uses a gated pipeline to ensure production stability.

**`test`** — runs on every push/PR:
```bash
pnpm install --frozen-lockfile
turbo run typecheck      # tsc --noEmit on all packages
pnpm lint                # tsc --noEmit on apps/web
pnpm test:coverage       # vitest with coverage; fails below threshold
cd apps/backend-py && PYTHONPATH=. uv run pytest --cov  # python coverage
```

**`deploy`** — runs on merge to `develop` (test) or `main` (prod):
1.  **Manual Approval**: Requires reviewer sign-off via GitHub Environments.
2.  **Backend-First**: Deploys Supabase secrets and Edge Functions before the frontend.
3.  **Vercel Prebuilt**: Uses `vercel pull` -> `vercel build` -> `vercel deploy --prebuilt` to ensure environment parity.

**`rls-tests`** — runs on every push/PR:
```bash
supabase start           # start local db
supabase test db         # run pgTAP RLS policies tests
```
✅ **Completed P3-B**: Verified cross-user isolation for incomes, expenses, loans, assets, and sessions.

**`security`** — runs on every push/PR:
```bash
pnpm audit --audit-level=high   # fails on high/critical CVEs
gitleaks detect --redact        # full history secret scan
```

---

## Deployment Process

StashFlow implements a **Backend-First** deployment strategy. The database and edge functions are fully updated and verified before the frontend artifacts are promoted.

| Stage | Action | Tool |
|-------|--------|------|
| 1. Validate | Lint, Typecheck, Unit Tests, RLS Tests | GitHub Actions |
| 2. Approve | Manual Sign-off | GitHub Environments |
| 3. Backend | `supabase db push` + `functions deploy` | Supabase CLI |
| 4. Frontend | `vercel deploy --prebuilt` | Vercel CLI |

### Production Rollback

In the event of a critical failure, use the `rollback-prod.yml` workflow. This performs a near-instant reversion to the last known stable deployment ID on Vercel and notifies the engineering team.

---

## Developer CLI (`./setup.sh`)

The root `setup.sh` script is the primary entry point for managing the development environment.

| Command | Purpose |
|---------|---------|
| `./setup.sh init` | One-time setup of dependencies and git |
| `./setup.sh dev` | Start the entire integrated stack |
| `./setup.sh dev --clean` | Fresh start (kills containers first) |
| `./setup.sh docker:clean` | Deep cleanup of project containers |
| `./setup.sh schema:sync` | **Governance**: Sync Python AI models to TypeScript |
| `./setup.sh db:shared` | Sync monorepo packages to Supabase environment |
| `./setup.sh db:reset` | Reset local DB and re-seed |

---

## First-Time Deploy Runbook

Complete guide for standing up a new environment (test or production) from zero.

### Prerequisites

```bash
brew install supabase/tap/supabase   # Supabase CLI
npm install -g vercel                 # Vercel CLI
brew install uv                       # Python Package Manager
brew install tesseract poppler       # OCR Engines (Local Dev only)
```

### Phase 0 — Platform Setup

1.  **Node.js**: Ensure **Node.js 24** is installed (managed via Volta or `.node-version`).
2.  **Supabase:** Create a new project. Gather **Project Ref**, **API URL**, **Anon Key**, and **Service Role Key**.
3.  **AI Keys:** Ensure you have production-ready keys for Groq, Gemini, and Anthropic.
4.  **Google OAuth:** Transition your GCP project to "Production" status and add `https://<ref>.supabase.co/auth/v1/callback` to the authorized redirect URIs.

### Phase 1 — CLI Link
```bash
supabase link --project-ref <your-project-ref>
```

### Phase 2 — Database Migrations
```bash
# This applies all 30+ versioned migrations to the production instance
supabase db push
```

### Phase 3 — Edge Function Secrets
```bash
supabase secrets set \
  GROQ_API_KEY=xxx \
  GEMINI_API_KEY=xxx \
  CRON_SECRET=xxx \
  LEDGER_SECRET=xxx \
  PARSE_LOAN_WEBHOOK_SECRET=xxx
```

### Phase 4 — Production Database Triggers
Because production URLs and service role keys are environment-specific, the migrations folder contains a safe "stub" for database triggers. To wire up the live AI document parsing pipeline:
1.  Open `supabase/snippets/production_wiring.sql`.
2.  Replace the placeholders with your **Production Project Ref**, **Service Role Key**, and **Webhook Secret**.
3.  Run the script in the **Supabase Dashboard SQL Editor**.

### Phase 5 — Edge Function Deployment
```bash
# Deploy all functions to production
supabase functions deploy log-session-event verify-ledger-integrity get-user-sessions revoke-session sync-exchange-rates parse-loan-document
```

### Phase 6 — Vercel Configuration
1.  Link the `apps/web` project to Vercel.
2.  Configure Environment Variables:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `SUPABASE_SERVICE_ROLE_KEY` (Required for SSR admin operations)

### Phase 7 — Wire CI Deploy Job
In `.github/workflows/ci.yml`, the `deploy` job is currently a stub.
1.  Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to GitHub Actions **Repository Secrets**.
2.  Uncomment the Vercel CLI commands in `ci.yml` to enable automated deployment on push to `main`.

### Phase 8 — Smoke Test Checklist
- [ ] Log in via Google (Verify callback and profile creation)
- [ ] Add a manual transaction (Verify Ledger integrity check passes)
- [ ] Upload a loan PDF (Verify AI parsing starts and completes)
- [ ] Check sidebar "Imports" page (Verify route loads)
- [ ] Create an Asset (Verify CRUD functionality)

---

## Monitoring (Target P3-D)

| Layer | Tool | Metrics |
|-------|------|---------|
| Web performance | Vercel Analytics | LCP, CLS, FID, p95 response |
| Error Tracking (Frontend) | Vercel Logs / Axiom | Runtime exceptions, API errors |
| Error Tracking (Backend) | Supabase Logs | Edge Function failures, DB errors |
| Anomaly detection | Custom | Transaction spike detection, unusual login patterns |

---

## Disaster Recovery

StashFlow maintains a **15-minute RPO** (Recovery Point Objective) and a **1-hour RTO** (Recovery Time Objective).

### Database Backups & Restore

**Point-in-Time Recovery (PITR)**:
- Enabled on production projects via Supabase Dashboard.
- Allows restoration to any second within the last 7 days.

**Manual Logical Backups**:
```bash
# Export the entire schema and data to a local SQL file
supabase db dump --project-ref <ref> -f backup_$(date +%Y%m%d).sql
```

**Restoration (Logical)**:
1.  Create a new Supabase project.
2.  Run `supabase db push` to apply the latest schema.
3.  Import data from the backup file via the SQL Editor or CLI.

### Migration Rollback

If a migration fails or introduces a regression:
1.  Identify the problematic migration timestamp.
2.  Revert the local schema to the previous state.
3.  For production, the primary recovery path is **Restoration from PITR** followed by a corrected deployment.

### Queue Replay Tooling (Async Ingestion)

If document processing fails at scale (e.g., AI provider outage):
1.  Identify failed documents in the `documents` table:
    ```sql
    SELECT id, storage_path FROM public.documents WHERE processing_status = 'error_generic';
    ```
2.  Manually re-enqueue via the Python backend API (or local worker):
    ```bash
    curl -X POST http://<python-api>/api/v1/documents/enqueue \
      -H "Content-Type: application/json" \
      -d '{"document_id": "UUID", "storage_path": "PATH"}'
    ```
3.  **Dead Letter Queue (DLQ)**: Failed jobs in the `stashflow-ingestion` queue are automatically moved to the failed registry by RQ. Use the RQ CLI or Dashboard to inspect and retry them.

### Incident Runbooks

| Incident | Immediate Action |
|----------|------------------|
| **AI Provider Outage** | Notify users via banner; the queue will automatically retry jobs (Max 3 attempts). |
| **Edge Function Timeout** | Ensure heavy processing is correctly handed off to the Python Worker Layer. |
| **Auth System Down** | Check Supabase Status. Pause automated workflows that require user-context. |
| **Storage Quota Reached** | Increase Supabase Storage limits or archive documents older than 90 days. |

...
tterns |

...
