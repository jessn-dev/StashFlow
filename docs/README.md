# 💰 StashFlow

> A mathematically robust, global-ready personal finance platform for managing spending, debt-to-income ratio, and advanced loan amortization — available on Web, iOS, and Android.

![Status](https://img.shields.io/badge/status-active%20development-green)
![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-Next.js%2015%20%7C%20Expo%2054%20%7C%20Supabase-blue)
![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)

---

## 📌 Overview

StashFlow helps users take absolute control of their finances with pro-grade tools:

- **Advanced Loan Engine** — Support for global models: Add-on Interest (PH/JP), Fixed Principal, and Interest-Only. Standardized on 30/360, Actual/360, and Actual/365 conventions.
- **Market Intelligence** — Real-time macroeconomic insights via FRED® API tracking global inflation and sector trends.
- **Contingency Protocol** — 1-click "Survival Mode" that pauses discretionary goals and forecasts your liquid runway in days.
- **Automated Budgeting** — Event-driven budget snapshots powered by PostgreSQL triggers.
- **DTI Health** — Real-time debt-to-income ratio with regional thresholds (PH, SG, JP, US/EU).
- **AI Document Scanning** — Upload loan contracts to automatically pre-fill schedules and terms.

---

## 🚀 Roadmap

### Phase 1 — MVP (✅ Core Logic Complete)
- [x] Architecture design & API definitions
- [x] Monorepo scaffold (Turborepo + Next.js 15 + Expo 54)
- [x] Supabase schema, RLS policies, and automated triggers
- [x] Auth flow (Email/Password + Google/Apple OAuth)
- [x] Live Dashboards (Real-time sync & revalidation)
- [x] Global Amortization Engine (94%+ test coverage)
- [x] Multi-currency support (Auto-converting Net Worth & Transactions)
- [x] Market Intel & Contingency Protocol

### Phase 2 — Mobile & Refinement (⏳ Active)
- [ ] **Mobile App Parity** — Build dedicated screens for Loans, Spending, and Budgets in Expo.
- [ ] **E2E Testing** — Implement Milestone 18: Integrated Testing with Cypress.
- [ ] **Compliance** — Milestone 16: Draft and integrate Privacy, Terms, and Security whitepapers.
- [ ] **Production Edge Logic** — Move heavy aggregations to secure Deno Edge Functions.

### Phase 3 — Scale & Intelligence (🔮 Future)
- [ ] **ReceiptOps** — Automated invoice auditing and CSV reconciliation.
- [ ] **Bank Linking** — Multi-region account aggregation.
- [ ] **Push Notifications** — Predictive alerts for budget breaches and payments.

---

## 🏗️ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Web App** | Next.js 15 (App Router) | High-contrast UI with Tamagui |
| **Mobile App** | React Native + Expo 54 | Shared logic from core/api packages |
| **Backend** | Supabase | PostgreSQL, Auth, Edge Functions, RLS |
| **Business Logic** | `@stashflow/core` | 94.4% Branch Coverage via Vitest |
| **Data Logic** | `@stashflow/api` | Chainable mocks & 70%+ Integration coverage |
| **Intelligence** | FRED® API | Macroeconomic trend tracking |
| **UI System** | Tamagui | Truly cross-platform component architecture |

---

## 🛠️ Infrastructure & Testing

We maintain high standards for financial data integrity.

*   **Unit Testing**: `pnpm test` — Parameterized testing for amortization and DTI logic.
*   **Coverage**: `pnpm test:coverage` — Powered by Vitest v8.
*   **E2E (Planned)**: Cypress implementation for user journey verification.
*   **Database**: Supabase local development with automated migrations.

---

## 📱 Mobile Local Development

When developing the mobile app locally, use your machine's **Local Network IP** in `apps/mobile/.env` to allow devices/emulators to reach the local Supabase instance.

```bash
# Find your IP (macOS)
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## 🚀 Quick Start

```bash
# Automated monorepo setup
chmod +x setup.sh
./setup.sh init

# Apply database automation
supabase db reset

# Run development environment
pnpm dev
```
