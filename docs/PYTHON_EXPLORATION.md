# Architectural Exploration: Python Integration

> **Status**: Exploratory / Post-MVP
> **Objective**: Evaluate the feasibility and impact of integrating Python into the StashFlow monorepo to leverage its superior AI and document processing ecosystem while avoiding logic duplication.

---

## 1. The Core Dilemma
StashFlow currently uses a **Unified TypeScript Architecture** (`@stashflow/core` shared between Web, Mobile, and Supabase Edge Functions). While this ensures "Zero Duplication," the JavaScript ecosystem for complex PDF parsing and native AI/ML processing is significantly less mature than Python's.

### Goal:
Acquire the power of Python (Pandas, pdfplumber, LangChain) without maintaining two versions of the core financial math.

---

## 2. Strategic Options

### Path A: The "Hybrid Brain" (Targeted Python)
In this model, only the most "expensive" logic moves to Python.
- **Python Scope**: `packages/document-parser`, `packages/ai-analytics`.
- **TypeScript Scope**: Auth, CRUD, UI, and basic financial math (`@stashflow/core`).
- **Communication**: Supabase Functions (TS) call a Python Microservice (FastAPI) via REST.
- **Trade-off**: 
    - ✅ Keeps development speed high for the UI.
    - ❌ Small risk of logic drift if math is needed in both layers.

### Path B: The "Python-First" Unified Backend
Python becomes the **Single Source of Truth** for all business logic.
- **Python Scope**: All logic from `@stashflow/core`, plus AI and Parsing.
- **TypeScript Scope**: Strictly UI/Rendering (Web & Mobile).
- **Architecture**: The Frontend becomes "Thin." Every calculation (DTI, Amortization) is an API call to the Python backend.
- **Trade-off**: 
    - ✅ **Zero Code Duplication**: Math is defined in exactly one place (Python).
    - ❌ **Higher Latency**: Every UI calculation requires a network request.
    - ❌ **No Offline Math**: Mobile app cannot calculate DTI without a connection.

### Path C: The "Shared Logic" Bridge (High Complexity)
Write the "Truth" in a language that can run everywhere.
- **Language**: **Rust**.
- **Execution**: Core math is written in Rust, compiled to **WebAssembly (Wasm)**.
- **Usage**: The same Wasm file is imported by the Python Backend (for AI) and the TypeScript Frontend (for UI).
- **Trade-off**: 
    - ✅ **Ultimate Unity**: One codebase, native speed, runs in TS, Python, and Mobile.
    - ❌ **Extreme Effort**: Requires Rust expertise and complex build pipelines.

---

## 3. Monorepo Structure (Proposed)
Regardless of the path, the monorepo remains the anchor. Turborepo handles the orchestration.

```text
StashFlow/
├── apps/
│   ├── web/               (Next.js)
│   ├── mobile/            (Expo)
│   └── backend-py/        <-- NEW: FastAPI Service
├── packages/
│   ├── core/              (Shared TS types/logic)
│   └── ui/                (Shared components)
├── pyproject.toml         (Root Python config via Poetry/uv)
└── turbo.json             (Orchestrates pnpm + python tasks)
```

---

## 4. Decision Matrix

| Factor | Current (TS) | Python-First | Hybrid |
| :--- | :--- | :--- | :--- |
| **Logic Duplication** | None | **None** | Minimal |
| **AI/ML Power** | Moderate | **Elite** | **Elite** |
| **Doc Processing** | Hard | **Easy** | **Easy** |
| **UI Responsiveness** | Instant | Latency-dependent | Instant |
| **Monorepo Complexity** | Low | Moderate | Moderate |

---

## 5. Summary Recommendation

**Current Priority**: Finalize and launch the **TypeScript MVP**. The existing "Local Proxy Strategy" for Supabase Edge Functions is the fastest path to a working product.

**Post-MVP Transition**:
Move to **Path B (Python-First)** if the complexity of financial analytics and document variety exceeds the capabilities of the current Deno/TypeScript environment. This ensures Python's power is available for the "Brain" while keeping the "Truth" unified in a single language.
