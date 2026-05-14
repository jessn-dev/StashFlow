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
#   db:clean                  Stop and remove ALL Docker containers, images, volumes, and networks
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

# Suppress Node.js experimental warnings (e.g. loading ESM via require)
export NODE_NO_WARNINGS=1

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

wait_for_port() {
  local port=$1
  local timeout=${2:-30}
  local count=0
  while ! nc -z localhost "$port" >/dev/null 2>&1; do
    if [ "$count" -ge "$timeout" ]; then
      return 1
    fi
    sleep 1
    ((count++))
  done
  return 0
}

check_docker_conflicts() {
  if ! command -v docker &>/dev/null; then return 0; fi
  
  local conflicts=()
  
  # 1. Port-based check (Running containers)
  local ports=(54321 54322 54323 8000 8008 6379)
  for port in "${ports[@]}"; do
    local cid
    cid=$(docker ps -q --filter "publish=$port")
    if [ -n "$cid" ]; then conflicts+=("$cid"); fi
  done

  # 2. Broad Name/Label Sweep (All containers, including stopped/orphaned)
  # We search names and labels for 'StashFlow' to catch analytics, kong, and other sidecars
  local sweep_cids
  sweep_cids=$(docker ps -a --format '{{.ID}} {{.Names}} {{.Labels}}' | grep -i "StashFlow" | awk '{print $1}')
  if [ -n "$sweep_cids" ]; then
    for cid in $sweep_cids; do
      conflicts+=("$cid")
    done
  fi

  if [ ${#conflicts[@]} -gt 0 ]; then
    info "Found conflicting container(s). Performing deep environment reset..."
    # Deduplicate container IDs
    local unique_conflicts
    unique_conflicts=$(echo "${conflicts[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' ')
    for cid in $unique_conflicts; do
      local cname
      cname=$(docker inspect --format='{{.Name}}' "$cid" 2>/dev/null | sed 's/^\///') || cname="unknown"
      info "Force removing: $cname ($cid)..."
      docker stop "$cid" >/dev/null 2>&1 || true
      docker rm -f "$cid" >/dev/null 2>&1 || true
    done
    success "Environment cleared."
  fi
}

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

require_uv() {
  command -v uv &>/dev/null || {
    info "uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
  }
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

# ── JWT helper ────────────────────────────────────────────────────────────────
# Generates a local dev service_role JWT signed with the running Postgres JWT secret.
# Outputs the JWT string; exits non-zero on failure.
gen_dev_jwt() {
  require_node
  local jwt_secret
  jwt_secret=$(psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -t -c \
    "SELECT current_setting('app.settings.jwt_secret', true);" 2>/dev/null | tr -d ' \n') \
    || { error "Cannot reach local Postgres — is Supabase running?"; return 1; }
  [ -z "$jwt_secret" ] && { error "app.settings.jwt_secret not set in local database."; return 1; }

  JWT_SECRET="$jwt_secret" node -e "
    const header  = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const payload = Buffer.from(JSON.stringify({iss:'supabase-demo',role:'service_role',exp:1983812996})).toString('base64url');
    const crypto  = require('crypto');
    const sig     = crypto.createHmac('sha256', process.env.JWT_SECRET).update(header+'.'+payload).digest('base64url');
    console.log(header+'.'+payload+'.'+sig);
  "
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
  echo -e "    start:all                  Full stack: logging + db + env + py:worker + dev"
  echo -e "    dev                        Start all dev servers via Turbo"
  echo -e "    dev web                    Start web app only"
  echo -e "    dev mobile                 Start mobile app only (Expo)"
  echo ""
  echo -e "  ${CYAN}Database (Supabase)${RESET}"
  echo -e "    db:start                   Start local Supabase instance (Docker)"
  echo -e "    db:stop                    Stop local Supabase instance"
  echo -e "    db:reset                   Drop + reapply migrations + seed data"
  echo -e "    db:clean                   Stop and remove ALL Docker containers, images, volumes, and networks"
  echo -e "    db:functions               Serve Edge Functions locally with .env loading"
  echo -e "    db:status                  Show service URLs and running status"
  echo -e "    db:port <port>             Change the Supabase API port (config.toml)"
  echo -e "    env:init                   Create missing .env files; inject keys if Supabase running"
  echo -e "    db:env                     Overwrite .env files with current local Supabase keys"
  echo -e "    db:jwt                     Regenerate dev service_role JWT and update pg_net trigger"
  echo -e "    db:types                   Regenerate TypeScript types from local schema"
  echo -e "    db:backup                  Create a local logical backup of the development database"
  echo -e "    db:restore <file>          Restore a logical backup to the development database"
  echo -e "    db:flush                   Clear document cache (DELETE FROM documents) to force re-processing"

  echo -e "    db:shared                  Sync monorepo packages to Supabase _shared directory"
  echo -e "    schema:sync                Sync AI schemas from Python to TypeScript"
  echo ""

  echo -e "  ${CYAN}Logging (Sentry/GlitchTip)${RESET}"
  echo -e "    logging:start              Start local GlitchTip logging stack (Docker)"
  echo -e "    logging:stop               Stop local GlitchTip logging stack"
  echo ""

  echo -e "  ${CYAN}Python Backend${RESET}"
  echo -e "    py:api                     Start the Python FastAPI server locally (port 8008)"
  echo -e "    py:docker                  Build the Python backend Docker container for local testing"
  echo -e "    py:worker                  Start the Python background worker (RQ)"

  echo ""
  echo -e "  ${CYAN}Testing & Quality${RESET}"
  echo -e "    check:all                  Run ALL quality gates (typecheck, lint, tests + coverage)"
  echo -e "    lint                       Run ESLint across all packages"
  echo -e "    typecheck                  Run TypeScript typecheck across all packages"
  echo -e "    test                       Run all package unit tests"
  echo -e "    test <pkg>                 Run unit tests for one package (e.g. @stashflow/core)"
  echo -e "    test coverage              Run all unit tests with coverage (enforces thresholds)"
  echo -e "    test <pkg> coverage        Run coverage for one package"
  echo -e "    test:e2e                   Run Playwright E2E tests against local web server"
  echo -e "    py:check                   Run Python quality gates (ruff, mypy, pytest + coverage)"
  echo ""

  echo -e "  ${CYAN}Maintenance${RESET}"
    echo -e "    docker:clean               Stop and remove all project containers (Supabase + Python + Logging)"
    echo -e "    clean                      Remove build artifacts + stop & prune Supabase/Docker"
    echo -e "    shutdown                   Full cleanup: Stop all services, prune Docker, clear caches"
  echo ""
}

cmd_init() {
  require_node
  require_pnpm
  require_uv
  info "Initializing StashFlow monorepo..."
  pnpm install
  success "Workspace dependencies installed."

  if [ ! -d ".git" ]; then
    git init
    success "Git repository initialized."
  fi

  info "Validating local Supabase configuration..."
  require_supabase

  cmd_db_shared

  success "Initialization complete."
}

cmd_py_docker() {
  if ! command -v docker &>/dev/null; then
    die "Docker is required to build the container."
  fi
  info "Building Python backend Docker container..."
  docker build -t stashflow-backend-py ./apps/backend-py
  success "Docker image built: stashflow-backend-py"
}

cmd_py_api() {
  require_uv
  info "Starting Python API server (FastAPI) on port 8008..."
  cd apps/backend-py
  # We run on 0.0.0.0 so host.docker.internal can reach it from Edge Functions
  uv run uvicorn src.main:app --host 0.0.0.0 --port 8008 --reload
}

cmd_py_worker() {
  require_uv
  info "Starting Python background worker (RQ)..."
  cd apps/backend-py
  uv run python worker.py
}

cmd_logging_start() {
  if ! command -v docker &>/dev/null; then
    die "Docker is required for logging."
  fi
  info "Checking local logging stack (GlitchTip)..."
  # Use 'up -d' directly to ensure correct configuration (port mappings, etc.) is applied
  docker-compose -f docker-compose.logging.yml up -d
  success "Logging stack is running."
  info "GlitchTip: http://localhost:8000"
  info "Default SENTRY_DSN for local dev: http://local-public-key@localhost:8000/1"
}

cmd_logging_stop() {
  info "Stopping local logging stack..."
  docker-compose -f docker-compose.logging.yml stop
  success "Logging stack stopped."
}

cmd_dev() {
  local target=$1
  local clean=0

  # ── Automatic Conflict Resolution ─────────────────────────────────────────
  check_docker_conflicts

  # Support --clean flag or --clean as first arg
  if [[ "$target" == "--clean" ]]; then
    clean=1
    target=$2
  elif [[ "$2" == "--clean" ]]; then
    clean=1
  fi

  if [ $clean -eq 1 ]; then
    cmd_docker_clean
    info "Starting with a fresh Docker environment..."
  fi

  require_pnpm
  require_supabase

  # ── Preflight: Supabase must be running ───────────────────────────────────
  if ! supabase status &>/dev/null; then
    info "Supabase is not running. Starting it now..."
    cmd_db_start
  fi

  # ── Preflight: Flush document cache to force fresh AI logic ───────────────
  cmd_db_flush

  # ── Preflight: Logging must be running ─────────────────────────────────────
  cmd_logging_start

  # ── Preflight: Sync environment variables ──────────────────────────────────
  cmd_db_env

  # ── Redeploy: Sync schemas and shared packages for Edge Functions ──────────
  info "Redeploying local Edge Functions (Syncing shared logic)..."
  cmd_schema_sync

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

  # ── Refresh dev JWT in pg_net trigger ────────────────────────────────────
  cmd_db_jwt

  # ── Stop any stale edge function process ──────────────────────────────────
  if pkill -f "supabase functions serve" 2>/dev/null; then
    info "Stopped existing Edge Functions server."
    sleep 1
  fi

  info "Launching local Edge Functions server..."
  supabase functions serve \
    --env-file supabase/functions/.env \
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

cmd_start_all() {
  info "Launching full StashFlow development stack..."
  
  # 1. Start persistent services
  cmd_logging_start
  
  if ! supabase status &>/dev/null; then
    cmd_db_start
  fi
  
  cmd_db_env
  
  # 2. Ensure Redis is ready
  info "Waiting for Redis (6379) to be ready..."
  if ! wait_for_port 6379 15; then
    die "Redis failed to start on port 6379."
  fi
  
  # 3. Start Python API (Background)
  info "Starting Python API server (8008)..."
  (require_uv && cd apps/backend-py && uv run uvicorn src.main:app --host 0.0.0.0 --port 8008) &
  API_PID=$!
  
  # 4. Start Python Worker (Background)
  info "Starting Python background worker (RQ)..."
  (require_uv && cd apps/backend-py && uv run python worker.py) &
  WORKER_PID=$!
  
  # 5. Wait for Python API to be healthy
  info "Waiting for Python API to be healthy..."
  if ! wait_for_port 8008 20; then
    kill $API_PID $WORKER_PID 2>/dev/null || true
    die "Python API failed to start on port 8008."
  fi
  success "Python services are up."

  # Setup cleanup on exit
  trap "info 'Shutting down services...'; kill $API_PID $WORKER_PID 2>/dev/null || true; exit" EXIT INT TERM

  # 6. Hand over to the dev server (This is blocking)
  cmd_dev "$@"
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
    cmd_db_jwt
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
  upsert_env_var apps/web/.env.local NEXT_PUBLIC_SENTRY_DSN        "http://local-public-key@localhost:8000/1"
  success "Updated apps/web/.env.local"

  # ── Python Backend ────────────────────────────────────────────────────────
  touch apps/backend-py/.env
  upsert_env_var apps/backend-py/.env SUPABASE_URL                "http://127.0.0.1:54321"
  upsert_env_var apps/backend-py/.env SUPABASE_SERVICE_ROLE_KEY   "$service_key"
  upsert_env_var apps/backend-py/.env REDIS_URL                   "redis://127.0.0.1:6379/0"
  success "Updated apps/backend-py/.env"

  # ── Mobile ────────────────────────────────────────────────────────────────
  touch apps/mobile/.env
  upsert_env_var apps/mobile/.env EXPO_PUBLIC_SUPABASE_URL      "$api_url"
  upsert_env_var apps/mobile/.env EXPO_PUBLIC_SUPABASE_ANON_KEY "$anon_key"
  success "Updated apps/mobile/.env"

  # ── Edge functions ────────────────────────────────────────────────────────
  # Edge functions run inside Docker — must use Docker-internal Kong URL, not the host-mapped port
  touch supabase/functions/.env
  upsert_env_var supabase/functions/.env SUPABASE_URL         "http://supabase_kong_StashFlow:8000"
  upsert_env_var supabase/functions/.env SUPABASE_ANON_KEY    "$anon_key"
  upsert_env_var supabase/functions/.env PYTHON_BACKEND_URL  "http://host.docker.internal:8008"
  upsert_env_var supabase/functions/.env PARSE_LOAN_WEBHOOK_SECRET "dev-secret-123"
  success "Updated supabase/functions/.env"

  # ── Supabase CLI (Local Dev) ──────────────────────────────────────────────
  touch supabase/.env
  upsert_env_var supabase/.env SUPABASE_AUTH_EXTERNAL_GOOGLE_REDIRECT_URI "http://127.0.0.1:54321/auth/v1/callback"
  success "Updated supabase/.env"
}

cmd_db_jwt() {
  require_supabase
  info "Generating local dev service_role JWT..."

  local jwt
  jwt=$(gen_dev_jwt) || die "JWT generation failed."

  # Persist in functions .env so developers can inspect/copy it
  touch supabase/functions/.env
  upsert_env_var supabase/functions/.env DEV_SERVICE_ROLE_JWT "$jwt"
  success "Stored in supabase/functions/.env → DEV_SERVICE_ROLE_JWT"

  # Update the live pg_net trigger with the refreshed JWT
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -q -c "
    CREATE OR REPLACE FUNCTION public.tr_on_document_inserted()
    RETURNS TRIGGER AS \$\$
    BEGIN
      PERFORM
        net.http_post(
          url := 'http://supabase_edge_runtime_StashFlow:8081/parse-document',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-webhook-secret', 'dev-secret-123',
            'Authorization', 'Bearer $jwt'
          ),
          body := jsonb_build_object('record', row_to_json(NEW))
        );
      RETURN NEW;
    END;
    \$\$ LANGUAGE plpgsql SECURITY DEFINER;
  " || die "Failed to update pg_net trigger."

  success "pg_net trigger updated with fresh JWT."
}

cmd_db_types() {
  require_supabase
  info "Regenerating TypeScript types from local schema..."
  supabase gen types typescript --local | tail -n +2 > packages/core/src/schema/database.types.ts
  success "Types updated → packages/core/src/schema/database.types.ts"
}

cmd_db_backup() {
  require_supabase
  local filename="backup_$(date +%Y%m%d_%H%M%S).sql"
  info "Creating local logical backup: $filename..."
  supabase db dump --local -f "$filename"
  success "Backup created: $filename"
}

cmd_db_restore() {
  require_supabase
  local file=$1
  if [[ -z "$file" ]]; then
    die "Usage: ./setup.sh db:restore <filename.sql>"
  fi
  if [[ ! -f "$file" ]]; then
    die "Backup file not found: $file"
  fi
  warn "This will overwrite your local database data. Proceed? (y/n)"
  read -r confirm
  if [[ "$confirm" != "y" ]]; then
    die "Restore cancelled."
  fi
  info "Restoring backup from $file..."
  supabase db reset
  psql "postgres://postgres:postgres@localhost:54322/postgres" -f "$file"
  success "Database restored from $file."
}

cmd_db_flush() {
  require_supabase
  info "Flushing local document cache to force re-processing on next upload..."
  
  # Connect to local Postgres and nuke the documents table
  # We use the host-mapped port 54322
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -q -c "DELETE FROM public.documents;" \
    || die "Failed to connect to local database. Is Supabase running?"
    
  success "Document records cleared. Re-uploading files will now trigger fresh AI extraction."
}

cmd_db_shared() {
  info "Syncing shared monorepo packages to Supabase Edge Functions..."
  rm -rf supabase/functions/_shared/core supabase/functions/_shared/document-parser
  mkdir -p supabase/functions/_shared/core/src supabase/functions/_shared/document-parser/src
  cp -r packages/core/src/* supabase/functions/_shared/core/src/
  cp -r packages/document-parser/src/* supabase/functions/_shared/document-parser/src/
  cp packages/core/deno.json supabase/functions/_shared/core/ 2>/dev/null || true
  cp packages/document-parser/deno.json supabase/functions/_shared/document-parser/ 2>/dev/null || true
  success "Shared packages synchronized."
}

cmd_schema_sync() {
  info "Synchronizing schemas from Python to TypeScript..."
  pnpm --filter @stashflow/backend-py export:schema
  pnpm --filter @stashflow/document-parser gen:types
  cmd_db_shared
  success "Schema synchronization complete."
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
  pnpm typecheck
  success "Typecheck passed."
}

cmd_lint() {
  require_pnpm
  info "Linting all packages..."
  pnpm lint
  success "Linting passed."
}

cmd_py_check() {
  require_uv
  info "Running Python quality gates for backend-py..."
  cd apps/backend-py
  
  info "[1/3] Linting with Ruff..."
  uv run ruff check .
  
  info "[2/3] Typechecking with MyPy..."
  uv run mypy src
  
  info "[3/3] Running tests..."
  uv run pytest
  
  cd ../..
  success "Python quality gates passed."
}

cmd_check_all() {
  divider
  info "STARTING FULL MONOREPO QUALITY GATE"
  divider
  
  cmd_typecheck
  cmd_lint
  cmd_test coverage
  cmd_py_check
  
  if command -v supabase &>/dev/null; then
    info "Running database RLS tests..."
    supabase test db
  fi
  
  divider
  success "FULL QUALITY GATE PASSED"
  divider
}

cmd_docker_clean() {
  info "Stopping and removing all project containers..."
  
  if command -v supabase &>/dev/null; then
    supabase stop --no-backup 2>/dev/null || true
  fi

  # Stop and remove Python backend container
  docker stop stashflow-backend-py 2>/dev/null || true
  docker rm stashflow-backend-py 2>/dev/null || true

  # Stop and remove logging stack
  docker-compose -f docker-compose.logging.yml down 2>/dev/null || true

  if command -v docker &>/dev/null; then
    # Prune anything with 'supabase' or project labels
    local containers
    containers=$(docker ps -aq --filter "name=supabase" --filter "label=com.supabase.project=StashFlow")
    if [ -n "$containers" ]; then
      echo "$containers" | xargs docker rm -f 2>/dev/null || true
    fi
    success "Project containers cleaned."
  else
    warn "Docker not found — skipping container cleanup."
  fi
}

cmd_db_clean() {
  warn "This will stop and remove ALL Docker containers, images, volumes, and networks on this machine."
  read -p "   Continue? [y/N] " confirm
  [[ $confirm == [yY] ]] || { info "Cancelled."; return 0; }

  if ! command -v docker &>/dev/null; then
    warn "Docker not found — nothing to clean."
    return 0
  fi

  # 1. Graceful Supabase stop first (avoids data corruption in pg volumes)
  if command -v supabase &>/dev/null; then
    info "Stopping Supabase..."
    supabase stop --no-backup 2>/dev/null || true
  fi

  # 2. Stop logging stack
  docker-compose -f docker-compose.logging.yml down 2>/dev/null || true

  # 3. Stop and remove ALL containers
  info "Stopping all containers..."
  local containers
  containers=$(docker ps -aq)
  if [ -n "$containers" ]; then
    echo "$containers" | xargs docker stop 2>/dev/null || true
    echo "$containers" | xargs docker rm -f 2>/dev/null || true
  fi

  # 4. Remove ALL images
  info "Removing all images..."
  local images
  images=$(docker images -q)
  if [ -n "$images" ]; then
    echo "$images" | xargs docker rmi -f 2>/dev/null || true
  fi

  # 5. Prune volumes and networks
  info "Pruning volumes and networks..."
  docker volume prune -f 2>/dev/null || true
  docker network prune -f 2>/dev/null || true

  success "All Docker containers, images, volumes, and networks removed."
}

cmd_clean() {
  info "Cleaning monorepo build artifacts..."
  find . -type d -name ".next"       -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name "dist"        -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name ".turbo"      -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name "coverage"    -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name "node_modules"                              -exec rm -rf {} + 2>/dev/null || true
  success "Build artifacts removed."

  cmd_db_clean

  success "Workspace fully clean. Run ./setup.sh install to rebuild."
}

cmd_shutdown() {
  warn "This will perform a FULL CLEANUP: stopping all services, pruning Docker, and clearing all caches."
  read -p "   Are you sure? [y/N] " confirm
  if [[ $confirm == [yY] ]]; then
    cmd_clean
    info "Pruning Docker system..."
    docker system prune -f --volumes
    info "Clearing pnpm store..."
    pnpm store prune
    success "Full shutdown and cleanup complete."
  else
    info "Shutdown cancelled."
  fi
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

  if [ ! -f "supabase/.env" ]; then
    if [ -f "supabase/.env.example" ]; then
      cp supabase/.env.example supabase/.env
      info "Created supabase/.env from .env.example"
    else
      touch supabase/.env
      info "Created supabase/.env"
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

  # Edge functions run inside Docker — must use Docker-internal Kong URL, not the host-mapped port
  upsert_env_var supabase/functions/.env SUPABASE_URL      "http://supabase_kong_StashFlow:8000"
  upsert_env_var supabase/functions/.env SUPABASE_ANON_KEY "$anon_key"
  upsert_env_var supabase/functions/.env SENTRY_DSN        "http://local-public-key@localhost:8000/1"
  success "Updated supabase/functions/.env"

  # ── Supabase CLI (Local Dev) ──────────────────────────────────────────────
  upsert_env_var supabase/.env SUPABASE_AUTH_EXTERNAL_GOOGLE_REDIRECT_URI "http://127.0.0.1:54321/auth/v1/callback"
  success "Updated supabase/.env"

  success "All env files ready."
}

# ── Dispatcher ────────────────────────────────────────────────────────────────

case "$1" in
  init)         cmd_init ;;
  start:all)    shift; cmd_start_all "$@" ;;
  dev)          cmd_dev "$2" ;;
  install)      cmd_install ;;
  add)          shift; cmd_add "$@" ;;
  db:start)     cmd_db_start ;;
  db:stop)      supabase stop ;;
  db:reset)     cmd_db_reset ;;
  db:clean)     cmd_db_clean ;;
  db:functions) cmd_db_functions ;;
  db:status)    cmd_db_status ;;
  db:port)      cmd_db_port "$2" ;;
  env:init)     cmd_env_init ;;
  db:env)       cmd_db_env ;;
  db:jwt)       cmd_db_jwt ;;
  db:types)     cmd_db_types ;;
  db:backup)    cmd_db_backup ;;
  db:restore)   cmd_db_restore "$2" ;;
  db:flush)     cmd_db_flush ;;
  db:shared)    cmd_db_shared ;;
  schema:sync)  cmd_schema_sync ;;
  py:docker)    cmd_py_docker ;;
  py:api)       cmd_py_api ;;
  py:worker)    cmd_py_worker ;;
  py:check)     cmd_py_check ;;
  logging:start) cmd_logging_start ;;
  logging:stop)  cmd_logging_stop ;;
  docker:clean) cmd_docker_clean ;;
  test)         cmd_test "$2" "$3" ;;
  test:e2e)     cmd_test_e2e ;;
  lint)         cmd_lint ;;
  typecheck)    cmd_typecheck ;;
  check:all)    cmd_check_all ;;
  clean)        cmd_clean ;;
  shutdown)     cmd_shutdown ;;
  help|*)       cmd_help ;;
esac
