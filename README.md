# 💰 StashFlow

> A mathematically robust, global-ready personal finance platform for managing spending, debt-to-income ratio, and advanced loan amortization.

## 🏗️ Hardened Architecture

StashFlow is built on a **Domain-Driven Monorepo** designed for extreme stability, privacy, and scale.

### 📦 Modular Core (`@stashflow/core`)
Our "Financial Brain" is strictly decoupled into pure modules:
*   **`math`**: 95%+ verified financial calculations (Amortization, DTI).
*   **`regional`**: Strategy-based plugins for localized rules (US, PH, SG).
*   **`analysis`**: Macro-aware smart budgeting and user insights.

### 🔌 Service API (`@stashflow/api`)
Resilient data orchestration layer using a **Partial Success** model to ensure high availability.

### 🧩 Feature-Based UI (`apps/web`)
Frontend organized into standalone libraries with strict public APIs and no cross-feature coupling.

## 🧠 Intelligence & Resilience
*   **Triple-Provider AI Fallback**: Gemini 2.5 → Groq (Llama 3) → Claude 3.5 → Heuristic Backend.
*   **Data-Driven Caching**: PostgreSQL indexed caching for AI insights and document extraction.
*   **Macro-Aware**: Real-time integration with FRED® API for localized economic signals.

## 🚀 Quick Start
```bash
# Bootstrap monorepo & database
./setup.sh init

# Reset with high-volatility seed data
pnpm db:reset

# Run development servers
pnpm dev
```

---

## 📱 (Future) Mobile Local Development
Mobile parity is moved to **Milestone 20** to prioritize the web's architectural hardening.
