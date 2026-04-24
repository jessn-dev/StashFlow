# StashFlow — Security Protocol & Ledger

> Last updated: 2026-04-01
> Status: Active — Integrated into Development Lifecycle

## 🛡️ Core Security Principles

StashFlow handles sensitive financial data. Our security posture relies heavily on the Supabase architecture, meaning security must be enforced at the database and edge computing layers, never just on the client.

1. **Zero-Trust Client:** The frontend (Web and future Mobile) is inherently untrusted. It cannot dictate *whose* data it is operating on.
2. **Row Level Security (RLS) is Mandatory:** No table is ever created without an active RLS policy.
3. **Principle of Least Privilege at the Edge:** Edge functions must execute with the permissions of the invoking user, not as a system admin, unless specifically designed for a backend-only cron job.

---

## 🚨 Active Remediation Plan (Phase 1)

These vulnerabilities were identified during the M0 Planning Phase and must be resolved before their respective milestones are considered complete.

### 1. IDOR (Insecure Direct Object Reference) Prevention
* **Risk:** Malicious users swapping `userId` payloads to view/edit other users' financial data.
* **Resolution:** * Strip all `userId` parameters from `@stashflow/api` payload definitions.
  * The Supabase client automatically attaches the user's JWT.
  * Database RLS policies strictly enforce `user_id = auth.uid()` for all CRUD operations.
* **Status:** ⏳ Pending Implementation (Target: M2 & M5)

### 2. Edge Function Privilege Escalation
* **Risk:** User-invoked Edge Functions (`generate-loan-schedule`, `calculate-dti`) bypassing RLS by using the `SERVICE_ROLE_KEY`.
* **Resolution:** * Explicitly forbid the use of `SUPABASE_SERVICE_ROLE_KEY` in user-facing Edge Functions.
  * Initialize the Supabase client inside Deno using the `Authorization: Bearer <token>` header passed from the frontend.
* **Status:** ⏳ Pending Implementation (Target: M13)

### 3. Unvalidated Cron Abuse
* **Risk:** Publicly accessible `sync-exchange-rates` endpoint being spammed, exhausting the free Frankfurter API tier.
* **Resolution:** * Generate a `CRON_SECRET` stored in Supabase Edge Secrets.
  * The function must reject any request lacking `Authorization: Bearer <CRON_SECRET>` with a `403 Forbidden`.
  * Configure `pg_cron` to include this header in its automated HTTP call.
* **Status:** ⏳ Pending Implementation (Target: M13)

---

## ✅ Pre-Commit Security Checklist

Before finalizing any feature or milestone, the following checks must be verified:

- [ ] **Database:** Does the new table have RLS enabled?
- [ ] **Database:** Do the RLS policies strictly map to `auth.uid()`?
- [ ] **API:** Does the payload rely on the auth token for identity rather than a passed ID parameter?
- [ ] **Edge Functions:** Is the client initialized with the user's Auth Header instead of the Service Role key (unless explicitly required for a system task)?
- [ ] **Dependencies:** Have we verified that newly added packages do not have known high-severity CVEs?

---

# StashFlow — Security Protocol & Ledger

## 🚨 Active Remediation Progress
### 1. IDOR Prevention
* **Status:** ✅ Integrated. RLS policies are active on 5 core tables. Web Auth now uses `getUser()` server-side to prevent IDOR via JWT.

### 2. Auth Token Exposure 
* **Risk:** Storing JWTs in `localStorage` on Web makes them vulnerable to XSS.
* **Resolution:** Implemented `@supabase/ssr` to store tokens in `httpOnly` cookies. Tokens are inaccessible to client-side JS.
* **Status:** ✅ Complete (Web) / ⏳ Pending (Future Mobile via SecureStore).

## 📝 Incident & Update Log

| Date | Event / Update | Notes |
|---|---|---|
| 2026-04-01 | Document created | Identified IDOR, Privilege Escalation, and Cron vulnerabilities during M0 architecture review. |