# 💰 StashFlow

> A personal finance tracker for managing spending, debt-to-income ratio, loan installments, and multi-currency support — available on Web, iOS, and Android.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Expo%20%7C%20Supabase-blue)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20iOS%20%7C%20Android-lightgrey)

---

## 📌 Overview

StashFlow helps users take control of their finances by providing:

- **Spending Tracker** — log and categorize daily expenses
- **Income Logger** — track one-time and recurring income sources
- **Loan Manager** — add loans with full installment schedules auto-generated (amount, duration, start/end dates)
- **DTI Ratio** — real-time debt-to-income ratio with health indicators and recommendations
- **Multi-Currency Support** — live exchange rates via Frankfurter API, convert across currencies seamlessly
- **Dashboard** — unified financial overview with cash flow charts, upcoming bills, and recent transactions
- **Dark / Light Mode** — full theme toggle across all screens

---

## 🏗️ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Web App | Next.js 15 (App Router) | Deployed on Vercel |
| Mobile App | React Native + Expo | iOS & Android via Expo EAS |
| Backend / DB | Supabase | Auth, PostgreSQL, Edge Functions, RLS |
| Shared Logic | Turborepo Monorepo | Shared hooks, utils, types |
| Currency Rates | Frankfurter API | Free, open-source, cached daily |
| Analytics | PostHog | Event tracking and funnels |
| UI Library (Web) | DaisyUI + Tailwind CSS v3 | |
| UI Library (Mobile) | Custom + React Native Paper | |

---

## 🏗️ System Architecture Overview

StashFlow utilizes a modern, serverless architecture designed for maximum code reuse across web and mobile platforms, backed by a secure and scalable PostgreSQL database.

```text
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                     │
│                                                     │
│   ┌──────────────┐         ┌──────────────────┐     │
│   │  Next.js 15  │         │  Expo SDK 54     │     │
│   │  (Web App)   │         │  (iOS + Android) │     │
│   └──────┬───────┘         └────────┬─────────┘     │
│          │                          │               │
│          └──────────┬───────────────┘               │
│                     │  Shared via Turborepo         │
│              @stashflow/core  (hooks, utils, types)  │
│              @stashflow/ui    (components)           │
│              @stashflow/api   (Supabase queries)     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WebSocket (Realtime)
┌─────────────────────▼───────────────────────────────┐
│                  BACKEND LAYER (Supabase)           │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│   │   Auth   │  │Postgres  │  │ Row Level Sec.  │   │
│   └──────────┘  └──────────┘  └─────────────────┘   │
│                                                     │
│   Edge Functions (Deno):                            │
│   • generate-loan-schedule                          │
│   • calculate-dti                                   │
│   • sync-exchange-rates (cron daily)                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               EXTERNAL SERVICES                     │
│  Frankfurter API │  PostHog Analytics │  Vercel     │
└─────────────────────────────────────────────────────┘
```

## 📁 Repository Structure

We use Turborepo to manage our codebase. This allows us to orchestrate builds, cache outputs, and share code seamlessly between the Web and Mobile apps.

```
stashflow/
├── apps/
│   ├── web/                      # Next.js 14 web application
│   │   ├── app/
│   │   │   ├── (auth)/           # Login, signup, reset password
│   │   │   └── (dashboard)/      # Protected app routes
│   │   │       ├── page.tsx      # Dashboard
│   │   │       ├── spending/
│   │   │       ├── income/
│   │   │       ├── loans/
│   │   │       ├── dti/
│   │   │       └── currencies/
│   │   └── middleware.ts         # Auth route guard
│   │
│   └── mobile/                   # Expo React Native app
│       ├── app/
│       │   ├── (auth)/           # Auth screens
│       │   └── (tabs)/           # Bottom tab navigation
│       │       ├── index.tsx     # Dashboard
│       │       ├── spending.tsx
│       │       ├── loans.tsx
│       │       ├── dti.tsx
│       │       └── currencies.tsx
│       └── app.json
│
└── packages/
    ├── core/                     # Shared business logic
    │   ├── hooks/                # useLoans, useSpending, useDTI, useCurrencies
    │   ├── utils/                # DTI formula, installment generator, currency converter
    │   └── types/                # Shared TypeScript types
    ├── ui/
    │   ├── web/                  # shadcn-based web components
    │   └── native/               # React Native equivalents
    └── api/                      # Supabase client + all query functions
        ├── client.ts
        ├── loans.ts
        ├── spending.ts
        ├── income.ts
        └── currencies.ts
```

---

## 🗄️ Database Schema

```sql
-- All tables enforce Row Level Security (RLS)
-- Users can only access their own data

users
  id · email · full_name · preferred_currency · created_at

incomes
  id · user_id · amount · currency · source
  frequency (one-time | monthly | weekly) · date · notes

expenses
  id · user_id · amount · currency · category
  description · date · is_recurring · notes

loans
  id · user_id · name · principal · currency
  interest_rate · duration_months · start_date
  end_date · installment_amount · status

loan_payments
  id · loan_id · user_id · amount_paid
  due_date · paid_date · status (paid | pending | overdue)

exchange_rates              -- cached, refreshed daily
  id · base · target · rate · fetched_at
```

---

## ⚡ Edge Functions

| Function | Trigger | Responsibility |
|---|---|---|
| `generate-loan-schedule` | `POST /api/loans` | Amortization calc, inserts all payment rows |
| `calculate-dti` | `GET /api/dti`, Dashboard load | Queries income + loans, returns ratio + tip |
| `sync-exchange-rates` | Daily cron + cache miss | Fetches Frankfurter API, updates exchange table |

---

## 🔐 Auth Flow

```
Sign Up → Email Verification → Profile Created → JWT Issued
       → Web: stored in httpOnly cookie
       → Mobile: stored in Expo SecureStore
       → All requests carry JWT → Supabase RLS enforces data access
```

---

## 🌿 Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only |
| `develop` | Integration branch for active development |
| `poc/initial-planning` | ⚠️ POC — UI prototype, API design, architecture docs (not for production) |
| `feature/*` | Individual feature branches off `develop` |
| `fix/*` | Bug fixes |
| `release/*` | Release candidates before merging to `main` |

> ⚠️ The `poc/initial-planning` branch contains early planning artefacts: the interactive UI prototype, API design definitions, and architecture documentation. This is **not production code** and will not be merged into `main`.

---

## 🚀 Roadmap

### Phase 1 — MVP (Current)
- [x] Architecture design
- [x] API design
- [x] UI/UX prototype
- [ ] Monorepo scaffold (Turborepo + Next.js + Expo)
- [ ] Supabase schema + RLS policies
- [ ] Auth flow (web + mobile)
- [ ] Dashboard
- [ ] Income & expense logging
- [ ] Loan manager with installment schedule
- [ ] DTI ratio calculator
- [ ] Multi-currency support

### Phase 2 — Growth
- [ ] Push notifications (upcoming payments, overdue alerts)
- [ ] Charts & spending trends
- [ ] CSV export
- [ ] Budget limits per category
- [ ] App Store + Google Play submission

### Phase 3 — Scale
- [ ] Bank account linking (Plaid / Mono)
- [ ] Premium subscription (RevenueCat)
- [ ] Family / multi-account support
- [ ] Upgrade Supabase to Pro at 50k+ MAUs

---

## 📈 Scale Plan

| Users | Infrastructure | Est. Cost |
|---|---|---|
| 0 – 10k | Supabase Free + Vercel Free + Expo Free | $0/mo |
| 10k – 50k | Same — monitor usage | $0/mo |
| 50k+ | Supabase Pro | $25/mo |
| 100k+ | Add Upstash Redis cache | +$10/mo |
| 500k+ | Supabase dedicated + CDN | ~$300/mo |

---

## 📱 Distribution

| Stage | Channel | Cost |
|---|---|---|
| Development | Expo Go (QR scan) | Free |
| Beta | TestFlight (iOS) + Play Internal Track (Android) | Free |
| Public Launch | App Store + Google Play | $99/yr + $25 one-time |

---

## 🛠️ Getting Started

> Prerequisites: Node.js 18+, pnpm, Expo CLI, Supabase account

```bash
# Clone the repo
git clone https://github.com/your-username/stashflow.git
cd stashflow

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# Add your Supabase keys to both .env files
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Run web app
pnpm --filter web dev

# Run mobile app
pnpm --filter mobile start
```

---

## 📱 Mobile Local Development

When developing the mobile app locally with a self-hosted or local Supabase instance, you must configure `apps/mobile/.env` correctly to allow the emulator/simulator to reach your host machine.

### Supabase URL Configuration
- **iOS Simulator:** Can use `http://127.0.0.1:54321`.
- **Android Emulator:** Must use `http://10.0.2.2:54321` (a special alias to your host's loopback).
- **Physical Devices:** Must use your machine's **Local Network IP** (e.g., `http://192.168.1.185:54321`).

**Recommended:** Use your Local Network IP for all mobile development to ensure compatibility across all devices and emulators.

#### How to find your Local IP (macOS):
```bash
# Run this in your terminal
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Look for the `inet` value starting with `192.168.x.x` or `10.x.x.x`. Update your `apps/mobile/.env` with this value.

---

## 🤝 Contributing

This project is currently in private development. Branch and PR guidelines:

1. Branch off `develop` — never commit directly to `main`
2. Name branches: `feature/loan-scheduler`, `fix/dti-calculation`
3. PRs require at least one review before merge
4. All PRs must pass lint and type checks

---

## 🚀 Quick Start: Automated Setup

To guarantee a frictionless onboarding experience, StashFlow includes an automated bootstrap script (`setup.sh`). This script handles the entire monorepo initialization process.

### What the Script Does:
1. Validates your **Node.js** installation.
2. Checks for **pnpm** and installs the standalone binary if it is missing.
3. Initializes the **Turborepo** workspace.
4. Scaffolds the **Next.js 15** web app and **Expo SDK 54** mobile app.
5. Generates the shared `@stashflow` internal packages (`core`, `ui`, `api`).
6. Installs and links all workspace dependencies.

### Installation Steps

**1. Verify Node.js**
Ensure you have Node.js v22.x LTS installed:
```bash
node -v
```
**2. Execute the Setup Script**
Run the automated bootstrap from the root directory:
```bash
chmod +x setup.sh
./setup.sh
```
**3. Refresh Your Environment**
Note: If the script had to install pnpm for you, you must refresh your terminal before proceeding.
```bash
source ~/.zshrc  # macOS/Linux Zsh users
# OR
source ~/.bash_profile  # Bash users
```
**4. Start the Development Servers**
Spin up both the web and mobile applications simultaneously:
```bash
pnpm dev
```