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
| `principal` | `NUMERIC(18,6)` | Original principal |
| `interest_rate` | `NUMERIC(8,4)` | Annual rate (e.g., 12.0000) |
| `installment_amount` | `NUMERIC(18,6)` | Monthly payment |
| `duration_months` | `INTEGER` | |
| `start_date` | `DATE` | |
| `interest_type` | `TEXT` | enum: Standard Amortized, Add-on, etc. |
| `status` | `TEXT` | enum: active, paid, default |

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
| `from_currency` | `TEXT` | Base currency (usually USD) |
| `to_currency` | `TEXT` | Target currency |
| `rate` | `NUMERIC(18,6)` | 1 From = X To |
| `updated_at` | `TIMESTAMPTZ` | |

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
| `extraction_source` | `TEXT` | pdfjs, vision, ai |
| `extracted_data` | `JSONB` | Extracted loan fields |
| `inferred_type` | `TEXT` | |
| `loan_id` | `UUID` | |
| `processing_attempts` | `INTEGER` | |
| `last_processed_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ` | |
