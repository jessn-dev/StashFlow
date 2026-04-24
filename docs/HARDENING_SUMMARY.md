# StashFlow: Architectural Hardening & Modular Transformation

## Executive Summary
This document outlines the systematic transformation of the StashFlow codebase from a monolithic, tightly coupled project into a **hardened, domain-driven modular framework**. 

The primary goal was to move from a system that was **"Reusable but Fragile"** to one that is **"Extensible and Isolated."**

---

## 1. Architectural Philosophy: Isolation Over Coupling

### Before: The Monolithic Utility Trap
Previously, StashFlow relied on large, generic `utils` folders and relative imports (e.g., `../../../utils/math`). 
*   **The Risk**: A small change in a "shared" utility to support a new PHP feature would silently break an existing USD calculation. 
*   **Logical Leakage**: UI components often contained complex business logic, making them hard to test and even harder to refactor without breaking the visual layer.

### After: Domain-Driven Boundaries
We have transitioned to an **Internal Package** model. Shared code is no longer just "files in a folder"; it is a set of formal libraries with strict entry points.

#### 📦 The Dependency Hierarchy:
1.  **`@stashflow/schema`**: The foundation. Zero dependencies. Defines what data *is*.
2.  **`@stashflow/math`**: Pure logic. Depends only on `schema`. Calculates values without side effects.
3.  **`@stashflow/regional`**: The Adapter layer. Implements the **Regional Strategy Pattern**.
4.  **`@stashflow/analysis`**: The Intelligence layer. Orchestrates math and regional rules to provide insights.
5.  **`@stashflow/api`**: The Service layer. Communicates with Supabase and orchestrates the core packages.
6.  **`apps/web/modules`**: The Feature layer. Standalone libraries that consume services.

---

## 2. The Regional Strategy Pattern (Plugin Architecture)

Instead of hardcoding regional differences using `if (currency === 'PHP')` blocks scattered throughout the code, we implemented a **Strategy Pattern**.

*   **Extensibility vs. Reusability**: We no longer "reuse" logic by adding parameters to it. We "extend" the system by adding new adapters.
*   **The Workflow**: Adding support for a new region (e.g., Japan) now only requires adding a `JPYStrategy.ts` file. This file contains only JPY-specific thresholds and rationales. The core engine remains untouched and safe from regressions.

---

## 3. Service-Oriented Orchestration & "Partial Success"

We have addressed **Temporal Coupling** (where the UI depends on every single backend query finishing successfully at the exact same time).

### The "Partial Success" Model
In the refactored `DashboardService`, queries are treated as independent streams:
*   **Critical Stream**: Incomes, Expenses, Loans. If these fail, the UI shows a hard error.
*   **Advisory Stream**: Market Trends, Goals, AI Insights. If these fail (e.g., FRED API is down), the `DashboardService` catches the error and returns a **partial payload**.
*   **UI Result**: The user can still manage their money and view their balance even if the "Market Intelligence" card is temporarily offline. This is "Graceful Degradation."

---

## 4. App-as-a-Library (`apps/web/modules`)

Every folder in `apps/web/modules` is now treated as a **standalone library**.

*   **Private Implementation**: All UI components, local hooks, and specific API wrappers are hidden inside the module folder.
*   **Public Interface (`index.ts`)**: Only the essential components are exported. 
*   **No Cross-Module Imports**: A component in `modules/loans` is forbidden from importing directly from `modules/spending`. They communicate via a shared state or the parent `DashboardUI` orchestrator.
*   **V7 Elite UI Preservation**: By modularizing the high-fidelity UI (StatCards, Bezier Charts), we ensure that polishing the visuals in the "Overview" doesn't accidentally move or delete code needed by the "Cash Flow" page.

---

## 5. Verification & The "Sad Path" Culture

We have moved away from "Happy Path" testing (testing only when everything goes right).

*   **Sad Path Mandate**: Every financial utility in `@stashflow/math` now has tests for:
    *   `null` or `undefined` inputs.
    *   Negative numbers (e.g., negative loan principal).
    *   Zero-value edge cases (e.g., zero income).
    *   Invalid date strings.
*   **Hydration Safety**: Standardized `useIsMounted` hooks prevent the common Next.js "Styling Flash" or "Missing UI" bugs by ensuring the complex modular components only render once the client is ready.

---

## Conclusion: A Hardened Foundation
StashFlow is no longer a single "maga-project." It is a collection of high-quality, independent micro-libraries working in concert. This architecture ensures that a single change is localized, the risk of global breakage is minimized, and adding new features is as simple as plugging in a new module.
