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

## CI/CD Pipeline

GitHub Actions. Defined in `.github/workflows/`.

### Triggers

- Push to `main` or `develop`
- Pull request to `main` or `develop`

### Jobs

Four parallel jobs; `e2e` depends on `test`.

**`test`** — runs on every push/PR:
```bash
pnpm install --frozen-lockfile
turbo run typecheck      # tsc --noEmit on all packages
pnpm lint                # tsc --noEmit on apps/web
pnpm test:coverage       # vitest with coverage; fails below threshold
```

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

**`e2e`** — runs only on PRs to `develop`, after `test` passes:
```bash
playwright install --with-deps
playwright test   # chromium + firefox + webkit
```
Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` repository secrets.

### Coverage Thresholds (CI fails if below)

| Package | Lines | Functions | Branches |
|---------|-------|-----------|----------|
| `@stashflow/core` | 90% | 90% | 90% |
| `@stashflow/api` | 70% | 70% | 60% |
| `apps/web` | 20% | 20% | 20% |

---

## Deployment Process

### Ongoing Deployments (once configured)

| What | How |
|------|-----|
| Web | Push to `main` → CI passes → Vercel auto-deploys |
| Edge functions | `supabase functions deploy` (independent of web) |
| Schema changes | `supabase db push --linked` → `pnpm gen:types` |
| Mobile | `eas build --platform all && eas submit` (not yet configured) |

---

## First-Time Deploy Runbook

Complete guide for standing up a new environment (test or production) from zero.

### Prerequisites

```bash
brew install supabase/tap/supabase   # Supabase CLI
npm install -g vercel                 # Vercel CLI
```

### Phase 0 — Platform Setup

1.  **Supabase:** Create a new project. Gather **Project Ref**, **API URL**, **Anon Key**, and **Service Role Key**.
2.  **AI Keys:** Ensure you have production-ready keys for Groq, Gemini, and Anthropic.
3.  **Google OAuth:** Transition your GCP project to "Production" status and add `https://<ref>.supabase.co/auth/v1/callback` to the authorized redirect URIs.

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
  ANTHROPIC_API_KEY=xxx \
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
| Anomaly detection | Custom | Transaction spike detection, unusual login patterns |

...
