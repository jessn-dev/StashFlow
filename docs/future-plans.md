# StashFlow: Future Capabilities & Moonshots

This document serves as a repository for highly advanced, complex features that are plausible but slated for future development or "moonshot" phases.

---

## Future Feature: Automated "ReceiptOps" Auditing
*Event-driven pipeline extracting vendor/amount from dropped invoices via LLM, cross-referencing with CSV exports for flawless tax preparation.*

### Free-Tier Plausibility: ⚠️ Moderate to High (Requires Careful Architecture)
*   **Storage Triggers**: Supabase allows database triggers on the `storage.objects` table. Dropping a file into a bucket can automatically trigger an Edge Function. (Free tier limits apply, but sufficient for personal use).
*   **LLM Parsing**: Using a multimodal LLM (like Google Gemini 1.5 Flash via API) allows for free, high-quality OCR and entity extraction from images/PDFs.
*   **Data Matching**: Cross-referencing against CSVs can be done in Postgres using fuzzy string matching (e.g., `pg_trgm` extension, which is free and built-in).

### Potential Implementation Strategy
1.  **Storage & Webhooks**:
    *   Create a dedicated `receipts` bucket in Supabase.
    *   Set up a Postgres Trigger on `storage.objects` that calls an Edge Function (`process-receipt`) whenever a new file is added.
2.  **LLM Extraction**:
    *   The `process-receipt` function sends the image/PDF to the Gemini API, requesting a structured JSON response: `{ "vendor": "string", "amount": "number", "date": "YYYY-MM-DD" }`.
    *   Save this parsed data to a `pending_receipts` table.
3.  **CSV Auditing Pipeline**:
    *   When the user uploads their bank CSV, insert the raw rows into a `bank_transactions` table.
    *   Run a background matching algorithm (fuzzy matching vendor names, exact matching amounts and dates within a ±3 day window) to link `pending_receipts` to actual bank `expenses`.
4.  **UI Integration**: Add a "Reconciliation" view showing matched receipts (green) and orphaned receipts/transactions (yellow/red) for tax prep.

### Why this is a "Future" Plan
While highly valuable, this feature requires a complex, multi-stage pipeline involving storage webhooks, external LLM API calls, and intricate fuzzy-matching algorithms in PostgreSQL. It is best tackled after core modules (Loans, Budgeting, and basic Mobile parity) are fully stabilized in production.