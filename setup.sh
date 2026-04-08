#!/usr/bin/env bash
# =============================================================================
# FinTrack Developer CLI
# =============================================================================
# Usage: ./setup.sh <command> [options]
#
# Commands:
#   init                      First-time monorepo scaffold (run once)
#   dev [web|mobile]          Start dev servers (default: all via Turbo)
#   install                   Install / refresh all workspace dependencies
#   add <pkg> [-w <workspace>] Add a package to the monorepo or a workspace
#   db:start                  Start local Supabase (Docker)
#   db:stop                   Stop local Supabase
#   db:reset                  Reset DB — reapply all migrations + seed data
#   db:status                 Show running Supabase service URLs & ports
#   db:port <port>            Change the local Supabase API port
#   db:env                    Update workspace .env files with local Supabase keys
#   db:types                  Regenerate TypeScript types from local schema
#   test [coverage]           Run web unit tests (optional: with coverage)
#   clean                     Remove all build caches and generated output
#   help                      Show this message
# =============================================================================

set -e

# ── Colours ──────────────────────────────────────────────────────────────────
# ... (rest of colors)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}▶  $*${RESET}"; }
success() { echo -e "${GREEN}✔  $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; }
error()   { echo -e "${RED}✖  $*${RESET}" >&2; }
die()     { error "$*"; exit 1; }
divider() { echo -e "${BOLD}────────────────────────────────────────────────────────${RESET}"; }

# ── Resolve project root (the directory this script lives in) ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Prerequisite checks ───────────────────────────────────────────────────────
require_node() {
  command -v node &>/dev/null || die "Node.js is required but not installed.\n   Install Node.js v22.x LTS → https://nodejs.org/"
}

require_pnpm() {
  if ! command -v pnpm &>/dev/null; then
    warn "pnpm not found — installing via corepack..."
    corepack enable && corepack prepare pnpm@latest --activate 2>/dev/null || \
      curl -fsSL https://get.pnpm.io/install.sh | sh -
    # Reload PATH for this session
    [[ "$OSTYPE" == "darwin"* ]] && export PNPM_HOME="$HOME/Library/pnpm" \
                                 || export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
    command -v pnpm &>/dev/null || die "pnpm installation failed. Re-run after sourcing your shell profile."
  fi
}

require_supabase() {
  if ! command -v supabase &>/dev/null; then
    die "Supabase CLI not found.\n   Install: brew install supabase/tap/supabase\n   Docs:    https://supabase.com/docs/guides/cli/getting-started"
  fi
}

# ── Commands ──────────────────────────────────────────────────────────────────

cmd_help() {
  divider
  echo -e "${BOLD}  FinTrack Developer CLI${RESET}"
  divider
  echo ""
  echo -e "  ${BOLD}Usage:${RESET} ./setup.sh <command> [options]"
  echo ""
  echo -e "  ${CYAN}Project${RESET}"
  echo -e "    init                       First-time monorepo scaffold (run once)"
  echo -e "    install                    Install / refresh all workspace dependencies"
  echo -e "    add <pkg> [-w <workspace>] Add a package to root or a specific workspace"
  echo ""
  echo -e "  ${CYAN}Development${RESET}"
  echo -e "    dev                        Start web + mobile dev servers (via Turbo)"
  echo -e "    dev web                    Start only the web app  (localhost:3000)"
  echo -e "    dev mobile                 Start only the mobile app (port 8081)"
  echo ""
  echo -e "  ${CYAN}Database (Supabase)${RESET}"
  echo -e "    db:start                   Start local Supabase instance (Docker)"
  echo -e "    db:stop                    Stop local Supabase instance"
  echo -e "    db:reset                   Drop + reapply migrations + seed data"
  echo -e "    db:status                  Show service URLs and running status"
  echo -e "    db:port <port>             Change the Supabase API port (config.toml)"
  echo -e "    db:env                     Update .env files with current local keys"
  echo -e "    db:types                   Regenerate TypeScript types from local schema"
  echo ""
  echo -e "  ${CYAN}Testing${RESET}"
  echo -e "    test                       Run web unit tests (Vitest)"
  echo -e "    test coverage              Run tests and generate a coverage report"
  echo ""
  echo -e "  ${CYAN}Maintenance${RESET}"
  echo -e "    clean                      Remove .next, dist, .turbo build caches"
  echo ""
  echo -e "  ${CYAN}Workspaces${RESET} (for ${BOLD}add${RESET} command -w flag)"
  echo -e "    web | mobile | core | api | ui"
  echo ""
  divider
}

cmd_init() {
  require_node
  require_pnpm

  info "Node $(node -v) · pnpm $(pnpm -v)"
  divider
  info "Initialising FinTrack monorepo..."

  pnpm init
  npm pkg set private=true
  npm pkg set packageManager="pnpm@10.33.0"

  cat <<EOF > pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
EOF

  mkdir -p apps packages

  info "Installing root dev dependencies..."
  pnpm add -wD turbo@latest typescript@latest @types/node@latest

  info "Scaffolding Next.js web app..."
  cd apps
  pnpm dlx create-next-app@15 web \
    --typescript --tailwind --eslint --app \
    --src-dir false --import-alias "@/*" --use-pnpm --yes

  info "Scaffolding Expo mobile app..."
  pnpm dlx create-expo-app@latest mobile \
    --template expo-template-blank-typescript --yes
  cd ..

  info "Scaffolding internal packages..."
  cd packages
  for pkg in core ui api; do
    mkdir -p "$pkg/src"
    cd "$pkg"
    pnpm init
    npm pkg set name="@fintrack/$pkg" version="0.1.0" main="src/index.ts"
    touch src/index.ts
    cd ..
  done
  pnpm --filter @fintrack/api add @supabase/supabase-js@latest
  cd ..

  info "Writing Turborepo pipeline..."
  cat <<EOF > turbo.json
{
  "\$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  { "dependsOn": ["^lint"] },
    "clean": { "cache": false }
  }
}
EOF

  npm pkg set scripts.dev="turbo run dev"
  npm pkg set scripts.build="turbo run build"
  npm pkg set scripts.lint="turbo run lint"

  info "Linking workspace dependencies..."
  pnpm install

  divider
  success "Scaffold complete!"
  warn "If pnpm was just installed, reload your shell before continuing:"
  echo "     source ~/.zshrc   (zsh)  |  source ~/.bash_profile  (bash)"
  echo ""
  info "Next: run './setup.sh db:start' then './setup.sh dev'"
  divider
}

cmd_install() {
  require_pnpm
  info "Installing all workspace dependencies..."
  pnpm install
  success "Done."
}

cmd_add() {
  require_pnpm

  local pkg="$1"
  local workspace=""
  local dev_flag=""
  shift || true

  # Parse flags
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -w|--workspace) workspace="$2"; shift 2 ;;
      -D|--dev) dev_flag="-D"; shift ;;
      *) die "Unknown option: $1" ;;
    esac
  done

  [[ -z "$pkg" ]] && die "Usage: ./setup.sh add <package-name> [-w <workspace>] [-D|--dev]"

  if [[ -z "$workspace" ]]; then
    info "Adding '$pkg' to root workspace..."
    pnpm add -w $dev_flag "$pkg"
  else
    # Map shorthand name to full filter name
    case "$workspace" in
      web)    filter="web" ;;
      mobile) filter="mobile" ;;
      core)   filter="@fintrack/core" ;;
      api)    filter="@fintrack/api" ;;
      ui)     filter="@fintrack/ui" ;;
      *)      die "Unknown workspace '$workspace'. Valid: web, mobile, core, api, ui" ;;
    esac
    info "Adding '$pkg' to workspace '$filter'..."
    pnpm add --filter "$filter" $dev_flag "$pkg"
  fi
  success "Package '$pkg' added."
}

cmd_dev() {
  require_pnpm
  local target="${1:-}"

  case "$target" in
    web)
      info "Starting web app → http://localhost:3000"
      pnpm --filter web dev
      ;;
    mobile)
      info "Starting mobile app (Expo) → port 8081"
      pnpm --filter mobile dev
      ;;
    "")
      info "Starting all dev servers (web + mobile) via Turbo..."
      pnpm dev
      ;;
    *)
      die "Unknown target '$target'. Use: dev, dev web, dev mobile"
      ;;
  esac
}

cmd_db_start() {
  require_supabase
  info "Starting local Supabase (Docker)..."
  supabase start
  success "Supabase is running. Studio → http://localhost:54323"
  cmd_db_env
}

cmd_db_stop() {
  require_supabase
  info "Stopping local Supabase..."
  supabase stop
  success "Supabase stopped."
}

cmd_db_env() {
  require_supabase
  info "Fetching Supabase status..."
  
  # Capture output of status
  local status_output
  status_output=$(supabase status)

  # Parse values
  local api_url
  local anon_key
  
  api_url=$(echo "$status_output" | grep "API URL" | awk '{print $NF}')
  anon_key=$(echo "$status_output" | grep "anon key" | awk '{print $NF}')

  if [[ -z "$api_url" || -z "$anon_key" ]]; then
    error "Could not extract Supabase URL or Anon Key. Ensure Supabase is running."
    return 1
  fi

  # Update Web app .env.local
  if [[ -f "apps/web/.env.local" ]]; then
    sed -i '' "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$api_url|" apps/web/.env.local
    sed -i '' "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" apps/web/.env.local
    info "Updated apps/web/.env.local"
  else
    cat <<EOF > apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=$api_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key
EOF
    info "Created apps/web/.env.local"
  fi

  # Update Mobile app .env (using its own prefix if appropriate, or as user requested)
  if [[ -f "apps/mobile/.env" ]]; then
    # Looking at our previous read, it used EXPO_PUBLIC_ prefix
    sed -i '' "s|^EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=$api_url|" apps/mobile/.env
    sed -i '' "s|^EXPO_PUBLIC_SUPABASE_ANON_KEY=.*|EXPO_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" apps/mobile/.env
    info "Updated apps/mobile/.env"
  fi

  success "Environment files updated."
}

cmd_db_reset() {
  require_supabase
  divider
  warn "This will DROP all local data, reapply migrations, and re-seed."
  read -r -p "   Continue? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }
  divider
  info "Resetting database..."
  supabase db reset
  success "Database reset complete. Test user: test@fintrack.com / password123"
}

cmd_db_status() {
  require_supabase
  info "Supabase service status:"
  supabase status
}

cmd_db_port() {
  local port="${1:-}"
  [[ -z "$port" ]] && die "Usage: ./setup.sh db:port <port-number>"

  info "Setting local Supabase API port to $port..."

  # Update config.toml
  if [[ -f "supabase/config.toml" ]]; then
    # Using sed to find the port line under [api]
    # This matches the first occurrence of port = after [api]
    sed -i '' "/\[api\]/,/port =/ s/port = .*/port = $port/" supabase/config.toml
    success "API port updated in supabase/config.toml."
    warn "Restart Supabase ('db:stop' then 'db:start') for changes to take effect."
  else
    error "supabase/config.toml not found."
    return 1
  fi
}

cmd_db_types() {
  require_supabase
  local output_path="packages/core/src/types/database.types.ts"
  info "Generating TypeScript types from local schema..."
  supabase gen types typescript --local > "$output_path"
  success "Types written to $output_path"
}

cmd_test() {
  require_pnpm
  local mode="${1:-}"
  case "$mode" in
    coverage)
      info "Running tests with coverage..."
      pnpm --filter web test:coverage
      ;;
    "")
      info "Running unit tests..."
      pnpm --filter web test
      ;;
    *)
      die "Unknown test mode '$mode'. Use: test  |  test coverage"
      ;;
  esac
}

cmd_clean() {
  require_pnpm
  info "Cleaning build artefacts and caches..."

  # Next.js build output
  rm -rf apps/web/.next apps/web/out

  # Package dist output
  find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

  # TypeScript incremental build info
  find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete

  # Turbo cache
  rm -rf .turbo

  # Vitest coverage
  rm -rf apps/web/coverage

  success "Clean complete."
}

# ── Main dispatcher ────────────────────────────────────────────────────────────
COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  init)        cmd_init ;;
  install)     cmd_install ;;
  add)         cmd_add "$@" ;;
  dev)         cmd_dev "$@" ;;
  db:start)    cmd_db_start ;;
  db:stop)     cmd_db_stop ;;
  db:reset)    cmd_db_reset ;;
  db:status)   cmd_db_status ;;
  db:port)     cmd_db_port "$@" ;;
  db:env)      cmd_db_env ;;
  db:types)    cmd_db_types ;;
  test)        cmd_test "$@" ;;
  clean)       cmd_clean ;;
  help|--help|-h) cmd_help ;;
  *)           error "Unknown command: '$COMMAND'"; echo ""; cmd_help; exit 1 ;;
esac
