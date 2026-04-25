#!/usr/bin/env bash
# =============================================================================
# StashFlow Developer CLI
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
#   db:functions              Serve Edge Functions locally with .env loading
#   db:status                 Show running Supabase service URLs & ports
#   db:port <port>            Change the local Supabase API port
#   db:env                    Update workspace .env files with local Supabase keys
#   db:types                  Regenerate TypeScript types from local schema
#   test [pkg] [coverage]     Run tests (optional: filter by package name)
#   test:e2e                  Run Playwright E2E tests (requires web dev server)
#   typecheck                 Run TypeScript typecheck across all packages
#   clean                     Remove all build caches and generated output
#   help                      Show this message
# =============================================================================

set -e

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}▶  $*${RESET}"; return 0; }
success() { echo -e "${GREEN}✔  $*${RESET}"; return 0; }
warn()    { echo -e "${YELLOW}⚠  $*${RESET}"; return 0; }
error()   { echo -e "${RED}✖  $*${RESET}" >&2; return 0; }
die()     { error "$*"; exit 1; }
divider() { echo -e "${BOLD}────────────────────────────────────────────────────────${RESET}"; return 0; }

# ── Resolve project root ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Env helpers ───────────────────────────────────────────────────────────────
# Update key if present, append if missing
upsert_env_var() {
  local file=$1 key=$2 value=$3
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# ── Prerequisite checks ───────────────────────────────────────────────────────
require_node() {
  command -v node &>/dev/null || die "Node.js is required but not installed.\n   Install Node.js v22.x LTS → https://nodejs.org/"
  return 0
}

require_pnpm() {
  command -v pnpm &>/dev/null || {
    info "Installing pnpm..."
    npm install -g pnpm@10.33.2
  }
  return 0
}

require_supabase() {
  command -v supabase &>/dev/null || die "Supabase CLI is required but not installed.\n   Install via brew: brew install supabase/tap/supabase"
  return 0
}

load_supabase_env() {
  local env_file="apps/web/.env.local"
  if [ -f "$env_file" ]; then
    info "Injecting OAuth credentials from $env_file..."
    export GOOGLE_CLIENT_ID=$(grep '^GOOGLE_CLIENT_ID=' "$env_file" | cut -d '=' -f2)
    export GOOGLE_CLIENT_SECRET=$(grep '^GOOGLE_CLIENT_SECRET=' "$env_file" | cut -d '=' -f2)
    export APPLE_CLIENT_ID=$(grep '^APPLE_CLIENT_ID=' "$env_file" | cut -d '=' -f2)
    export SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=$(grep '^APPLE_SECRET=' "$env_file" | cut -d '=' -f2)
  else
    warn "No $env_file found. OAuth credentials may not be injected."
  fi
}

# ── Commands ──────────────────────────────────────────────────────────────────

cmd_help() {
  divider
  echo -e "${BOLD}  StashFlow Developer CLI${RESET}"
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
  echo -e "    dev                        Start all dev servers via Turbo"
  echo -e "    dev web                    Start web app only"
  echo -e "    dev mobile                 Start mobile app only (Expo)"
  echo ""
  echo -e "  ${CYAN}Database (Supabase)${RESET}"
  echo -e "    db:start                   Start local Supabase instance (Docker)"
  echo -e "    db:stop                    Stop local Supabase instance"
  echo -e "    db:reset                   Drop + reapply migrations + seed data"
  echo -e "    db:functions               Serve Edge Functions locally with .env loading"
  echo -e "    db:status                  Show service URLs and running status"
  echo -e "    db:port <port>             Change the Supabase API port (config.toml)"
  echo -e "    env:init                   Create missing .env files; inject keys if Supabase running"
  echo -e "    db:env                     Overwrite .env files with current local Supabase keys"
  echo -e "    db:types                   Regenerate TypeScript types from local schema"
  echo ""
  echo -e "  ${CYAN}Testing${RESET}"
  echo -e "    test                       Run all package unit tests"
  echo -e "    test <pkg>                 Run unit tests for one package (e.g. @stashflow/core)"
  echo -e "    test coverage              Run all unit tests with coverage (enforces thresholds)"
  echo -e "    test <pkg> coverage        Run coverage for one package"
  echo -e "    test:e2e                   Run Playwright E2E tests against local web server"
  echo -e "    typecheck                  TypeScript typecheck across all packages"
  echo ""
  echo -e "  ${CYAN}Maintenance${RESET}"
  echo -e "    clean                      Remove build artifacts + stop & prune Supabase/Docker"
  echo ""
}

cmd_init() {
  require_node
  require_pnpm
  info "Initializing StashFlow monorepo..."
  pnpm install
  success "Workspace dependencies installed."

  if [ ! -d ".git" ]; then
    git init
    success "Git repository initialized."
  fi

  info "Validating local Supabase configuration..."
  require_supabase

  success "Initialization complete."
}

cmd_dev() {
  local target=$1
  require_pnpm
  require_supabase

  # ── Preflight: Supabase must be running ───────────────────────────────────
  if ! supabase status &>/dev/null; then
    die "Supabase is not running. Start it first:\n   ./setup.sh db:start"
  fi

  # ── Preflight: edge function env must exist ────────────────────────────────
  if [ ! -f "supabase/functions/.env" ]; then
    die "supabase/functions/.env not found.\n   Create it from supabase/functions/.env.example or run ./setup.sh db:env"
  fi

  # ── Preflight: app env files ──────────────────────────────────────────────
  if [ "$target" != "mobile" ] && [ ! -f "apps/web/.env.local" ]; then
    warn "apps/web/.env.local not found. Run ./setup.sh db:env to generate it."
  fi
  if [ "$target" != "web" ] && [ ! -f "apps/mobile/.env" ]; then
    warn "apps/mobile/.env not found. Run ./setup.sh db:env to generate it."
  fi

  # ── Stop any stale edge function process ──────────────────────────────────
  if pkill -f "supabase functions serve" 2>/dev/null; then
    info "Stopped existing Edge Functions server."
    sleep 1
  fi

  info "Launching local Edge Functions server..."
  supabase functions serve \
    --env-file supabase/functions/.env \
    --import-map supabase/functions/import_map.json \
    --no-verify-jwt &
  FUNC_PID=$!

  trap "info 'Stopping Edge Functions...'; kill $FUNC_PID; exit" EXIT INT TERM

  if [ "$target" == "web" ]; then
    info "Starting Web application..."
    pnpm --filter web dev
  elif [ "$target" == "mobile" ]; then
    info "Starting Mobile application (Expo)..."
    pnpm --filter mobile dev
  else
    info "Starting all development servers via Turbo..."
    pnpm dev
  fi
}

cmd_install() {
  require_pnpm
  info "Syncing workspace dependencies..."
  pnpm install
  success "All packages up to date."
}

cmd_add() {
  require_pnpm
  local pkg=$1
  [ -z "$pkg" ] && die "Usage: ./setup.sh add <package> [-w <workspace>]"
  shift
  info "Adding $pkg..."
  pnpm add "$pkg" "$@"
  success "Added $pkg."
}

cmd_db_start() {
  require_supabase
  load_supabase_env
  info "Spinning up local Supabase stack..."
  supabase start
}

cmd_db_reset() {
  require_supabase
  load_supabase_env
  divider
  warn "This will DROP all local data, reapply migrations, and re-seed."
  read -p "   Continue? [y/N] " confirm
  if [[ $confirm == [yY] ]]; then
    info "Resetting database..."
    supabase db reset
    success "Database reset complete. Test user: test@stashflow.com / password123"
  else
    info "Reset cancelled."
  fi
}

cmd_db_functions() {
  require_supabase
  load_supabase_env
  info "Serving Edge Functions locally..."
  supabase functions serve \
    --env-file supabase/functions/.env \
    --import-map supabase/functions/import_map.json \
    --no-verify-jwt
}

cmd_db_status() {
  require_supabase
  supabase status
}

cmd_db_port() {
  local port=$1
  [ -z "$port" ] && die "Usage: ./setup.sh db:port <port_number>"
  sed -i '' "s/port = [0-9]*/port = $port/" supabase/config.toml
  success "Supabase API port updated to $port."
}

cmd_db_env() {
  require_supabase
  info "Reading local Supabase keys..."

  # Parse supabase status text output using │-delimited table format (CLI v2+)
  local sb_status
  sb_status=$(supabase status 2>&1) || die "Supabase is not running. Run ./setup.sh db:start first."

  local api_url anon_key service_key
  api_url=$(echo "$sb_status"     | grep "Project URL"              | awk -F'│' '{print $3}' | tr -d ' ')
  anon_key=$(echo "$sb_status"    | grep "Publishable"              | awk -F'│' '{print $3}' | tr -d ' ')
  service_key=$(echo "$sb_status" | grep -E "│ Secret[[:space:]]+│" | awk -F'│' '{print $3}' | tr -d ' ')

  if [ -z "$api_url" ] || [ -z "$anon_key" ]; then
    die "Could not parse Supabase status output. Is Supabase running?\n   Run ./setup.sh db:start"
  fi

  info "Injecting keys into workspace .env files..."

  # ── Web ───────────────────────────────────────────────────────────────────
  touch apps/web/.env.local
  upsert_env_var apps/web/.env.local NEXT_PUBLIC_SUPABASE_URL      "$api_url"
  upsert_env_var apps/web/.env.local NEXT_PUBLIC_SUPABASE_ANON_KEY "$anon_key"
  upsert_env_var apps/web/.env.local SUPABASE_SERVICE_ROLE_KEY     "$service_key"
  success "Updated apps/web/.env.local"

  # ── Mobile ────────────────────────────────────────────────────────────────
  touch apps/mobile/.env
  upsert_env_var apps/mobile/.env EXPO_PUBLIC_SUPABASE_URL      "$api_url"
  upsert_env_var apps/mobile/.env EXPO_PUBLIC_SUPABASE_ANON_KEY "$anon_key"
  success "Updated apps/mobile/.env"

  # ── Edge functions ────────────────────────────────────────────────────────
  touch supabase/functions/.env
  upsert_env_var supabase/functions/.env SUPABASE_URL      "$api_url"
  upsert_env_var supabase/functions/.env SUPABASE_ANON_KEY "$anon_key"
  success "Updated supabase/functions/.env"
}

cmd_db_types() {
  require_supabase
  info "Regenerating TypeScript types from local schema..."
  supabase gen types typescript --local > packages/core/src/schema/database.types.ts
  success "Types updated → packages/core/src/schema/database.types.ts"
}

cmd_test() {
  require_pnpm
  local arg1=$1
  local arg2=$2

  if [ "$arg1" == "coverage" ]; then
    info "Running all tests with coverage..."
    pnpm run test:coverage
    success "Coverage reports written to each package's coverage/ directory."
  elif [ -n "$arg1" ] && [ "$arg2" == "coverage" ]; then
    info "Running tests with coverage for $arg1..."
    turbo run test:coverage --filter="$arg1"
    success "Coverage report written to packages coverage/ directory."
  elif [ -n "$arg1" ]; then
    info "Running tests for $arg1..."
    turbo run test --filter="$arg1"
  else
    info "Running all package tests..."
    pnpm run test
  fi
}

cmd_test_e2e() {
  require_pnpm
  info "Running Playwright E2E tests..."
  pnpm --filter web exec playwright test
}

cmd_typecheck() {
  require_pnpm
  info "Typechecking all packages..."
  turbo run typecheck
  success "Typecheck passed."
}

cmd_clean() {
  info "Cleaning monorepo build artifacts..."
  find . -type d -name ".next"       -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name "dist"        -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name ".turbo"      -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name "coverage"    -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name "node_modules"                              -exec rm -rf {} + 2>/dev/null || true
  success "Build artifacts removed."

  # ── Docker / Supabase cleanup ─────────────────────────────────────────────
  if command -v supabase &>/dev/null; then
    info "Stopping Supabase containers..."
    supabase stop --no-backup 2>/dev/null || true
    success "Supabase containers stopped."
  fi

  if command -v docker &>/dev/null; then
    info "Pruning stopped Supabase Docker containers..."
    docker ps -a --filter "name=supabase" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true
    info "Pruning dangling Docker volumes..."
    docker volume ls --filter "name=supabase" --format "{{.Name}}" | xargs -r docker volume rm 2>/dev/null || true
    success "Docker cleanup complete."
  else
    warn "Docker not found — skipping container cleanup."
  fi

  success "Workspace fully clean. Run ./setup.sh install to rebuild."
}

cmd_env_init() {
  require_supabase
  local created=0

  # ── Create missing env files ───────────────────────────────────────────────
  if [ ! -f "apps/web/.env.local" ]; then
    touch apps/web/.env.local
    info "Created apps/web/.env.local"
    created=1
  fi

  if [ ! -f "apps/mobile/.env" ]; then
    touch apps/mobile/.env
    info "Created apps/mobile/.env"
    created=1
  fi

  if [ ! -f "supabase/functions/.env" ]; then
    if [ -f "supabase/functions/.env.example" ]; then
      cp supabase/functions/.env.example supabase/functions/.env
      info "Created supabase/functions/.env from .env.example"
    else
      touch supabase/functions/.env
      info "Created supabase/functions/.env"
    fi
    created=1
  fi

  [ $created -eq 0 ] && info "All .env files already present."

  # ── Inject keys if Supabase is running ────────────────────────────────────
  local sb_status
  if ! sb_status=$(supabase status 2>&1); then
    warn "Supabase not running — env files created without keys."
    warn "Run ./setup.sh db:start then ./setup.sh env:init again."
    return 0
  fi

  local api_url anon_key service_key
  api_url=$(echo "$sb_status"     | grep "Project URL"              | awk -F'│' '{print $3}' | tr -d ' ')
  anon_key=$(echo "$sb_status"    | grep "Publishable"              | awk -F'│' '{print $3}' | tr -d ' ')
  service_key=$(echo "$sb_status" | grep -E "│ Secret[[:space:]]+│" | awk -F'│' '{print $3}' | tr -d ' ')

  if [ -z "$api_url" ] || [ -z "$anon_key" ]; then
    warn "Could not parse Supabase keys — env files created but keys not injected."
    return 0
  fi

  info "Injecting Supabase keys into workspace .env files..."

  upsert_env_var apps/web/.env.local NEXT_PUBLIC_SUPABASE_URL      "$api_url"
  upsert_env_var apps/web/.env.local NEXT_PUBLIC_SUPABASE_ANON_KEY "$anon_key"
  upsert_env_var apps/web/.env.local SUPABASE_SERVICE_ROLE_KEY     "$service_key"
  success "Updated apps/web/.env.local"

  upsert_env_var apps/mobile/.env EXPO_PUBLIC_SUPABASE_URL      "$api_url"
  upsert_env_var apps/mobile/.env EXPO_PUBLIC_SUPABASE_ANON_KEY "$anon_key"
  success "Updated apps/mobile/.env"

  upsert_env_var supabase/functions/.env SUPABASE_URL      "$api_url"
  upsert_env_var supabase/functions/.env SUPABASE_ANON_KEY "$anon_key"
  success "Updated supabase/functions/.env"

  success "All env files ready."
}

# ── Dispatcher ────────────────────────────────────────────────────────────────

case "$1" in
  init)         cmd_init ;;
  dev)          cmd_dev "$2" ;;
  install)      cmd_install ;;
  add)          shift; cmd_add "$@" ;;
  db:start)     cmd_db_start ;;
  db:stop)      supabase stop ;;
  db:reset)     cmd_db_reset ;;
  db:functions) cmd_db_functions ;;
  db:status)    cmd_db_status ;;
  db:port)      cmd_db_port "$2" ;;
  env:init)     cmd_env_init ;;
  db:env)       cmd_db_env ;;
  db:types)     cmd_db_types ;;
  test)         cmd_test "$2" "$3" ;;
  test:e2e)     cmd_test_e2e ;;
  typecheck)    cmd_typecheck ;;
  clean)        cmd_clean ;;
  help|*)       cmd_help ;;
esac
