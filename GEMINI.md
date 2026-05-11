# StashFlow Project Instructions

This document outlines the mandatory engineering standards for the StashFlow codebase. All contributors must adhere to these rules when creating new implementations or refactoring existing code.

## Documentation & Readability Standards

We prioritize code that is not only functional but also educational and maintainable. Every file must implement the following three layers of documentation:

### 1. High-Level Docstrings
Every class, function, and exported module must have a high-level description.
- **Python:** Use Google Style docstrings.
- **TypeScript:** Use TSDoc standard.
- **Requirements:** 
    - Purpose of the component.
    - Detailed parameter descriptions (including types).
    - Return value description and type.
    - List of exceptions/errors that may be raised.

### 2. Algorithmic Pseudocode
Before any major logic block, complex algorithm, or multi-step process, include a human-readable outline.
- **Format:** Use a dedicated comment block prefixed with `PSEUDOCODE:`.
- **Purpose:** To allow a reader to understand the logic flow without parsing the syntax of the language first.

### 3. Strategic Inline Comments
Inline comments should be used sparingly and focus on the **"WHY"**, not the "WHAT".
- **Focus:** Explain edge cases, specific business rules, non-obvious constraints, or workarounds for external library quirks.
- **Self-Documenting Code:** Always prefer clear variable and function names over comments explaining what a variable holds.

## Testing & Validation
- **Financial Math:** 100% coverage required. All edge cases (zero, negative, null) must be tested.
- **Type Safety:** No `any` types. Use strict TypeScript configurations.
- **Python Layer:** Strictly for probabilistic/AI logic. Financial "truth" remains in TypeScript.
