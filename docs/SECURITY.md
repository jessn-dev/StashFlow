# StashFlow — Security

> Living document. Update when security model, policies, or incident procedures change.

---

## Threat Model

### Assets

| Asset | Sensitivity |
|-------|-------------|
| User financial data (incomes, expenses, loans) | Critical — PII + financial |
| Authentication tokens (JWTs, refresh tokens) | Critical |
| Uploaded loan documents (PDFs) | High — contains contract terms and personal data |
| Exchange rate and market data | Low — public data |

### Threat Actors

| Actor | Capability | Primary Attack Vector |
|-------|-----------|----------------------|
| Unauthenticated attacker | External, no credentials | Auth bypass, IDOR on public endpoints |
| Authenticated attacker | Valid JWT, own data | Horizontal privilege escalation (access other users' data) |
| Malicious document upload | Valid user | Malformed PDF triggering parser exploits or data extraction leaks |
| Compromised dependency | Supply chain | Code execution, secrets exfiltration |

### Attack Surface

1. **Supabase REST API** — direct DB access via PostgREST; RLS is the primary isolation layer
2. **Edge functions** — webhook-triggered and user-facing HTTP endpoints
3. **File upload pipeline** — PDFs processed through multi-stage AI pipeline
4. **OAuth callback** — PKCE flow via `/auth/callback`; redirect_uri must be validated
5. **Browser client** — XSS entry point; tokens in httpOnly cookies protect against JS extraction

### Out of Scope

- Supabase platform infrastructure (cloud provider responsibility)
- Denial-of-service attacks on Supabase endpoints
- Physical device compromise

---

## Authentication

### Web (`apps/web`)

```
Client → Next.js Middleware → @supabase/ssr
                                  │
                         JWT stored in httpOnly, SameSite=Lax cookies
                         Session refreshed server-side on each request
                                  │
                         Protected routes: session checked in layout RSC
                         Unauthenticated → redirect /login
```

**Key properties:**
- JWT never stored in `localStorage` or `sessionStorage`
- Cookie refresh happens server-side — client JS cannot observe or modify tokens
- `createClient()` (server): reads from cookies via `@supabase/ssr`
- `createClient()` (client): browser-side, used only for mutations and realtime subscriptions
- OAuth (Google): PKCE flow — no implicit flow, no token in URL fragment

### Mobile (`apps/mobile`)

```
Expo → supabase.auth.signIn → JWT stored in expo-secure-store
                                   │
                          Hardware-backed encrypted storage
                          Direct Supabase client (not @stashflow/api)
                          RLS enforces isolation at DB layer
```

`expo-secure-store` uses iOS Keychain / Android Keystore. Tokens never in plain storage.

### Multi-Factor Authentication

TOTP via Supabase Auth. `MfaManager` component in Settings allows enrollment. Login flow checks `aal2` assurance level — elevated to MFA challenge if enrolled. `MfaNudgeBanner` prompts unenrolled users globally with `sessionStorage` dismissal.

### Session Intelligence (P3-A)

StashFlow monitors session health to detect potential account takeovers.
- **Event Logging**: The `log-session-event` webhook captures IP, country, and User-Agent metadata on every login, stored in `session_events`.
### Anomaly Scoring

A pure algorithm in `@stashflow/core` scores logins based on geographic shifts and unusual hours. Users can view risk scores for all active sessions and revoke access (force logout) from the Settings dashboard.

### AI Safety & Hallucination Defense (P4)

To protect financial integrity from AI hallucinations, StashFlow implements multi-stage defensive extraction:
- **Parser Disagreement Detection**: Every document is processed by two parallel LLM instances at different temperatures. 
- **Confidence Penalties**: If models disagree on core facts (principal, interest, etc.), the system automatically caps confidence at `0.4`.
- **Human-in-the-Loop Review**: Extractions with low confidence or statistical anomalies (Rule 1 violations) are forced into a non-persistent "Review State" in the UI. Data only enters the ledger after manual user confirmation.
- **Explainable Provenance**: Every extracted field is linked to a specific PDF text snippet, allowing users to verify AI work with one click.

---

## Authorization

### Row Level Security Strategy

Every user-owned table has RLS enabled. All PostgREST queries execute as the authenticated user — no query bypasses RLS.

**Current state:** Tables have explicit per-operation policies with strict `WITH CHECK` clauses (migration `20260510000001_explicit_rls_policies.sql`).

**`system_audit_logs`:** Append-only by design. Users have `SELECT` only. `INSERT` only via service role (no user-initiated writes). No `UPDATE` or `DELETE` policy exists.

### IDOR Prevention

The `delete-account` edge function (and all admin operations) validate that `body.userId` matches the authenticated user's JWT subject before executing service-role operations:

```typescript
const { data: { user } } = await userClient.auth.getUser()
if (body.userId !== user.id) return errorResponse('Forbidden', 403)
await adminClient.auth.admin.deleteUser(user.id)
```

---

## Data Integrity (P3-C)

### Ledger Integrity

To detect unauthorized tampering with financial records, StashFlow implements a cryptographic ledger.
- **Mechanism**: Every `income` and `expense` record includes a `signature` column.
- **Algorithm**: HMAC-SHA256 signing of the amount, currency, date, and description.
- **Verification**: The `verify-ledger-integrity` edge function scans records for signature validity.
- **Indicator**: A "Ledger Secure" status indicator in the web app provides real-time verification feedback.

---

## Token Management

## Token Management

### JWT Lifecycle

| Token | Storage | TTL | Refresh strategy |
|-------|---------|-----|------------------|
| Access token (web) | httpOnly cookie | 1h (Supabase default) | Auto-refresh via `@supabase/ssr` middleware |
| Refresh token (web) | httpOnly cookie | 60 days (Supabase default) | Rotated on use |
| Access token (mobile) | expo-secure-store | 1h | Supabase client auto-refreshes |
| Service role key | `.env` (never client) | Non-expiring | Rotated manually on compromise |

### Cookie Configuration

Managed by `@supabase/ssr`. Cookies are set with:
- `HttpOnly: true` — JS cannot read
- `SameSite: Lax` — protects against most CSRF; Strict not used because OAuth callback requires cross-origin redirect
- `Secure: true` — HTTPS only in production

### Service Role Key

**Never exposed to the browser.** Used only in:
1. `delete-account` edge function (for `admin.deleteUser()`)
2. Webhook-triggered edge functions (`parse-loan-document`, cron jobs)

---

## Edge Function Security

### User-Facing Functions

Accept user JWT in `Authorization` header. Validate immediately:

```typescript
const supabase = createClient(url, anonKey, {
  global: { headers: { Authorization: req.headers.get('Authorization') } }
})
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) return new Response('Unauthorized', { status: 401 })
```

Service role key never used in user-facing functions.

### Webhook-Triggered Functions (`parse-loan-document`)

No user session — triggered by `pg_net` database trigger. Uses service role for Supabase operations. Validates `x-webhook-secret` header against `PARSE_LOAN_WEBHOOK_SECRET` env var before processing:

```typescript
const webhookSecret = req.headers.get('x-webhook-secret')
if (webhookSecret !== Deno.env.get('PARSE_LOAN_WEBHOOK_SECRET')) {
  return new Response('Forbidden', { status: 403 })
}
```

### Cron Functions

Validate `CRON_SECRET` header:

```typescript
const secret = req.headers.get('Authorization')
if (secret !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
  return new Response('Forbidden', { status: 403 })
}
```

### CORS

Edge functions return explicit CORS headers. Allowed origins are restricted in production.

---

## Secrets Management

**Rules:**
- Secrets live in `.env` files only — never committed to git
- `.env*` patterns are in `.gitignore`
- `SUPABASE_SERVICE_ROLE_KEY` only in edge function environment variables, never in `apps/`
- API keys for AI providers (Groq, Gemini, Google Vision) in Supabase edge function secrets

**Local development:** `supabase/functions/.env` is loaded by `supabase functions serve`. This file is gitignored. `./setup.sh db:jwt` generates the dev service role JWT for the pg_net trigger.

**CI/CD:** Secrets stored as GitHub Actions repository secrets. Never printed in logs.

---

## File Upload Security

### Current Implementation

- Files uploaded to Supabase Storage `user_documents` bucket
- Storage path: `{user_id}/{filename}` — isolates files per user at storage layer
- Signed URLs required to access files — no public reads
- Processing status tracked in `documents` table, updated by the parse pipeline

### Hardening Applied (P1-B complete)

- [x] **Explicit per-operation RLS policies** —migration `20260510000001_explicit_rls_policies.sql`. All tables refactored from `FOR ALL` to `SELECT/INSERT/UPDATE/DELETE`.
- [x] **Immutable audit logs for financial mutations** — migration `20260510000002_audit_log_triggers.sql`. Triggers automatically log all inserts/updates/deletes on financial tables.
- [x] **Zod validation in edge functions** — standardized request validation via `_shared/validate.ts`.
- [x] **Middleware auth scoped to protected routes** — `apps/web/middleware.ts` optimized to prevent auth amplification.

### Hardening Applied (P2-D complete)

- [x] **MIME type whitelist** — whitelists PDF/JPG/PNG/WEBP.
- [x] **10MB hard cap** — checks `file_size` before processing (enforced at Python API).
- [x] **Password Support** — added `x-document-password` header and `pdf.ts` client detection.
- [x] **Magic Bytes validation** — `@stashflow/document-parser` verifies binary file signatures before processing.

### Remaining Gaps

- **No malware scanning** — files parsed directly; no pre-processing antivirus step.
- [x] **Async job queue** — integrated Redis (RQ) to move heavy processing out of the edge function request-response cycle.

---

## Python Intelligence Layer Security

The Python backend (`apps/backend-py`) is an isolated, internal microservice responsible for probabilistic workflows.

### Isolation & Sandboxing

- **Network Isolation**: Not accessible from the public internet. Only accessible via Supabase Edge Function gateways.
- **No Persistence**: The service is entirely stateless and does not possess Supabase database credentials.
- **Non-Privileged User**: The Docker container runs as a non-privileged `appuser` to prevent container escape and root access.

### Resource Protection

- **Payload Limit**: Enforces a strict 10MB limit on incoming files to prevent memory exhaustion.
- **Page Limit**: Enforces a 20-page safety limit on PDFs to prevent DoS via complex PDF rendering.
- **Timeouts**: Enforces internal processing timeouts to prevent hangs.

### Application Security

- **Mandatory Headers**: Middleware injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `HSTS`.
- **Traceability**: All requests require a `X-Correlation-ID`, allowing end-to-end auditability from the user action to the AI extraction.
- **Low Confidence Alerts**: Automated logging for AI extraction results with < 40% confidence, enabling manual audit.

---

## Audit Logging

### Current State

`system_audit_logs` table exists. Rows are append-only (no `UPDATE` / `DELETE` RLS). Document parse pipeline writes to it on completion.

**Gaps (P1-B):** Financial mutations (`incomes`, `expenses`, `loans`) are not yet logged. Any `INSERT`, `UPDATE`, or `DELETE` on these tables should create an immutable audit log entry.

### Design Principles

- **Append-only** — no update or delete policies on `system_audit_logs`
- **No PII in metadata** — log entity IDs and event types only; no names, amounts, or notes
- **Sanitized** — strip all free-text fields before logging
- **Via service role** — direct user `INSERT` to audit logs is not permitted

### Target Event Types

```
auth.login, auth.logout, auth.mfa_enrolled, auth.password_changed
loan.created, loan.updated, loan.deleted
income.created, income.updated, income.deleted
expense.created, expense.updated, expense.deleted
document.uploaded, document.parsed, document.failed
account.deleted
```

---

## Incident Response

Full incident response plan: `docs/SIRP.md`.

### Severity Classification

| Severity | Examples |
|----------|---------|
| P0 — Critical | Auth bypass, cross-user data access, service role key exposure |
| P1 — High | Financial data corruption, token leakage, RLS policy gap |
| P2 — Medium | AI pipeline failure, exchange rate staleness, storage access issue |
| P3 — Low | Non-financial UI errors, minor data inconsistencies |

### Immediate Response (P0)

1. Rotate the compromised credential immediately (Supabase service role key, API keys)
2. Disable the affected endpoint or function
3. Assess blast radius — how many users, what data
4. Notify affected users if PII or financial data was exposed
5. Post-mortem within 48h

### Vulnerability Disclosure

Report security vulnerabilities to `jessengolab.dev@gmail.com`. Do not open public GitHub issues. Response within 48h. CVD policy: coordinated disclosure — reporter waits for patch before public disclosure.

---

## Dependency Security

### Current State

- `pnpm audit` is the baseline CVE scanner
- Dependencies listed in `pnpm-lock.yaml` — deterministic installs
- `@stashflow/core` has zero runtime dependencies — eliminates transitive vulnerability surface for financial math

### Target (P3-B)

- `pnpm audit` in GitHub Actions CI on every PR
- Secret scanning via Gitleaks or TruffleHog on every push
- Automated RLS policy tests in CI (verify policies reject unauthorized cross-user reads/writes)
- Dependabot or Renovate for automated dependency updates

---

## Security Checklist

### Implemented

- [x] RLS on all user-owned tables
- [x] JWT in httpOnly cookies (web) — never localStorage
- [x] expo-secure-store for mobile tokens
- [x] PKCE OAuth flow — no implicit flow
- [x] TOTP MFA via Supabase Auth
- [x] Service role key never exposed to browser
- [x] IDOR validation in delete-account edge function
- [x] Webhook secret validation on pg_net-triggered functions
- [x] Cron secret validation on cron functions
- [x] `system_audit_logs` table (append-only)
- [x] Storage isolation per user (`{user_id}/` path prefix)
- [x] `ON DELETE CASCADE` cascades data deletion when user is deleted (GDPR right to erasure)

### Planned / In Progress

- [x] Explicit per-operation RLS policies — migration `20260510000001_explicit_rls_policies.sql`
- [x] Immutable audit logs for financial mutations — triggers `trg_audit_incomes/expenses/loans` in migration `20260510000002`
- [x] Zod validation in edge functions — `_shared/validate.ts` pattern + applied to `delete-account`
- [x] Middleware auth scoped to protected routes — `apps/web/middleware.ts`
- [x] MIME type whitelist + 10MB file size limit — `parse-document`
- [x] Magic bytes validation on document uploads — `@stashflow/document-parser`
- [x] `pnpm audit --audit-level=high` in CI — `security` job in `.github/workflows/ci.yml`
- [x] Secret scanning in CI — Gitleaks v8.27.2 in `security` job
- [x] Session visibility dashboard + revoke all — **P3-A**
- [x] Login anomaly detection — **P3-A**
- [x] Ledger Integrity HMAC-SHA256 signatures — **P3-C**
