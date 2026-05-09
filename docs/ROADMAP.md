# StashFlow — Roadmap

> Strategic direction, production-readiness goals, and architectural evolution.
> For a record of what shipped, see `docs/CHANGELOG.md`.
>
> Last updated: 2026-05-08 (Post-Phase 3 Completion)
> Active branch: `develop` — Final Launch Prep in progress

---

## Vision

Build a calm financial command center powered by invisible intelligence and secure financial infrastructure — designed for multi-currency users navigating complex debt structures across the Philippines, United States, and Singapore.

---

## 1. What Is Built

### Core Financial Logic — `packages/core`

| Module | What it does | Status |
|--------|-------------|--------|
| `math/dti` | DTI ratio engine — regional thresholds (PH 40%, US 36%, SG 55%); zero-income handling | ✅ |
| `math/loans` | Amortization engine — Standard Amortized, Add-on, Interest-Only, Fixed Principal | ✅ |
| `math/currency` | `convertToBase`, `formatCurrency` | ✅ |
| `security/ledger` | HMAC-SHA256 integrity signing + verification | ✅ |
| `security/sessionAnomaly` | Geographic shift + unusual hour risk scoring | ✅ |
| `regional` | Strategy pattern — `getRegionByCurrency`, regional DTI/budget rules for PH/US/SG | ✅ |

---

## 2. Completed Milestones ✅

| Phase | Milestone | Description | Date |
|-------|-----------|-------------|------|
| **DevOps** | **Workflow Security** | pnpm lockfile gates (Husky/lint-staged) + setup automation (`db:clean`) | 2026-05-18 |
| P1/P2 | Stability & Scaling | Multi-currency, unified feed, AI parser hardening, architectural consolidation | 2026-05-15 |
| **P3-A** | **Session Intel** | Active session revocation UI + anomaly scoring webhook | 2026-05-08 |
| **P3-B** | **CI/CD Security** | pgTAP RLS tests, CODEOWNERS, automated audit gates | 2026-05-08 |
| **P3-C** | **Ledger Integrity** | Cryptographic ledger signatures + Live Frankfurter FX Feed | 2026-05-08 |

---

## 3. Active — Final Launch Prep

### Legal & Compliance ✅

| Item | Route | Purpose | Status |
|------|-------|---------|--------|
| Privacy Policy | `/privacy` | Disclose AI processing (Groq/Gemini), data retention, RLS isolation | ✅ |
| Terms of Service | `/terms` | Acceptable use, financial advice disclaimer, liability limits | ✅ |
| Cookie Policy | `/cookies` | GDPR/PDPA compliance for session/auth cookies | ✅ |
| Data Deletion | `/data-deletion` | Self-service erasure instructions (GDPR Art. 17) | ✅ |

### Operations & Deployment ✅

**Goal:** Establish a secure, repeatable three-tier environment strategy (Local, Test, Prod).

| Item | Task | Notes | Status |
|------|------|-------|--------|
| Environments | 3-Tier Setup | Local (Dev), Test (MVP Launch), and Prod (Post-MVP) | ✅ |
| CI/CD | Branch Targeting | `develop` targets Test; `main` targets Prod | ✅ |
| Security | Vulnerability Fixes | High-severity CVEs resolved via pnpm audit fix | ✅ |
| Documentation | Setup Guide | `docs/DEPLOYMENT_GUIDE.md` updated with multi-env guide | ✅ |

---

## 4. Backlog — Post-MVP

| # | Feature | Route | Prerequisite |
|---|---------|-------|-------------|
| 1 | Bank Feed Integration | `/dashboard/bank/connect` | Legal Entity + Regional Compliance |
| 2 | Mobile App (Expo) | `apps/mobile/` | MVP Web Stable |
| 3 | Advanced Goal Automations | `/dashboard/plans` | Multi-currency Goal Logic |
| 4 | P3-D Observability | Transaction spike alerts | Bank feed volume |
