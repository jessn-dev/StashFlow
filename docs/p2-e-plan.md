P2-E: Extract packages/db + packages/auth

Context

Supabase client creation is fragmented across 4 locations with no shared abstraction:
- packages/api/src/client.ts — plain createClient for tests/Node
- apps/web/lib/supabase/client.ts — createBrowserClient (SSR-aware)
- apps/web/lib/supabase/server.ts — createServerClient with Next.js cookie handling
- apps/mobile/src/lib/supabase/client.ts — createClient with SecureStore adapter

Plus 3 dead files in apps/web/utils/supabase/ (unused, 0 imports).

Auth: every dashboard RSC repeats a 3-line getUser → redirect guard. No shared helper.

Goal: one typed package per concern, apps become thin wrappers.

 ---
New Dependency Hierarchy

@stashflow/core     → (nothing)
@stashflow/theme    → (nothing)
@stashflow/db       → core, supabase-js, supabase-ssr
@stashflow/auth     → core, supabase-js   (takes SupabaseClient as param — no dep on db)
@stashflow/api      → core, supabase-js, db
@stashflow/ui       → theme
apps/web            → api, ui, theme, db, auth
apps/mobile         → core, ui, theme, db (mobile subpath only)
supabase/functions  → core (_shared only)

 ---
Package 1: packages/db

Purpose: Typed Supabase client factories, one per platform. Apps read env vars and call the factory — no env var access inside the package.

File structure

packages/db/
├── package.json
├── tsconfig.json
└── src/
├── index.ts      # re-exports createNodeClient + SupabaseTypedClient type
├── node.ts       # createNodeClient(url, anonKey) — pure supabase-js, no platform deps
├── browser.ts    # createBrowserClient(url, anonKey) — @supabase/ssr createBrowserClient
├── server.ts     # createServerClient(url, anonKey, cookies) — @supabase/ssr, cookie interface injected
└── mobile.ts     # createMobileClient(url, anonKey, storage) — pure supabase-js, storage adapter injected

Note: No middleware.ts subpath — middleware client in apps/web/middleware.ts is single-use and Next.js-specific enough to stay inlined.

packages/db/package.json (key fields)

{
"name": "@stashflow/db",
"version": "0.1.0",
"description": "Typed Supabase client factories — platform-specific subpath exports",
"main": "./src/index.ts",
"exports": {
".":         "./src/index.ts",
"./browser":  "./src/browser.ts",
"./server":   "./src/server.ts",
"./mobile":   "./src/mobile.ts"
},
"dependencies": {
"@stashflow/core": "workspace:*",
"@supabase/supabase-js": "^2.104.1",
"@supabase/ssr": "^0.10.2"
}
}

src/node.ts

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export function createNodeClient(url: string, anonKey: string): SupabaseClient<Database> {
return createClient<Database>(url, anonKey)
}
Replaces packages/api/src/client.ts (current: createStashFlowClient(config: ClientConfig)).

src/browser.ts

import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from '@stashflow/core'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createBrowserClient(url: string, anonKey: string): SupabaseClient<Database> {
return _createBrowserClient<Database>(url, anonKey)
}

src/server.ts

import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@stashflow/core'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ServerCookieHandlers {
get(name: string): string | undefined
set(name: string, value: string, options: CookieOptions): void
remove(name: string, options: CookieOptions): void
}

export function createServerClient(
url: string,
anonKey: string,
cookies: ServerCookieHandlers,
): SupabaseClient<Database> {
return _createServerClient<Database>(url, anonKey, { cookies })
}

src/mobile.ts

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export interface MobileStorageAdapter {
getItem(key: string): string | null | Promise<string | null>
setItem(key: string, value: string): void | Promise<void>
removeItem(key: string): void | Promise<void>
}

export function createMobileClient(
url: string,
anonKey: string,
storage: MobileStorageAdapter,
): SupabaseClient<Database> {
return createClient<Database>(url, anonKey, {
auth: { storage: storage as any, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
})
}
Storage adapter stays in apps/mobile — keeps expo-secure-store out of the package.

src/index.ts

export { createNodeClient } from './node'
export type { SupabaseClient } from '@supabase/supabase-js'

 ---
Package 2: packages/auth

Purpose: Auth helpers for web/Node. Takes an injected SupabaseClient — never creates clients itself.

File structure

packages/auth/
├── package.json
├── tsconfig.json
└── src/
├── index.ts
└── server.ts   # getUser(client) → User | null

packages/auth/package.json (key fields)

{
"name": "@stashflow/auth",
"version": "0.1.0",
"description": "Auth session helpers — web/Node. No client creation; takes injected SupabaseClient.",
"main": "./src/index.ts",
"exports": { ".": "./src/index.ts" },
"dependencies": {
"@stashflow/core": "workspace:*",
"@supabase/supabase-js": "^2.104.1"
}
}

src/server.ts

import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@stashflow/core'

export async function getUser(client: SupabaseClient<Database>): Promise<User | null> {
const { data: { user } } = await client.auth.getUser()
return user
}

src/index.ts

export { getUser } from './server'

 ---
Migration — Files Changed

packages/api

packages/api/src/client.ts — replace body:
// Before: own createClient wrapper
// After:
export { createNodeClient as createStashFlowClient } from '@stashflow/db'
export type { ClientConfig } from './client.types'  // move interface if needed, or drop it
Or simpler — just inline the import in index.ts and delete client.ts entirely if createStashFlowClient is only used internally.

packages/api/package.json — add "@stashflow/db": "workspace:*" to dependencies.

apps/web

apps/web/lib/supabase/client.ts — becomes thin wrapper:
import { createBrowserClient } from '@stashflow/db/browser'
export function createClient() {
return createBrowserClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
}

apps/web/lib/supabase/server.ts — becomes thin wrapper:
import { createServerClient } from '@stashflow/db/server'
import { cookies } from 'next/headers'
export async function createClient() {
const cookieStore = await cookies()
return createServerClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{
get: (name) => cookieStore.get(name)?.value,
set: (name, value, options) => { try { cookieStore.set({ name, value, ...options }) } catch {} },
remove: (name, options) => { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
},
)
}

apps/web/utils/supabase/ — DELETE entire directory (client.ts, server.ts, middleware.ts — 0 imports confirmed).

apps/web/app/dashboard/layout.tsx — replace inline getUser:
// Before:
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

// After:
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@stashflow/auth'
const supabase = await createClient()
const user = await getUser(supabase)
if (!user) redirect('/login')

apps/web/package.json — add "@stashflow/db": "workspace:*" and "@stashflow/auth": "workspace:*".

apps/web/middleware.ts — NO CHANGE. Single-use; pattern already works.

apps/mobile

apps/mobile/src/lib/supabase/client.ts — replace body:
import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
│ apps/mobile                                                                                                                             │
│                                                                                                                                         │
│ apps/mobile/src/lib/supabase/client.ts — replace body:                                                                                  │
│ import 'react-native-url-polyfill/auto'                                                                                                 │
│ import * as SecureStore from 'expo-secure-store'                                                                                        │
│ import { createMobileClient } from '@stashflow/db/mobile'                                                                               │
│                                                                                                                                         │
│ export const supabase = createMobileClient(                                                                                             │
│   process.env.EXPO_PUBLIC_SUPABASE_URL!,                                                                                                │
│   process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,                                                                                           │
│   {                                                                                                                                     │
│     getItem: SecureStore.getItemAsync,                                                                                                  │
│     setItem: SecureStore.setItemAsync,                                                                                                  │
│     removeItem: SecureStore.deleteItemAsync,                                                                                            │
│   },                                                                                                                                    │
│ )                                                                                                                                       │
│                                                                                                                                         │
│ apps/mobile/package.json — add "@stashflow/db": "workspace:*".                                                                          │
│                                                                                                                                         │
│ docs/CLAUDE.md — dependency table                                                                                                       │
│                                                                                                                                         │
│ Add two rows:                                                                                                                           │
│ | `@stashflow/db`   | core, supabase-js, supabase-ssr | ui, api, next        |                                                          │
│ | `@stashflow/auth` | core, supabase-js               | ui, api, db, next    |                                                          │
│                                                                                                                                         │
│ Update Current milestone section and web feature status.                                                                                │
│                                                                                                                                         │
│ ---                                                                                                                                     │
│ Critical Files                                                                                                                          │
│                                                                                                                                         │
│ ┌────────────────────────────────────────┬─────────────────────────────────────────────────────┐                                        │
│ │                  File                  │                       Action                        │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ packages/db/                           │ CREATE (4 src files + package.json + tsconfig.json) │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ packages/auth/                         │ CREATE (2 src files + package.json + tsconfig.json) │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ packages/api/src/client.ts             │ MODIFY (use @stashflow/db)                          │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ packages/api/package.json              │ MODIFY (add @stashflow/db dep)                      │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/web/lib/supabase/client.ts        │ MODIFY (use @stashflow/db/browser)                  │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/web/lib/supabase/server.ts        │ MODIFY (use @stashflow/db/server)                   │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/web/utils/supabase/               │ DELETE (3 files, dead code)                         │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/web/app/dashboard/layout.tsx      │ MODIFY (use getUser from @stashflow/auth)           │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/web/package.json                  │ MODIFY (add db + auth deps)                         │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/mobile/src/lib/supabase/client.ts │ MODIFY (use @stashflow/db/mobile)                   │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ apps/mobile/package.json               │ MODIFY (add @stashflow/db dep)                      │                                        │
│ ├────────────────────────────────────────┼─────────────────────────────────────────────────────┤                                        │
│ │ docs/CLAUDE.md                         │ MODIFY (dependency table + milestone)               │                                        │
│ └────────────────────────────────────────┴─────────────────────────────────────────────────────┘                                        │
│                                                                                                                                         │
│ ---                                                                                                                                     │
│ Verification                                                                                                                            │
│                                                                                                                                         │
│ pnpm install                                                                                                                            │
│ turbo run typecheck          # must pass all packages                                                                                   │
│ pnpm test --filter=@stashflow/api   # existing tests still pass                                                                         │
│ pnpm test --filter=@stashflow/db    # (no tests yet — add later)                                                                        │
│                                                                                                                                         │
│ Manual check: grep -r "from '@stashflow/db'" apps/ packages/ — confirm imports resolve correctly.