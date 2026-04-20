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
#   test [coverage]           Run web unit tests (optional: with coverage)
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

# ── Resolve project root (the directory this script lives in) ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Prerequisite checks ───────────────────────────────────────────────────────
require_node() {
  command -v node &>/dev/null || die "Node.js is required but not installed.\n   Install Node.js v22.x LTS → https://nodejs.org/"
  return 0
}

require_pnpm() {
  command -v pnpm &>/dev/null || {
    info "Installing pnpm..."
    npm install -g pnpm@10.33.0
  }
  return 0
}

require_supabase() {
  command -v supabase &>/dev/null || die "Supabase CLI is required but not installed.\n   Install via brew: brew install supabase/tap/supabase"
  return 0
}

# Injects OAuth credentials from apps/web/.env.local into the current shell session.
# This allows the Supabase CLI to use them during 'start' or 'reset' as defined in config.toml.
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
  echo -e "    dev                        Start web + mobile dev servers + edge functions"
  echo ""
  echo -e "  ${CYAN}Database (Supabase)${RESET}"
  echo -e "    db:start                   Start local Supabase instance (Docker)"
  echo -e "    db:stop                    Stop local Supabase instance"
  echo -e "    db:reset                   Drop + reapply migrations + seed data"
  echo -e "    db:functions               Serve Edge Functions locally with .env loading"
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

  # Kill any existing edge functions server so new code is picked up
  if pkill -f "supabase functions serve" 2>/dev/null; then
    info "Stopped existing Edge Functions server."
    sleep 1
  fi

  # Start local edge functions in background
  info "Launching local Edge Functions server..."
  supabase functions serve --env-file supabase/functions/.env --no-verify-jwt &
  FUNC_PID=$!

  # Ensure functions are killed on exit
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
  supabase functions serve --env-file supabase/functions/.env --no-verify-jwt
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
  info "Injecting local keys into workspace .env files..."
  
  local status=$(supabase status -o json)
  local anon_key=$(echo $status | grep -o '"anon_key": "[^"]*' | cut -d'"' -f4)
  local service_key=$(echo $status | grep -o '"service_role_key": "[^"]*' | cut -d'"' -f4)
  local api_url=$(echo $status | grep -o '"api_url": "[^"]*' | cut -d'"' -f4)

  # Update Web
  if [ -f "apps/web/.env.local" ]; then
    sed -i '' "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$api_url|" apps/web/.env.local
    sed -i '' "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" apps/web/.env.local
    sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$service_key|" apps/web/.env.local
    success "Updated apps/web/.env.local"
  fi

  # Update Mobile
  if [ -f "apps/mobile/.env" ]; then
    sed -i '' "s|^EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=$api_url|" apps/mobile/.env
    sed -i '' "s|^EXPO_PUBLIC_SUPABASE_ANON_KEY=.*|EXPO_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" apps/mobile/.env
    success "Updated apps/mobile/.env"
  fi
}

cmd_db_types() {
  require_supabase
  info "Regenerating TypeScript types..."
  supabase gen types typescript local > packages/core/src/types/database.types.ts
  success "Types updated in packages/core/src/types/database.types.ts"
}

cmd_test() {
  require_pnpm
  if [ "$1" == "coverage" ]; then
    info "Running tests with coverage reporting..."
    pnpm run test:coverage
  else
    info "Running web unit tests..."
    pnpm --filter web test
  fi
}

cmd_clean() {
  info "Cleaning monorepo build artifacts..."
  find . -type d -name ".next" -exec rm -rf {} +
  find . -type d -name "dist" -exec rm -rf {} +
  find . -type d -name ".turbo" -exec rm -rf {} +
  find . -type d -name "node_modules" -exec rm -rf {} +
  success "Workspace clean. Run ./setup.sh install to rebuild."
}

# ── Dispatcher ────────────────────────────────────────────────────────────────

case "$1" in
  init)         cmd_init ;;
  dev)          cmd_dev "$2" ;;
  install)      cmd_install ;;
  db:start)     cmd_db_start ;;
  db:stop)      supabase stop ;;
  db:reset)     cmd_db_reset ;;
  db:functions) cmd_db_functions ;;
  db:status)    cmd_db_status ;;
  db:port)      cmd_db_port "$2" ;;
  db:env)       cmd_db_env ;;
  db:types)     cmd_db_types ;;
  test)         cmd_test "$2" ;;
  clean)        cmd_clean ;;
  help|*)       cmd_help ;;
esac
