# StashFlow: System Architecture

StashFlow is a modern, global-ready personal finance platform designed for privacy, accuracy, and extreme modularity.

## 1. High-Level Architecture
StashFlow follows a **Domain-Driven Monorepo** architecture. We use Turborepo to manage specialized internal packages and feature-based frontend modules.

### 1.1 Components
*   **The Modular Core (`@stashflow/core`)**: 
    *   `math`: Pure financial logic (Amortization, DTI math, Currency conversion).
    *   `regional`: Strategy-based regional adapters (localized rules for US, PH, SG, etc.).
    *   `schema`: Shared TypeScript types and database interfaces.
    *   `analysis`: Smart analytical engines (Budget recommender, User behavior).
*   **Service-Oriented API (`@stashflow/api`)**: 
    *   Provides domain-specific services (`DashboardService`, `FinancialService`) that orchestrate data fetching and delegate logic to the Core.
*   **Universal Client**: Web (Next.js 16) and (Future) Mobile frontends organized into standalone **Feature Modules**.

---

## 2. Core Design Patterns

### 2.1 Regional Strategy Pattern (Plugins)
Localized financial rules are not hardcoded. Instead, they are implemented as "Regional Strategies":
1.  **Registry**: A central registry resolves the correct strategy based on the user's region/currency.
2.  **Strategies**: Standalone classes (e.g., `PHStrategy`) that implement a common interface for DTI thresholds and income haircuts.
3.  **Benefit**: Adding support for a new country requires zero changes to the core financial engine.

### 2.2 Resilient Data Orchestration
The API layer uses a **"Partial Success"** fetching model:
*   Critical data (Accounts, Loans) and non-critical data (Market Trends, Goals) are fetched independently.
*   The system ensures that a failure in a secondary service does not crash the primary UI.

### 2.3 Feature-Based Frontend (`apps/web`)
The web application is structured as a collection of standalone libraries:
*   Each feature (e.g., `modules/loans`) has a private implementation and a strict public API (`index.ts`).
*   This prevents cross-feature coupling and reduces the risk of side-effect regressions.

---

## 3. Data Flow Overview

### 3.1 Authentication
1.  User authenticates via Email/Password or OAuth (Google/Apple).
2.  Supabase issues a JWT stored in HTTP-only cookies (Web).
3.  Every API request includes the JWT, which PostgreSQL uses to enforce Row Level Security (RLS).

### 3.2 Resilience & Caching
*   **AI Caching**: Generated macro insights and document extractions are cached in PostgreSQL indexed by a `data_version_hash`.
*   **Fallback Chain**: AI services follow a prioritized fallback: `Gemini 2.5` → `Groq (Llama 3)` → `Claude 3.5` → `Heuristic Backend`.

---

## 4. Security Posture
*   **Zero-Trust Client**: The frontend is treated as untrusted; all critical math and validation occur in `@stashflow/core` and are verified server-side.
*   **RLS-First**: No data can be read or modified without an active Row Level Security policy in PostgreSQL.
*   **Encryption**: All documents in storage are encrypted at rest via Supabase's infrastructure.
