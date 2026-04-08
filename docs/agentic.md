# FinTrack — Agentic Session Context

> Current Session: 010 — Core & Auth Unit Testing
> Date: 2026-04-08
> Status: Milestone 3 & 4a unit tests complete (Web, Core, API).

---

## High-Level Instructions

You are a senior full-stack developer building **FinTrack**, a cross-platform personal finance app (Web + iOS + Android). The tech stack uses a Turborepo monorepo with Next.js 15, Expo React Native 54, and Supabase as the backend.

**Always follow these rules before doing anything:**
1. Update `plan.md` before writing any code.
2. Get explicit user approval before starting a new milestone.
3. Iterate on requirements until fully understood.
4. Analyze existing source code before making changes.
5. Write tests before writing implementation code.
6. Produce a file/folder execution plan for every milestone.
7. Always use the latest stable library/runtime versions compatible with the project.
8. Create or update `agentic.md` at the end of every session.

---

## Confirmed Dependency Versions

| Package | Version | Location | Notes |
|---|---|---|---|
| Next.js | 15.5.14 | apps/web | App Router |
| React | 19.1.0 | Shared | Web + Mobile |
| Expo SDK | ~54.0.33 | apps/mobile | iOS + Android |
| @fintrack/core | workspace:* | apps/web + apps/mobile | Internal Shared Logic |
| @fintrack/api | workspace:* | apps/web + apps/mobile | Internal API Layer |
| Tailwind CSS | ^3.4.19 | apps/web | v3 Required for DaisyUI |
| Vitest | ^4.1.2 | Shared | Test Runner |

---

## Critical Technical Constraints

### 1. Next.js 15 Async APIs
- **Rule:** `cookies()` AND `headers()` must be awaited.
- **Action:** Import `headers` statically from `next/headers`. Use `const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'`.

### 2. Mobile Network (Local Dev)
- **Rule:** Android Emulator cannot reach `127.0.0.1`.
- **Action:** Use local network IP (e.g., `192.168.1.185`) in `apps/mobile/.env` for universal compatibility.

### 3. Monorepo TypeScript Paths
- **Rule:** Workspace dependencies require explicit path mapping in `tsconfig.json`.
- **Action:** Map `@fintrack/*` in `apps/*/tsconfig.json` to `../../packages/*/src/index.ts`.

### 4. Supabase Auth Manual Seeding
- **Rule:** Manual `INSERT` into `auth.users` requires specific non-nullable fields.
- **Action:** Always include `instance_id`, `aud` ('authenticated'), and `confirmation_token`.

### 5. Date Arithmetic (Timezones)
- **Rule:** `new Date('YYYY-MM-DD')` can shift days depending on local timezone.
- **Action:** Use `T00:00:00Z` suffix and `getUTCMonth`/`setUTCMonth` methods for consistent cross-environment testing.

---

## Milestone Status

| Milestone | Status |
|---|---|
| M0 — Requirements & Planning | ✅ Complete |
| M1 — Monorepo Scaffold | ✅ Complete |
| M2 — Supabase Schema + RLS | ✅ Complete |
| M3 — Auth Flow (Web + Mobile) | ✅ Complete (Testing Foundation Established) |
| M4a — Core Logic, API Layer & Seed Data | ✅ Complete (Core Logic Verified) |
| M4b — Live Dashboards (Web & Mobile) | 🟡 In Progress |

---

## Errors Encountered & Fixed (Session 010)

| Error / Issue | Fix | File |
|---|---|---|
| `setup.sh add` unknown option `--dev` | Added support for `-D / --dev` flags in `cmd_add` | `setup.sh` |
| `setup.sh add` only supported one package | Updated `cmd_add` to handle multiple package arguments | `setup.sh` |
| Corepack / pnpm signature errors | Force-reinstalled `pnpm` via `npm install -g pnpm@latest --force` | — |
| Loan schedule date drift in tests | Switched to `T00:00:00Z` start dates and `setUTCMonth` in logic | `packages/core/src/utils/loans.ts` |
| Mobile Vitest `SyntaxError: Unexpected token 'typeof'` | Configured `react-native-web` alias and `deps.optimizer`, though RN testing remains complex | `apps/mobile/vitest.config.ts` |

---

## Developer CLI (setup.sh)

`setup.sh` is the single entrypoint for all project tasks. Run `./setup.sh help` at any time.

| Command | What it does |
|---|---|
| `./setup.sh init` | First-time scaffold (run once) |
| `./setup.sh install` | Install / refresh all workspace dependencies |
| `./setup.sh add <pkg> [-w workspace] [-D]` | Add package(s) to the monorepo or a specific workspace |
| `./setup.sh dev [web\|mobile]` | Start dev servers (default: all via Turbo) |
| `./setup.sh db:start` | Start local Supabase via Docker + **auto-sync env keys** |
| `./setup.sh db:stop` | Stop local Supabase |
| `./setup.sh db:reset` | Drop + reapply migrations + re-seed (prompts for confirmation) |
| `./setup.sh db:status` | Show Supabase service URLs and ports |
| `./setup.sh db:port <port>` | Change the local Supabase API port (updates config.toml) |
| `./setup.sh db:env` | Update workspace `.env` files with current local Supabase keys |
| `./setup.sh db:types` | Regenerate `database.types.ts` from local schema |
| `./setup.sh test` | Run web unit tests (Vitest) |

---

## Where We Stopped

**Session 010 (Current) ended after:**
- Branched to `feature/m3-m4a-AuthTest-CoreTest`.
- 100% test coverage for `@fintrack/core` utilities (DTI, Loans, Currency).
- 100% test coverage for `@fintrack/api` dashboard queries (mocked Supabase).
- 100% test coverage for Web Auth Server Actions (`login`, `signup`, `forgotPassword`, `resetPassword`).
- Upgraded `setup.sh` to support dev-dependencies and multiple packages in the `add` command.
- Established Vitest infra in `packages/core` and `packages/api`.

**Session 009 ended after:**
- Enhanced `setup.sh` with `db:port` and `db:env` (automated environment variable synchronization).

**Next actions required:**
1. **M4b Unit Tests** — Write tests for the Web Dashboard page rendering and Mobile Dashboard logic.
2. **Dashboard UI label** — Update "Total Assets" card to "Total Income" on both web and mobile.
3. **Mobile Test Infrastructure** — Resolve the `SyntaxError` in mobile tests or decide on a different testing strategy (e.g., Maverick or purely logic-based tests).
4. **Seed Data Validation (M4b)** — Verify test user login after `db:reset`.
