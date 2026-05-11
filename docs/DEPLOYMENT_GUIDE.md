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

## 2. Infrastructure as Code (Terraform)

StashFlow uses a modular Terraform architecture to automate the provisioning of cloud resources (Supabase, Vercel, and Upstash) and keep them synchronized across environments.

### **Architecture**
The infrastructure is organized into reusable modules:
*   `infra/terraform/modules/supabase`: Manages the database, Auth (Google OAuth), and Storage buckets.
*   `infra/terraform/modules/vercel`: Manages the Next.js project and environment variable syncing.
*   `infra/terraform/modules/upstash`: Provisions the serverless Redis database for the async queue.

### **Deployment Pipeline Integration**
Terraform is integrated directly into the GitHub Actions pipeline (`.github/workflows/deploy-test.yml`). Every push to the target branch automatically triggers a `terraform apply` before application code is deployed, ensuring the infrastructure state is always correct.

### **Manual Execution (Local)**
If you need to run Terraform locally:
1.  **Install Terraform**: Ensure you have Terraform installed (`brew install terraform`).
2.  **Navigate to Environment**:
    ```bash
    cd infra/terraform/environments/test
    ```
3.  **Deploy**:
    ```bash
    terraform init
    terraform plan
    terraform apply
    ```

---

## 3. Platform Setup Guides (Manual Fallback)

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

#### **Required Repository Secrets**
Add these in **GitHub > Settings > Secrets and variables > Actions**:

| Secret Name | Description | Source |
| :--- | :--- | :--- |
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token for CLI auth. | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) |
| `VERCEL_TOKEN` | Master API token for Vercel. | [Vercel Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your Vercel Team/Org ID. | Vercel Project Settings |
| `VERCEL_PROJECT_ID_TEST` | Project ID for the **Test** project. | Vercel Project Settings |
| `SUPABASE_PROJECT_REF_TEST` | The 20-char Ref for **Test** project. | Supabase Project Settings |
| `SUPABASE_DB_PASSWORD_TEST` | Database password for **Test** project. | Your chosen password |
| `GOOGLE_CLIENT_ID` | OAuth Client ID. | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret. | Google Cloud Console |

1.  **Branch Targeting:** 
    *   Pushes to `develop` trigger a deployment to the **Test** environment.
    *   Pushes to `main` trigger a deployment to the **Production** environment.

---

## 4. Monorepo Edge Function Strategy

Supabase Edge Functions are deployed in an isolated Docker container. To allow these functions to use shared code from `packages/core` in a monorepo, we use a **Local Proxy Strategy**.

### **How it works**
1.  **Shared Path**: All functions import from `@stashflow/core`, which is mapped to `./_shared/core/src/index.ts` in `supabase/functions/deno.json`.
2.  **Local Dev**: A symlink connects `supabase/functions/_shared/core` to the real `packages/core` for real-time updates.
3.  **CI/CD**: The GitHub Actions pipeline (`deploy-test.yml`) automatically **copies** the `packages/core` folder into the `supabase/` directory before deployment. This allows the Supabase bundler to see the code while maintaining strict container isolation.

### **Manual Deployment (Emergency)**
If you ever need to deploy functions manually from your Mac:
```bash
mkdir -p supabase/functions/_shared
cp -R packages/core supabase/functions/_shared/core
supabase functions deploy --project-ref <REF>
```

---

## 5. Infrastructure Troubleshooting

### JavaScript Heap Out of Memory
Large builds with Turbopack or complex TypeScript types can exceed Node's default memory limit.

**Fix:** The project has been configured to use 8GB of heap space across all core scripts via `NODE_OPTIONS='--max-old-space-size=8192'`.

If you still encounter this error in local development:
1.  **Clear Caches:** Run `rm -rf .next .turbo node_modules` and `pnpm install`.
2.  **Global Export:** Run `export NODE_OPTIONS='--max-old-space-size=8192'` in your terminal before starting the dev server.
