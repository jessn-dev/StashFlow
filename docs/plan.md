# StashFlow — Master Development Plan

> Last updated: 2026-04-20
> Active Branch: `agenthelper`
> Status: Milestone 17 — Advanced Intelligence & AI Resilience (Harden Architecture ✅)

---

## Milestone Map

```
M0  — Requirements & Planning              ✅ Complete
M1  — Monorepo Scaffold                     ✅ Complete
M2  — Supabase Schema + RLS                 ✅ Complete
M3  — Auth Flow (Web)                       ✅ Complete
M4a — Core Logic, API Layer & Seed Data     ✅ Complete
M4b — Live Dashboards (Web)                  ✅ Complete
M12 — Universal Document Intelligence        ✅ Complete
M16 — Advanced Intelligence & AI Resilience  ✅ Complete
M17 — Architectural Hardening & Decoupling   ✅ Complete
M13 — Testing Suite (full coverage)           ⏳ In Progress (95% Core ✅)
M14 — CI/CD + Deployment                      ⏳ Pending
M15 — Privacy by Design & Transparency        ⏳ Pending
M18 — Universal Statement Importer            ⏳ Pending
M19 — User Onboarding & Interactive Tutorials ⏳ In Progress
M20 — Mobile App (Expo Parity)                ⏳ Pending (Future)
```

---

## Milestone 17 — Architectural Hardening & Decoupling
**Status: ✅ Complete**

### Objective
Transition from a monolithic "fat" utility structure to a modular, domain-driven framework that eliminates coupling and logic duplication.

### Execution Results
1.  **Domain-Driven Core**: Refactored `@stashflow/core` into `math`, `regional`, `schema`, and `analysis` sub-packages.
2.  **Service-Oriented API**: Established `DashboardService` and `FinancialService` to orchestrate data and delegate logic.
3.  **Regional Strategy Pattern**: Replaced complex conditional logic with standalone strategy adapters (US, PH, SG).
4.  **Resilient Fetching**: Implemented a "Partial Success" model in dashboard fetching to ensure uptime during non-critical failures.
5.  **Clean Imports**: Unified backend imports via global `import_map.json`, treating internal code as first-class packages.

---

## Change Log (Recent)
| Date | Event / Update | Notes |
|---|---|---|
| 2026-04-20 | Implemented Universal Document Intelligence (M12) and AI Resilience + Caching (M16) | Support for Payslips, COE, Bills added. |
| 2026-04-20 | **Architectural Hardening (M17)** | Complete decoupling of core math, regional rules, and frontend features. |
| 2026-04-23 | Finished Coverage | Reached 94%+ branch coverage for @stashflow/core. |
| 2026-04-23 | User Onboarding | Implemented M19 first-run wizard in apps/web. |
