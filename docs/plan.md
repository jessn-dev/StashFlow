# StashFlow — Master Development Plan

> Last updated: 2026-04-17
> Active Branch: `develop`
> Status: Milestone 17 — Advanced Intelligence & Contingency

---

## Milestone Map

```
M0  — Requirements & Planning              ✅ Complete
M1  — Monorepo Scaffold                    ✅ Complete
M2  — Supabase Schema + RLS               ✅ Complete
M3  — Auth Flow (Web + Mobile)             ✅ Complete
M4a — Core Logic, API Layer & Seed Data    ✅ Complete
M4b — Live Dashboards (Web & Mobile)       ✅ Complete (Next.js 16)
M5  — Spending Module (Web)                     ✅ Complete
M6  — Income Module (Web)                       ✅ Complete
M7  — Loans Module + Scheduler (Web)             ✅ Complete
M8  — DTI Module (Web + Simulator)               ✅ Complete
M9  — Currencies Module (Web + Sync)             ✅ Complete
M10 — Advanced Budgeting & Cash Flow (Web)       ✅ Complete
M11 — Edge Functions (Aggregation & Sync)        ✅ Complete (Pending Prod Logic)
M12 — Global Loan Engine (Web + OCR)             ✅ Complete (Core Logic)
M13 — Mobile App (all screens)                   ✅ Complete
M14 — Testing Suite (full coverage)              ⏳ Pending (Core ✅)
M15 — CI/CD + Deployment                         ⏳ Pending
M16 — Privacy by Design & Transparency           ⏳ Pending
M17 — Advanced Intelligence & Contingency        ✅ Complete
M18 — Integrated Testing (Cypress)               ⏳ Pending
M19 — Universal Statement Importer               ⏳ Pending
M20 — User Onboarding & Interactive Tutorials    ⏳ In Progress
```

---

## Milestone 12 — Global Loan Engine (Web + OCR)
**Status: ✅ Complete (Core Logic)**

### Objective
Implement a multi-regional loan management system capable of handling complex amortization logic, processing loan documents via OCR/NLP, and managing lifecycle events.

### Execution Plan
1. **Core Engine**: Refactor `@stashflow/core` amortization logic to support new interest models (Add-on, Fixed Principal, Interest-Only) and day count conventions. (Implemented & Verified 94%+ Coverage)
2. **Dynamic Recalculation**: Implement dynamic recalculations for pre-payments and broken period interest. (Implemented)
3. **Document Intelligence**: Replace the mock `extract-loan-data` Edge Function with a real LLM integration (e.g., Anthropic/OpenAI) for contract parsing. (Web UI integration done, Edge logic pending prod env)

---

## Milestone 13 — Mobile App (Expo) Parity
**Status: ✅ Complete**

### Objective
Bring the iOS/Android application to full feature parity with the web experience, utilizing shared logic from `@stashflow/core` and `@stashflow/api`.

### Execution Plan
1. **Navigation Framework**: Bottom tab navigator implemented.
2. **Loans Module**: Build mobile screens for active loans and detailed repayment schedules. (Implemented)
3. **Spending & Income**: Implement mobile-optimized forms and historical lists. (Implemented)
4. **Goals & Budgets**: Create screens for tracking savings targets and category limits. (Implemented)

---

## Milestone 14 — Testing Suite (full coverage)
**Status: ⏳ Pending (Core Utility Logic: ✅ 94%+ Coverage)**

### Execution Plan
1. Extensive unit tests for the core loan amortization engine, currency conversion, and DTI logic. (Complete: 94.4% Branch Coverage)
2. Integration tests for complex Supabase queries (e.g., `getDashboardPayload`). (Pending)

---

## Milestone 15 — CI/CD + Deployment
**Status: ⏳ Pending (CI Pipeline: ✅ Complete)**

### Execution Plan
1. Setup GitHub Actions for testing, linting, and building web/mobile apps. (Implemented: `ci.yml` runs tests and coverage on PRs)
2. Automate deployment of Supabase Edge Functions. (Pending)

---

## Milestone 16 — Privacy by Design & Transparency
**Status: ⏳ Pending**

### Objective
Provide clear, standard disclosures regarding how user financial data is handled, ensuring trust without requiring bespoke legal contracts.

### Execution Plan
1. **Standard Disclosures**: Adapt an Open Source privacy policy template that explicitly states:
    * All data is stored in the user's private Supabase instance.
    * No data is sold or shared with 3rd party financial aggregators.
    * Use of FRED® and Exchange Rate APIs is read-only and anonymous.
2. **Web Integration**: Implement `/privacy` and `/terms` routes in the Next.js application using static markdown.
3. **Mobile Integration**: Add a "Legal & Privacy" section to the Expo app settings.

---

## Milestone 17 — Advanced Intelligence & Contingency
**Status: ✅ Complete**

### Objective
Leverage external macroeconomic data and internal high-volatility logic to provide proactive financial protection.

### Execution Plan
1. **Market Intelligence**:
    * Integrate FRED API (Federal Reserve Economic Data) to track local inflation and sector trends. (Implemented)
    * Build an analysis engine to cross-reference user spending against sector inflation. (Implemented)
    * **AI Resilience**: Implemented a multi-provider fallback system (Gemini -> Groq/Llama3) in the `macro-financial-advisor` function to ensure 24/7 availability of regional insights. (Implemented)
2. **Contingency Protocol**:
    * Implement a "One-Click" survival mode that pauses discretionary goals and recalculates the budget for bare-metal essentials. (Implemented)
3. **Elite Dashboard V7**:
    * Re-architected the dashboard into a "Financial Assistant" model focusing on closed-loop UX (See -> Understand -> Fix).
    * Implemented the Smart Budget Drawer with guided AI fixes, interactive sliders, and real-time impact summary.
    * Re-designed the Spending Breakdown with multi-segment donut charts and category comparison bars for rapid scanning. (Implemented)

---

## Milestone 18 — Integrated Testing (Cypress)
**Status: ⏳ Pending**

### Objective
Implement a robust End-to-End (E2E) integration testing suite using Cypress to verify critical user journeys across the web application.

### Execution Plan
1. **Tooling Setup**: Install and configure Cypress within the `apps/web` directory.
2. **Critical Path Testing**:
    * **Auth Flow**: Test email/password and OAuth sign-in/sign-up.
    * **Loan Lifecycle**: Create a loan, view amortization, and mark payments as paid.
    * **Budgeting**: Set limits and verify real-time spending progress.
3. **Data Integrity**: Verify that actions in one module (e.g., paying a loan) correctly update global metrics like Net Worth and DTI.

---

## Milestone 19 — Universal Statement Importer
**Status: ⏳ Pending**

### Objective
Enable effortless account aggregation via local file processing (CSV/JSON/PDF), bypassing the need for expensive and invasive 3rd-party banking APIs.

### Execution Plan
1. **Importer Logic**: Build high-performance CSV/JSON parsers for major international and local banks.
2. **AI Categorization**: Reuse LLM logic from Milestone 12 to automatically categorize imported transactions.
3. **Audit Pipeline**: Cross-reference imported statements against existing manual entries to prevent duplicates.

---

## Milestone 20 — User Onboarding & Interactive Tutorials
**Status: ⏳ In Progress**

### Objective
Create a seamless entry experience for new users, guiding them through the application's unique AI-driven features.

### Execution Plan
1. **Interactive Tour**: Implement a "first-run" guided tour of the redesigned dashboard (Summary Strip, Cash Flow, Spending Breakdown).
2. **Setup Wizard**: Create a step-by-step wizard to help users establish their initial budgets and financial goals. (In Progress: `BudgetSetupWizard.tsx` implemented)
3. **Contextual Help**: Add tooltips and an interactive "Help Center" drawer for complex metrics like DTI and Macro Multipliers.

---

## Decision Records (Rationale)
### DR-001: Pivot from Paid Bank Linking (Aggregation)
*   **Context**: Direct bank linking (Plaid/Salt Edge) requires expensive recurring contracts and complex multi-region legal compliance.
*   **Decision**: Replaced with **Milestone 19: Universal Statement Importer**. 
*   **Solution**: Build high-performance CSV/JSON parsers for major banks. This achieves aggregation on a free-tier budget while maintaining absolute privacy.

### DR-002: Simplified Legal Approach
*   **Context**: Professional legal drafting is a barrier for an MVP using free resources.
*   **Decision**: Focus on "Privacy by Design" transparency.
*   **Solution**: Use standardized templates that reflect the technical reality: your data stays in your Supabase.

---

## Technical Audit & Backlog Items
*   **Edge Functions**: `get-dashboard`, `get-cash-flow`, and `calculate-dti` are currently bypassed by direct frontend queries. These need full backend implementation for production security.
*   **Automated Exchange Rates**: The `sync-exchange-rates` function requires a scheduled Cron Job.
*   **Budget Rollover**: Backend logic to automatically carry over unused funds is missing.
*   **OAuth Verification**: End-to-end testing required on physical devices for Google/Apple sign-in.
*   **Error Handling**: React Error Boundaries need to be implemented across the dashboard to prevent cascading UI failures.
*   **Restore Demo Button**: Add the 'See the Demo' video or interactive tour to the landing page.
*   **Market Intel Automation**: Implement a scheduled Cron job (Supabase/GitHub) for the `sync_market_data` Edge Function.

---

## Change Log

| Date | Change | Approved By |
|---|---|---|
| 2026-04-01 | Initial plan created, M0 complete | — |
| 2026-04-14 | M4b complete, Web upgraded to Next.js 16, M5-M7 complete | — |
| 2026-04-16 | Completed M10 (Advanced Budgeting) and defined M12 (Global Loan Engine) | — |
| 2026-04-17 | Added M16 (Compliance), updated Mobile App scope, and documented audit findings | — |
| 2026-04-17 | Completed M17 (Advanced Intelligence & Contingency) | — |
| 2026-04-17 | Completed M12 (Core Logic) and reached 94%+ coverage for core utilities (M14) | — |
| 2026-04-17 | Pivoted M16 to standard disclosures and replaced paid bank linking with M19 (Universal Importer) | — |
| 2026-04-19 | Finalized Elite Dashboard (V1-V7) with high-fidelity charts, smart budget drawer, and actionable AI insights | — |
| 2026-04-19 | Implemented AI Resilience fallback (Gemini -> Groq) and defined M20 (User Onboarding) | — |
