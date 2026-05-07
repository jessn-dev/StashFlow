# StashFlow — Contributing

> Engineering workflow, branching model, code standards, and review requirements.

---

## Development Setup

### Prerequisites

- Node.js 22 LTS
- Docker Desktop (for local Supabase)
- pnpm 10 (`npm install -g pnpm@10`)
- Supabase CLI (`brew install supabase/tap/supabase`)

### Initial Setup

```bash
git clone <repo>
cd StashFlow
chmod +x setup.sh
./setup.sh          # installs deps, starts Supabase containers, applies migrations
```

After setup:

```bash
pnpm dev            # starts web (3000), mobile metro (8081), Supabase already running
```

For detailed environment variable setup, see `docs/OPERATIONS.md`.

---

## Branching Strategy

```
main        production — only accepts PRs from develop (or hotfix/*)
develop     active integration branch — all feature work targets here
feature/*   individual feature branches cut from develop
fix/*       bug fix branches
hotfix/*    emergency fixes cut from main, merged to main + develop
```

**Rules:**
- Never commit directly to `main` or `develop`
- Feature branches must be up-to-date with `develop` before opening a PR
- PRs to `main` require a passing `develop` PR first (except hotfixes)

---

## Commit Standards

Format: `<type>: <short description>`

| Type | Use for |
|------|---------|
| `feat:` | New user-facing feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring without behavior change |
| `test:` | Test additions or changes only |
| `chore:` | Dependencies, config, tooling, non-code |
| `docs:` | Documentation only |
| `perf:` | Performance improvement |
| `security:` | Security fix or hardening |

**Message focus:** the *why*, not the *what*. The diff shows what changed; the commit message explains why.

```
# Good
fix: correct interest_rate /100 division missing in LoansService

# Bad
fix: update loans.ts
```

Atomic commits preferred — one logical change per commit.

---

## PR Requirements

Every PR must include:

- **Summary:** what changed and why (1–3 bullet points)
- **Test plan:** what was tested, what edge cases were considered
- **Migration notes:** if the PR includes schema migrations, describe the change and any data impact
- **Security considerations:** does this change touch auth, RLS, tokens, or user data?
- **Breaking changes:** if any API contracts, types, or behavior changed

### PR Size

Keep PRs focused. A PR that touches the financial math layer, the API layer, and 3 UI components is too large. Split by layer boundary or domain.

### Review Requirements

- At least one reviewer approval before merge to `develop`
- CI must pass (typecheck + tests + coverage thresholds)
- No new `as any` casts without an explanatory comment (they accumulate and hide schema drift)

---

## Testing Requirements

### Coverage Thresholds

| Package | Required |
|---------|----------|
| `@stashflow/core` | 90% lines/functions/branches |
| `@stashflow/api` | 70% |
| `apps/web` | 20% |

### What Must Be Tested

**Financial math (`@stashflow/core`):** Every function must have sad-path tests:
- Null/undefined inputs
- Zero values (zero income, zero debt, zero principal)
- Negative numbers
- Invalid date strings
- Empty arrays

**API queries (`@stashflow/api`):** Mock Supabase at the client level — no real DB calls in unit tests.

**UI components:** Snapshot or interaction tests for stateful components (drawers, forms with validation, two-step confirms).

### Running Tests

```bash
pnpm test                                    # all packages
pnpm test --filter=@stashflow/core           # single package
pnpm test:coverage --filter=@stashflow/core  # with coverage report

# Single test file
cd packages/core
pnpm exec vitest run src/__tests__/math/dti.test.ts
```

### E2E Tests

Playwright. Runs only on PRs to `develop` (not on every push — saves CI minutes).

```bash
cd apps/web
pnpm exec playwright test
```

---

## Code Standards

### TypeScript

- `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`
- No `as any` — fix the underlying type issue instead
- `exactOptionalPropertyTypes` requires conditional spread for optional props: `{...(x !== undefined ? { prop: x } : {})}`
- Array index access is `T | undefined` — always null-check or use `?.`

### Architecture Rules (enforced — do not violate)

| Package | Can import | Cannot import |
|---------|-----------|---------------|
| `@stashflow/core` | nothing | everything |
| `@stashflow/api` | core, supabase-js | ui, Next.js internals |
| `apps/web` | api, ui, theme | react-native |
| `apps/mobile` | core, ui, theme | api, next |
| `supabase/functions` | @stashflow/core (Deno workspace) | api, ui |

### SOLID

- Classes accept dependencies as constructor parameters — never `new` inside
- Domain types in `packages/core/src/schema/index.ts` — not in math or utility modules
- Each feature module in `apps/web/modules/<feature>/` exposes only `index.ts` as public API
- No cross-feature imports: `modules/loans` cannot import from `modules/transactions`

### Comments

Write comments only when the *why* is non-obvious — a hidden constraint, a workaround, a subtle invariant. Never describe what code does. Never reference the current task or PR.

```typescript
// Divide by 100: DB stores interest_rate as percentage (12 = 12%); math expects decimal (0.12)
annualInterestRate: loan.interest_rate / 100
```

### RSC vs Client Components

Default to React Server Components. Add `'use client'` only at the boundary where:
- State or effects are needed
- Browser APIs are used
- Lucide icons are imported (functions cannot cross RSC→client boundary)

---

## Security Guidelines

- All validation server-side — frontend input is untrusted
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or client components
- User-facing edge functions use user JWT only — never service role
- Never commit `.env` files or secrets
- New tables must have RLS enabled before shipping
- Delete account and other admin operations must validate user identity (prevent IDOR)

Before merging any PR that touches auth, RLS, or financial data: review the Security Checklist in `docs/SECURITY.md`.

---

## Documentation Requirements

When your PR ships a significant feature, update:

- `docs/CHANGELOG.md` — add a versioned entry with Added/Changed/Fixed sections
- `CLAUDE.md` — update feature status table if applicable
- `docs/ARCHITECTURE.md` — if you changed system boundaries, data flows, or added a new pattern
- `docs/DATA_MODEL.md` — if you added or changed a table, column, or enum
- `docs/DECISIONS.md` — if you made a non-obvious architectural choice that future contributors should understand (ADR format)
- `docs/API.md` — if you added or changed an API method or edge function
- `docs/SECURITY.md` — if you changed auth, RLS, or security-relevant behavior

Documentation is part of the PR, not a follow-up.

---

## Monorepo Commands Reference

```bash
pnpm install                     # install all workspace deps
pnpm dev                         # run all apps in parallel
pnpm build                       # full production build
pnpm test                        # all tests
pnpm lint                        # lint all packages
turbo run typecheck              # typecheck all packages

pnpm db:start                    # start local Supabase
pnpm db:stop                     # stop Supabase containers
pnpm db:reset                    # wipe + reapply all migrations
pnpm gen:types                   # regenerate TypeScript types from schema

pnpm supabase migration new <name>   # create a new migration file
```
