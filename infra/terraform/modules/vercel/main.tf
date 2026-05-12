# Vercel Module: Configures the frontend deployment and environment variables.

variable "project_name" {
  description = "The name of the project in Vercel."
  type        = string
}

variable "github_repo" {
  description = "The full GitHub repository name (e.g., 'org/repo') for continuous deployment."
  type        = string
}

variable "environment_variables" {
  description = "A map of key-value pairs to be injected as environment variables in Vercel (e.g., Supabase URLs, Redis keys)."
  type        = map(string)
  default     = {}
}

# Defines the Vercel project and links it to the GitHub repository.
resource "vercel_project" "this" {
  name      = var.project_name
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  # Targeting the web application in the monorepo.
  root_directory = "apps/web"
  
  # Ensure dependencies are installed from the root using pnpm.
  install_command = "cd ../.. && pnpm install"
}

# Iterates over the environment_variables map to create individual Vercel env vars.
# This ensures that keys from Supabase, Upstash, etc., are automatically synced.
resource "vercel_project_environment_variable" "vars" {
  for_each = var.environment_variables
  
  project_id = vercel_project.this.id
  key        = each.key
  value      = each.value
  # We target both preview (PRs) and production environments for consistency.
  target     = ["preview", "production"]
}

output "project_id" {
  description = "The internal Vercel project ID."
  value       = vercel_project.this.id
}

output "url" {
  description = "The primary deployment URL for the project."
  value       = vercel_project.this.url
}
