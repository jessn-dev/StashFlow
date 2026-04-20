# StashFlow: System Architecture

StashFlow is a modern, global-ready personal finance platform designed for privacy, accuracy, and cross-platform consistency.

## 1. High-Level Architecture
StashFlow follows a **Serverless Monorepo** architecture. We use Turborepo to manage a shared set of logic packages and two distinct frontend applications.

### 1.1 Components
*   **The Shared Core**: Centralized financial math and design tokens.
*   **API Gateway (Supabase)**: Provides Auth, PostgreSQL, Real-time sync, and Edge Functions.
*   **Universal Client**: Web (Next.js 16) and Mobile frontends sharing 80% of their business logic.

---

## 2. Core Layers

### 2.1 Logic Layer (`@stashflow/core`)
The "Source of Truth" for all financial calculations.
*   **Amortization Engine**: Handles global interest models (Standard, Add-on, Interest-Only) and multiple day-count conventions.
*   **DTI Engine**: Calculates Debt-to-Income ratios based on regional thresholds (PH, SG, JP, US).
*   **Privacy by Design**: Most logic is deterministic and client-side, reducing server exposure.

### 2.2 Data Layer (`@stashflow/api`)
The bridge between the database and the UI.
*   **Data Aggregation**: Performs complex joins for the Dashboard (Total Assets, Net Worth).
*   **Optimistic Sync**: UI components trigger background revalidation (`router.refresh()`) for instant feedback.
*   **Currency Converter**: Centralized utility that pulls live rates from Frankfurter and applies them globally to the user's dashboard.

### 2.3 Backend Layer (Supabase)
*   **Storage**: Secure buckets for loan contract uploads using RLS pathing (`{user_id}/scans/`).
*   **Automated Triggers**: PostgreSQL functions automatically generate monthly budget snapshots when expenses are logged.
*   **Edge Functions (Deno)**:
    *   `sync_market_data`: Pulls macroeconomic trends from FRED®.
    *   `extract-loan-data`: AI-powered contract parsing.
    *   `get-platform-stats`: Real-time user adoption tracking.

---

## 3. Data Flow Overview

### 3.1 Authentication
1.  User authenticates via Email/Password or OAuth (Google/Apple).
2.  Supabase issues a JWT.
3.  JWT is stored in HTTP-only cookies (Web) or SecureStore (Mobile).
4.  Every API request includes the JWT, which PostgreSQL uses to enforce Row Level Security (RLS).

### 3.2 Financial Cycle (e.g., Logging an Expense)
1.  **Frontend**: User submits the "Log Expense" form.
2.  **Server Action**: `apps/web` calls `addExpenseAction`.
3.  **Database**: Row is inserted into `expenses`.
4.  **Database Trigger**: `sync_budget_period` trigger fires, instantly updating the monthly budget snapshot.
5.  **Revalidation**: Frontend triggers `refresh()`, re-fetching the updated Dashboard payload.
6.  **UI Update**: Total Spending, Free-to-Spend, and DTI metrics update in real-time.

---

## 4. Key Security Principles
*   **Isolation**: Every table has RLS enabled. One user can never see or modify another user's data.
*   **No PII in Logic**: Financial math never stores personal identifiers; it operates on anonymous numeric data.
*   **Encryption**: All documents in storage are encrypted at rest via Supabase's infrastructure.
