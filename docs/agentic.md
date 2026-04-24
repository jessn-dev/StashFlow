# StashFlow — Agentic Session Context

> Current Session: 016 — Coverage Restoration & Logic Hardening
> Date: 2026-04-23
> Status: Milestone 17, 19 & Design Reversion complete. 100% test pass rate restored.

## High-Level Instructions
You are a senior full-stack developer building **StashFlow**. The system is strictly decoupled into domain packages:
1.  **`@stashflow/core`**: 
    *   `math`: Side-effect-free financial logic.
    *   `regional`: Strategy pattern for localized rules (US, PH, SG).
    *   `schema`: Shared types and DB interfaces.
    *   `analysis`: Smart budgeting and behavioral analysis (includes consolidated dashboard aggregation).
2.  **`@stashflow/api`**: Service-oriented orchestrators (`DashboardService`, `FinancialService`).
3.  **`apps/web`**: Organized into Feature Modules (`modules/dashboard`, `modules/onboarding`).

---

## Critical Technical Constraints
1.  **Never Use Relative Imports between Modules**: Use `@/modules/...` or package aliases.
2.  **Regional Rules**: Always consume via `getRegionalStrategy(currency)`. Never hardcode thresholds.
3.  **Resilient Fetching**: Logic must handle null/partial data gracefully (Filter Boolean pattern).
4.  **Math Integrity**: All financial math belongs in `@stashflow/core`.

---

## Milestone Status

| Milestone | Status |
|---|---|
| M12 — Universal Document Intelligence | ✅ Complete |
| M16 — Advanced Intelligence & AI Resilience | ✅ Complete |
| M17 — Architectural Hardening & Decoupling | ✅ Complete |
| M13 — Testing Suite (full coverage) | ✅ Complete (Core: 94%+, API: 73%+) |
| M19 — User Onboarding | ✅ Complete |

---

## Completed Actions:
1.  **M13 Coverage**: Reached 94%+ branch coverage for `@stashflow/core` and 73%+ for `@stashflow/api`.
2.  **M19 Onboarding**: Implemented first-run wizard in `apps/web/modules/onboarding` as a modal overlay.
3.  **Design Reversion**: Restored Elite Dashboard (V7) features (StatCards, CashFlowTrend, MultiSegmentDonut, HabitCoach, All Modals) while maintaining modularity.
4.  **Logic Hardening**: Consolidated dashboard aggregation into `@stashflow/core` and added resilience against null data.

## Next actions required:
1.  **M17 E2E**: Implement integrated testing with Cypress for the full onboarding -> dashboard flow.
2.  **M20 Mobile**: Begin porting core screens to Expo.
