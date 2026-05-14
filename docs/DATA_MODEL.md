# StashFlow — Data Model

> Database: PostgreSQL (Supabase).
> All tables use UUID as PK.
> All financial amounts use `NUMERIC(18,6)` for precision.
> RLS enabled on all user-owned tables.

---

## Core Entities

### `profiles`
User preferences and global settings. One-to-one with auth.users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary Key, references `auth.users(id)` |
| `email` | `TEXT` | Cached for indexing/display |
| `full_name` | `TEXT` | |
| `preferred_currency` | `TEXT` | Default: 'USD' |
| `budgeting_enabled` | `BOOLEAN` | |
| `global_rollover_enabled` | `BOOLEAN` | |
| `contingency_mode_active` | `BOOLEAN` | "Survival Mode" flag |

---

## Transactions

### `incomes`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | references `profiles(id)` |
| `amount` | `NUMERIC(18,6)` | |
| `currency` | `TEXT` | ISO 4217 |
| `source` | `TEXT` | e.g., 'Salary' |
| `frequency` | `TEXT` | enum: 'one-time', 'weekly', 'monthly' |
| `date` | `DATE` | |
| `signature` | `TEXT` | HMAC-SHA256 ledger integrity signature |
| `provenance` | `JSONB` | { page, snippet } for document-extracted entries |
| `source_document_id` | `UUID` | references `documents(id)` |

### `expenses`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | references `profiles(id)` |
| `amount` | `NUMERIC(18,6)` | |
| `currency` | `TEXT` | |
| `description` | `TEXT` | |
| `category` | `TEXT` | enum: housing, food, transport, etc. |
| `date` | `DATE` | |
| `is_recurring` | `BOOLEAN` | |
| `signature` | `TEXT` | HMAC-SHA256 ledger integrity signature |
| `provenance` | `JSONB` | { page, snippet } for document-extracted entries |
| `source_document_id` | `UUID` | references `documents(id)` |

---

## Assets & Liabilities

### `assets` (New in v0.15.0)
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | |
| `name` | `TEXT` | |
| `type` | `asset_type` | enum: cash, investment, property, retirement, other |
| `balance` | `NUMERIC(15,2)` | Current balance |
| `currency` | `TEXT` | |
| `institution` | `TEXT` | Optional |

### `net_worth_snapshots` (New in v0.15.0)
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | |
| `snapshot_date` | `DATE` | |
| `total_assets` | `NUMERIC(15,2)` | Converted to preferred_currency |
| `total_liabilities` | `NUMERIC(15,2)` | Converted to preferred_currency |
| `net_worth` | `NUMERIC(15,2)` | Assets - Liabilities |

### `loans`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | |
| `name` | `TEXT` | |
| `principal` | `NUMERIC(18,6)` | Original principal amount |
| `interest_rate` | `NUMERIC(8,4)` | **Always annual flat rate** (e.g. 15.6000 for 15.6% p.a.). For Add-on loans, this is the flat rate, not the EIR. Never store a monthly rate here. |
| `installment_amount` | `NUMERIC(18,6)` | Lender-stated monthly payment. Used as fixed payment in amortization schedule generation — preferred over the computed value to avoid rounding divergence. |
| `duration_months` | `INTEGER` | |
| `start_date` | `DATE` | |
| `end_date` | `DATE` | Computed at save time: `start_date + duration_months` |
| `interest_type` | `TEXT` | `Standard Amortized` \| `Add-on Interest` \| `Interest-Only` \| `Fixed Principal` |
| `interest_basis` | `TEXT` | Day-count convention (e.g. `30/360`). Optional. |
| `lender` | `TEXT` | Lending institution name. Extracted from document header/letterhead, not just labeled fields. |
| `currency` | `TEXT` | ISO 4217 (e.g. `PHP`, `USD`). Validated against `ALLOWED_CURRENCIES` whitelist. |
| `source_document_id` | `UUID` | FK → `user_documents.id`. Set when loan was created from a parsed document. |
| `status` | `TEXT` | `active` \| `completed` \| `defaulted` |

**Amortization schedule — generated at read time, not stored.** `generateAmortizationSchedule()` in `@stashflow/core` computes the full payment schedule on demand from the columns above. For `Add-on Interest` loans, the schedule uses the **Effective Interest Method** (EIR-based reducing balance), not the flat split — matching the lender-issued schedule format. See ADR-016.

**`annual_eir` — extraction metadata only, not a DB column.** When a document explicitly states an EIR (e.g. `Annual EIR: 26.209%`), it is captured in `documents.extracted_data` JSONB as `annual_eir`. It is not stored in the `loans` table. The amortization engine derives the monthly EIR from `installment_amount` + `principal` + `duration_months` via Newton-Raphson (see `solveMonthlyEir` in `packages/core/src/math/loans.ts`).

### `loan_payments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `loan_id` | `UUID` | references `loans(id)` |
| `amount_paid` | `NUMERIC(18,6)` | |
| `due_date` | `DATE` | |
| `paid_date` | `DATE` | NULL if unpaid |
| `status` | `TEXT` | pending, paid, late |

---

## Planning

### `goals`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | |
| `name` | `TEXT` | |
| `type` | `TEXT` | savings, debt |
| `target_amount` | `NUMERIC(18,6)` | |
| `current_amount` | `NUMERIC(18,6)` | |
| `deadline` | `DATE` | |

### `budgets`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `UUID` | Composite PK (user_id, category) |
| `category` | `TEXT` | |
| `amount` | `NUMERIC(18,6)` | Monthly limit |
| `currency` | `TEXT` | |

---

## System Tables

### `exchange_rates`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `base` | `TEXT` | Base currency (usually USD) |
| `target` | `TEXT` | Target currency |
| `rate` | `NUMERIC(18,6)` | 1 Base = X Target |
| `updated_at` | `TIMESTAMPTZ` | |

### `session_events` (New in v0.18.0)
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | references `auth.users(id)` |
| `session_id` | `UUID` | Optional |
| `ip` | `TEXT` | IP address from auth event |
| `country` | `TEXT` | ISO 3166-1 alpha-2 code |
| `user_agent` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ` | |

### `system_audit_logs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | |
| `table_name` | `TEXT` | |
| `record_id` | `UUID` | |
| `operation` | `TEXT` | INSERT, UPDATE, DELETE |
| `old_data` | `JSONB` | |
| `new_data` | `JSONB` | |
| `created_at` | `TIMESTAMPTZ` | |

---

## Views

### `unified_transactions` (New in v0.17.0)
Unified read-only view of `incomes` and `expenses`. Uses `security_invoker = true` to respect RLS.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Original record PK |
| `user_id` | `UUID` | |
| `amount` | `NUMERIC(18,6)` | |
| `currency` | `TEXT` | |
| `description` | `TEXT` | Maps from `incomes.source` or `expenses.description` |
| `date` | `DATE` | |
| `type` | `TEXT` | 'income' or 'expense' |
| `category` | `TEXT` | NULL for incomes |
| `notes` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ` | |
| `provenance` | `JSONB` | |
| `source_document_id` | `UUID` | |

---

## Documents & OCR

### `documents`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | |
| `file_name` | `TEXT` | |
| `file_size` | `INTEGER` | |
| `content_type` | `TEXT` | |
| `storage_path` | `TEXT` | |
| `processing_status` | `TEXT` | enum: pending, processing, success, error_rate_limit, error_generic |
| `processing_error` | `JSONB` | Structured error details |
| `ocr_telemetry` | `JSONB` | { confidence_before, confidence_after, ocr_text_length, ocr_error, duration_ms } |
| `extraction_source` | `TEXT` | enum: pdfjs, vision, ai |
| `extracted_data` | `JSONB` | Structured AI output (Loan or Statement data) |
| `inferred_type` | `TEXT` | Classified type (e.g., 'Loan', 'Bank Statement') |
| `loan_id` | `UUID` | Linked loan record (if applicable) |
| `processing_attempts` | `INTEGER` | |
| `last_processed_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ` | |
