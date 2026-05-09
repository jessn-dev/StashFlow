# StashFlow — Production Deployment Guide

> Centralized reference for environment variables, secrets management, and platform configuration.

---

## 1. Environment Variables Reference

### Application Contexts

| Variable | Scope | Purpose | Source |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Web (Client/Server) | Production API endpoint for Supabase. | Supabase Dashboard -> Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web (Client/Server) | Client-side safe key for RLS-protected queries. | Supabase Dashboard -> Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Web (Server Only) | Admin key for bypass-RLS operations (e.g. initial profile creation). | Supabase Dashboard -> Settings -> API |
| `GOOGLE_CLIENT_ID` | Auth (Web/Mobile) | OAuth 2.0 Client ID for Google login. | Google Cloud Console -> APIs & Services |
| `GOOGLE_CLIENT_SECRET` | Auth (Web/Server) | OAuth 2.0 Client Secret. | Google Cloud Console -> APIs & Services |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_REDIRECT_URI` | Auth (Supabase) | Explicit callback URI for Google OAuth handshake. | `https://<ref>.supabase.co/auth/v1/callback` |

### Edge Function Contexts (`supabase secrets set`)

| Variable | Purpose | Recommended Value |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Primary LLM for document parsing (Llama 3). | Groq Cloud Console |
| `GEMINI_API_KEY` | Primary fallback LLM (Gemini 1.5 Flash). | Google AI Studio |
| `ANTHROPIC_API_KEY` | Secondary fallback LLM (Claude 3 Haiku). | Anthropic Dashboard |
| `CRON_SECRET` | Header validation for scheduled FX sync jobs. | Generate random 32-char string |
| `LEDGER_SECRET` | Key for HMAC-SHA256 transaction signing. | Generate random 32-char string |
| `PARSE_LOAN_WEBHOOK_SECRET` | Key for database trigger authentication. | Generate random 32-char string |

---

## 2. Platform Setup Guides

StashFlow uses a three-tier environment strategy. Daily development happens in **Local (Dev)**. MVP validation occurs in **Test (MVP)**. Full-scale release happens in **Prod (Post-MVP)**.

### Platform Specifics (Apply to both Test and Prod)

#### Supabase
1.  **Create Project:** Create a new project (e.g., `StashFlow-Test` or `StashFlow-Prod`).
2.  **Enable pg_net:** Go to **Database -> Extensions** and enable `pg_net`.
3.  **Apply Migrations:** Run `supabase db push` from your local CLI after linking.
4.  **Configure Auth:**
    *   **External Providers:** Enable Google. Paste Client ID and Secret.
    *   **Redirect URI:** Ensure `https://<project-ref>.supabase.co/auth/v1/callback` is authorized in Google Cloud Console.
5.  **Post-Deploy Wiring:** Run `supabase/snippets/production_wiring.sql` in the SQL Editor to activate the parser.

#### Vercel
1.  **Import Project:** Import the monorepo.
2.  **Root Directory:** Set to `apps/web`.
3.  **Build Settings:** 
    *   Framework: Next.js
    *   Build Command: `cd ../.. && pnpm build`
4.  **Environment Variables:** Add all variables from the "Application Contexts" table above for each specific environment.

### GitHub Actions (CI/CD)
The pipeline is defined in `.github/workflows/ci.yml`. 

1.  **Repository Secrets:** Add secrets for each environment (e.g., `TEST_VERCEL_TOKEN`, `PROD_VERCEL_TOKEN`).
2.  **Branch Targeting:** 
    *   Pushes to `develop` trigger a deployment to the **Test** environment.
    *   Pushes to `main` trigger a deployment to the **Production** environment.

---

## 3. Infrastructure Troubleshooting

### JavaScript Heap Out of Memory
Large builds with Turbopack or complex TypeScript types can exceed Node's default memory limit.

**Fix:** The project has been configured to use 8GB of heap space across all core scripts via `NODE_OPTIONS='--max-old-space-size=8192'`.

If you still encounter this error in local development:
1.  **Clear Caches:** Run `rm -rf .next .turbo node_modules` and `pnpm install`.
2.  **Global Export:** Run `export NODE_OPTIONS='--max-old-space-size=8192'` in your terminal before starting the dev server.
