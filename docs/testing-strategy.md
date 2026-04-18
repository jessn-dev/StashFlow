# StashFlow: Testing Strategy & Code Coverage Guidelines

This document establishes the official testing standards for the StashFlow monorepo. It is designed to ensure financial calculations are flawless while maintaining a high velocity for UI development.

## 1. Core Philosophy: Meaningful Coverage
We prioritize the **correctness of logic** and **stability of critical paths** over meeting an arbitrary 100% global metric. 

*   **Gap Identification**: Use coverage reports primarily to identify untested edge cases or forgotten logic paths.
*   **Layered Priorities**: Different parts of the codebase have different coverage requirements based on their risk level.
*   **Patch Coverage (New Code)**: 80%–100% of all new code and bug fixes must be covered by tests to ensure continuous improvement of the codebase quality.

## 2. Coverage Targets

| Layer | Type | Target Coverage | Rationale |
|---|---|---|---|
| **Business Logic** (`@stashflow/core`) | Unit | **90%+** | Financial math (amortization, DTI) is the core value proposition. Bugs here are critical. |
| **API & UI Integration** (`apps/web`) | E2E (Cypress) | **70%+ Paths** | Ensures critical user journeys (Auth, Loans, Budgets) work end-to-end. |
| **Global Baseline** | Mixed | **60%+** | The absolute minimum threshold to ensure essential paths are touched. |

## 3. Implementation Standards

### 3.1 Unit Testing (The 90% Zone)
*   Found in: `@stashflow/core/src/utils`
*   Standard: Use parameterized tests (`it.each`) to test dozens of financial edge cases (e.g., 0% interest, massive principal, 1-month term).
*   Rule: No logic-heavy utility should be exported without a corresponding `.test.ts` file.

### 3.2 Integrated Testing (Cypress)
*   Standard: Verify **End-to-End User Journeys**.
*   Tools: **Cypress** (Web).
*   Focus:
    *   **Auth Lifecycle**: Testing the full flow from landing page to authenticated dashboard.
    *   **Data Integrity**: Ensuring that logging an expense correctly updates the Budget progress bars and the DTI ratio.
    *   **High-Risk Gatekeeping**: Verifying that the `ConfirmationModal` correctly intercepts destructive actions.

### 3.3 Mobile UI Testing
*   Standard: Focus on **User Intent**.
*   Tools: `@testing-library/react-native` (Mobile).
*   Critical Paths:
    *   Auth flow (Login/Signup transitions).
    *   Form validation.

## 4. Automation & Compliance
*   **Local Reporting**: Run `pnpm run test:coverage` to see gaps.
*   **CI Enforcement**: The CI pipeline will fail if a Pull Request introduces code that drops "Patch Coverage" below 80%.
*   **Reporting**: Coverage reports are generated in `lcov` format for CI integration and `html` format for local inspection.
