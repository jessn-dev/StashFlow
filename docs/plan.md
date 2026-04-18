# StashFlow — Master Development Plan

> Last updated: 2026-04-16
> Active Branch: `feature/m12-loan-engine`
> Status: Milestone 12 — Global Loan Engine (Web + OCR)

---

## Milestone Map

```
M0  — Requirements & Planning              ✅ Complete
M1  — Monorepo Scaffold                    ✅ Complete
M2  — Supabase Schema + RLS               ✅ Complete
M3  — Auth Flow (Web + Mobile)             ✅ Complete
M4a — Core Logic, API Layer & Seed Data    ✅ Complete
M4b — Live Dashboards (Web & Mobile)       ✅ Complete
M5  — Spending Module (Web)                     ✅ Complete
M6  — Income Module (Web)                       ✅ Complete
M7  — Loans Module + Scheduler (Web)             ✅ Complete
M8  — DTI Module (Web + Simulator)               ✅ Complete
M9  — Currencies Module (Web + Sync)             ✅ Complete
M10 — Advanced Budgeting & Cash Flow (Web)       ✅ Complete
M11 — Edge Functions (Aggregation & Sync)        ✅ Complete
M12 — Global Loan Engine (Web + OCR)             ⏳ Pending
M13 — Mobile App (all screens)                   ⏳ Pending
M14 — Testing Suite (full coverage)              ⏳ Pending
M15 — CI/CD + Deployment                         ⏳ Pending
```

---

## Milestone 10 — Advanced Budgeting & Cash Flow
**Status: ✅ Complete**

### Objective
Provide users with proactive financial planning tools, including historically suggested budgets, cumulative month-to-month rollovers, flexible rebalancing, 12-month cash flow projections, and integrated goal tracking.

### Delivered
- **Rollover Snapshot Logic**: Implemented `budget_periods` table to track cumulative over/under spending month-over-month.
- **Cash Flow Projections**: Created `get-cash-flow` Edge Function providing 12-month visual outlooks based on recurring data.
- **Integrated Goals**: Built a dedicated Goals module where savings/debt targets are treated as primary budget line items.
- **UX Refinements**: Added 10-item pagination to all dashboard tables and optimized form layouts.

---

## Milestone 12 — Global Loan Engine (Web + OCR)
**Status: ⏳ Pending**

### Objective
Implement a multi-regional loan management system capable of handling complex amortization logic, processing loan documents via OCR/NLP, and managing lifecycle events.

### Requirements Addressed
- Technical Specification: `Global_Loan_Management_Specification.pdf`

### Execution Plan
1. **Database Expansion**: Update `loans` table with interest types (Add-on, Fixed Principal, Interest-Only), day count conventions (30/360, Actual/365), and regional metadata.
2. **Core Engine**: Refactor `@stashflow/core` amortization logic to support the new interest models and calendar rules.
3. **Document Intelligence**: Implement `extract-loan-data` Edge Function for contract parsing.
4. **Lifecycle Events**: Implement dynamic recalculations for pre-payments and broken period interest.

---

## Milestone 13 — Mobile App (Expo) Parity
**Status: ⏳ Pending**

### Objective
Bring the iOS/Android application to full parity with the web experience, utilizing shared logic from `@stashflow/core` and `@stashflow/api`.

---

## Milestone 14 — Testing Suite (full coverage)
**Status: ⏳ Pending (Tech Debt)**

---

## Change Log

| Date | Change | Approved By |
|---|---|---|
| 2026-04-01 | Initial plan created, M0 complete | — |
| 2026-04-14 | M4b complete, Web upgraded to Next.js 16, M5-M7 complete | — |
| 2026-04-16 | Completed M10 (Advanced Budgeting) and defined M12 (Global Loan Engine) | — |
