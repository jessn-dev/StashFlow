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

---

## Authorization

### Row Level Security Strategy

Every user-owned table has RLS enabled. All PostgREST queries execute as the authenticated user — no query bypasses RLS.

**Current state:** Tables have `FOR ALL` RLS policies that grant broad read/write access to the row owner.

**Target state (P1-B):** Refactor all `FOR ALL` policies to explicit per-operation policies with strict `WITH CHECK` clauses:

```sql
-- Pattern for each table:
CREATE POLICY "users_select_own" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON table_name
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

**`system_audit_logs`:** Append-only by design. Users have `SELECT` only. `INSERT` only via service role (no user-initiated writes). No `UPDATE` or `DELETE` policy exists.

### IDOR Prevention

The `delete-account` edge function (and all admin operations) validate that `body.userId` matches the authenticated user's JWT subject before executing service-role operations:

```typescript
const { data: { user } } = await userClient.auth.getUser()
if (body.userId !== user.id) return errorResponse('Forbidden', 403)
await adminClient.auth.admin.deleteUser(user.id)
```

---

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

### Known Gaps (P2-D)

- **No MIME type validation** — only filename extension checked. A `.pdf` with a malicious payload could be uploaded.
- **No file size limit** — large PDFs can time out the edge function (Deno 30s limit).
- **No malware scanning** — files are parsed directly; no pre-processing antivirus step.
- **No async job queue** — synchronous processing; edge function timeout on large files.

**Target (P2-D):** MIME gate (validate `Content-Type` + magic bytes), 5MB hard cap, queue-backed async processing.

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
- [ ] MIME validation + file size limit on document uploads — **P2-D**
- [ ] `pnpm audit` in CI — **P3-B**
- [ ] Secret scanning in CI — **P3-B**
- [ ] Session visibility dashboard + revoke all — **P3-A**
- [ ] Login anomaly detection — **P3-A**
