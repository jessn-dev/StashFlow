# StashFlow — Handoff Testing Guide (Audit v0.22.0)

This guide provides step-by-step instructions for verifying the high-fidelity features and infrastructure implemented during the May 2026 Architecture Audit.

---

## 1. Setup & Environment

### Step 1: Start Infrastructure
In your primary terminal, start the logging stack (includes Redis) and Supabase:
```bash
./setup.sh logging:start  # Launches GlitchTip + Redis (6379)
./setup.sh db:start       # Spins up local Supabase
./setup.sh db:env         # Refreshes keys in apps/backend-py/.env
```

### Step 2: Start the Python Worker
Open a **NEW terminal** tab and start the background ingestion worker:
```bash
./setup.sh py:worker      # Starts the RQ worker listening on 'stashflow-ingestion'
```

### Step 3: Start the Development Servers
In your primary terminal, start the web and api servers:
```bash
./setup.sh dev            # Starts Next.js (3000) and Turbo-managed services
```

---

## 2. Feature Verification & Log Analysis

### Feature A: Async Queue Ingestion (P0)
**Action:** Go to `/dashboard/loans/upload` and upload a 2-5 page financial PDF.
- **Success Path:**
    - **Edge Function Log:** Check `supabase functions logs parse-document`. Look for `python-enqueue-success`. This confirms the job hit Redis.
    - **Worker Log:** Check the `./setup.sh py:worker` terminal. Look for `task_download_start` followed by `task_success`.
    - **Webhook Log:** Check `supabase functions logs document-processed-webhook`. Look for `processing-result` and `document.parse completed`.
    - **UI:** The dashboard Intelligence Feed should show "1 document being analyzed" and then disappear when finished.
- **Failure Path:**
    - If enqueuing fails, check `parse-document` for `PYTHON_ENQUEUE_FAILED`.
    - If processing fails, the worker terminal will show `task_failed`. Check the `documents` table in Studio; `processing_status` will be `error_generic`.

### Feature B: AI Safety (Parser Disagreement)
**Action:** Upload a document where critical facts might be ambiguous (or mock a disagreement by temporarily editing `apps/backend-py/src/core/document_service.py` to return different values).
- **Read this log:** In the Python Worker terminal, look for `parser_disagreement_principal: True` or `parser_disagreement_type: True`.
- **Success Criteria:** 
    - The log `unified_ai_success` should show `disagreement=True`.
    - The UI Review page (`/dashboard/loans/review?doc=...`) **must** show a Red "Validation Errors" alert and a "Low Confidence" badge.

### Feature C: Financial Provenance (Transparency)
**Action:** Complete a successful document scan and navigate to the Review Form.
- **Verification:**
    - Hover your mouse over any auto-filled field (e.g., Principal or Interest Rate).
    - **Read this:** A dark tooltip **must** appear showing "Source Evidence," the exact text snippet from the PDF, and the page number.
- **Ledger Verification:** Expand a transaction in the **Timeline** (`/dashboard/transactions`). It should show an "Evidence" section with the same OCR snippet.

### Feature D: Inline Decryption (Graceful Recovery)
**Action:** Upload a password-protected PDF.
- **Success Path:**
    - **Read this log:** Check `parse-document` logs. It will show a 500 error with "requires a password".
    - **UI:** The Review page will automatically transition to a **"Password Required"** screen with an inline input.
    - **Action:** Enter the password. The system should re-trigger processing and the worker should show a new `task_start`.

### Feature E: Disaster Recovery (Operational)
**Action:** Run a logical backup/restore cycle.
- **Commands:**
    ```bash
    ./setup.sh db:backup          # Generates a .sql file
    ./setup.sh db:restore <file>  # Restores the state
    ```
- **Success Criteria:** All data in the `documents` and `expenses` tables must be identical to the pre-backup state.

---

## 3. Final Quality Gate
Before handing over for production deployment, run the unified gate:
```bash
./setup.sh check:all
```
**Read this:** Every package (10 total) and the Python backend must return `✔ PASS` or `Success`. There should be **Zero** `DeprecationWarnings` in the test output.
