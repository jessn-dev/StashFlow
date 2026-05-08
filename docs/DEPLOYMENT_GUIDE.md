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

### Supabase (Production)
1.  **Create Project:** Create a new project. Select region closest to your users.
2.  **Enable pg_net:** Go to **Database -> Extensions** and enable `pg_net`.
3.  **Apply Migrations:** Run `supabase db push` from your local CLI after linking.
4.  **Configure Auth:**
    *   **External Providers:** Enable Google. Paste Client ID and Secret.
    *   **Redirect URI:** Ensure `https://<project-ref>.supabase.co/auth/v1/callback` is authorized in Google Cloud Console.
5.  **Post-Deploy Wiring:** Run `supabase/snippets/production_wiring.sql` in the SQL Editor to activate the production document parser.

### Vercel (Production)
1.  **Import Project:** Import the monorepo.
2.  **Root Directory:** Set to `apps/web`.
3.  **Build Settings:** 
    *   Framework: Next.js
    *   Build Command: `cd ../.. && pnpm build` (Vercel automatically handles monorepo roots if configured correctly).
4.  **Environment Variables:** Add all variables from the "Application Contexts" table above.
5.  **Custom Domain:** Add your production domain in Settings -> Domains.

### GitHub Actions (CI/CD)
The pipeline is defined in `.github/workflows/ci.yml`. To enable automated deployment:

1.  **Repository Secrets:** Go to **Settings -> Secrets and variables -> Actions** and add:
    *   `VERCEL_TOKEN`: Your Vercel Personal Access Token.
    *   `VERCEL_ORG_ID`: Your Vercel Team ID.
    *   `VERCEL_PROJECT_ID`: The Project ID from Vercel settings.
    *   `NEXT_PUBLIC_SUPABASE_URL`: (Used for E2E tests).
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Used for E2E tests).
2.  **Enable Deploy Job:** In `ci.yml`, uncomment the actual Vercel CLI commands in the `deploy` job.

---

## 3. Infrastructure Troubleshooting

### JavaScript Heap Out of Memory
Large builds with Turbopack or complex TypeScript types can exceed Node's default memory limit.

**Fix:** The project has been configured to use 8GB of heap space across all core scripts via `NODE_OPTIONS='--max-old-space-size=8192'`.

If you still encounter this error in local development:
1.  **Clear Caches:** Run `rm -rf .next .turbo node_modules` and `pnpm install`.
2.  **Global Export:** Run `export NODE_OPTIONS='--max-old-space-size=8192'` in your terminal before starting the dev server.
