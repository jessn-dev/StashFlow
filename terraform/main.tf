# 1. Supabase Project
resource "supabase_project" "stashflow" {
  organization_id = var.supabase_organization_id
  name            = "StashFlow-${var.environment}"
  region          = "ap-southeast-1" # Singapore
  db_pass         = var.db_password
}

# 2. Supabase Auth Configuration (Google OAuth)
# Note: Some provider versions use a single settings resource
resource "supabase_auth_config" "google" {
  project_ref = supabase_project.stashflow.id
  
  external_google_enabled       = true
  external_google_client_id     = var.google_client_id
  external_google_secret        = var.google_client_secret
  external_google_redirect_uri  = "https://${supabase_project.stashflow.id}.supabase.co/auth/v1/callback"
}

# 3. Vercel Project
resource "vercel_project" "web_app" {
  name      = "stashflow-web-${var.environment}"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  root_directory = "apps/web"
  
  # Ensure pnpm is used
  install_command = "cd ../.. && pnpm install"
}

# 4. Sync Supabase Keys to Vercel Environment Variables
resource "vercel_project_environment_variable" "supabase_url" {
  project_id = vercel_project.web_app.id
  key        = "NEXT_PUBLIC_SUPABASE_URL"
  value      = "https://${supabase_project.stashflow.id}.supabase.co"
  target     = ["preview", "production"]
}

resource "vercel_project_environment_variable" "supabase_anon_key" {
  project_id = vercel_project.web_app.id
  key        = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  value      = supabase_project.stashflow.anon_key
  target     = ["preview", "production"]
}

# Add other required variables here (e.g., service role, Google ID, etc.)
