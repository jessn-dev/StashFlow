# Test Environment: Main entry point for the StashFlow MVP 'test' environment.
# This file orchestrates the individual modules into a coherent infrastructure stack.

terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.8"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.2"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
  }
}

# --- Provider Configurations ---
# Tokens are passed as sensitive variables to avoid leakage in logs.

provider "supabase" {
  access_token = var.supabase_access_token
}

provider "vercel" {
  api_token = var.vercel_api_token
  team_id   = var.vercel_team_id
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

# --- Variable Definitions ---

variable "supabase_access_token" { type = string; sensitive = true }
variable "supabase_organization_id" { type = string }
variable "vercel_api_token" { type = string; sensitive = true }
variable "vercel_team_id" { type = string; default = null }
variable "upstash_email" { type = string }
variable "upstash_api_key" { type = string; sensitive = true }
variable "db_password" { type = string; sensitive = true }
variable "google_client_id" { type = string }
variable "google_client_secret" { type = string; sensitive = true }
variable "github_repo" { type = string }

# --- Module Instantiations ---

# 1. Backend: Supabase project + Auth + Storage
module "supabase" {
  source               = "../../modules/supabase"
  organization_id      = var.supabase_organization_id
  project_name         = "StashFlow-test"
  db_password          = var.db_password
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
}

# 2. Queue & Cache: Upstash Redis database
module "upstash" {
  source        = "../../modules/upstash"
  database_name = "stashflow-test-redis"
}

# 3. Frontend: Vercel project with automatic secrets injection
# This links all backend resources together into the runtime environment.
# Note: For MVP, we use Native Logs (Supabase Logs + Vercel Analytics/Logs).
module "vercel" {
  source       = "../../modules/vercel"
  project_name = "stashflow-web-test"
  github_repo  = var.github_repo
  
  environment_variables = {
    "NEXT_PUBLIC_SUPABASE_URL"      = module.supabase.supabase_url
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = module.supabase.anon_key
    "UPSTASH_REDIS_REST_URL"        = module.upstash.redis_url
  }
}

# --- Outputs ---
# These values are useful for CI/CD pipelines or manual verification.

output "supabase_project_id" { 
  description = "Project ID for CLI link commands."
  value       = module.supabase.project_id 
}

output "vercel_project_url" { 
  description = "The live deployment URL for the test environment."
  value       = module.vercel.url 
}

output "redis_url" { 
  description = "The Redis connection URL for worker configuration."
  value       = module.upstash.redis_url
  sensitive   = true 
}
