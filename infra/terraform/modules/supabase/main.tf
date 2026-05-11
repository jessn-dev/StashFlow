# Supabase Module: Manages the core backend infrastructure including the project, auth, and storage.

variable "organization_id" {
  description = "The ID of the Supabase organization where the project will be created."
  type        = string
}

variable "project_name" {
  description = "The display name of the Supabase project."
  type        = string
}

variable "region" {
  description = "The physical region where the database will be hosted. Default is Singapore."
  type        = string
  default     = "ap-southeast-1"
}

variable "db_password" {
  description = "The master password for the Postgres database. Must be high entropy."
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Client ID for Google OAuth integration."
  type        = string
}

variable "google_client_secret" {
  description = "Client Secret for Google OAuth integration."
  type        = string
  sensitive   = true
}

# Creates the primary Supabase project instance.
resource "supabase_project" "this" {
  organization_id = var.organization_id
  name            = var.project_name
  region          = var.region
  db_pass         = var.db_password
}

# Configures Google OAuth as an external auth provider.
# This wires up the callback URL automatically based on the project ID.
resource "supabase_auth_config" "google" {
  project_ref = supabase_project.this.id
  
  external_google_enabled       = true
  external_google_client_id     = var.google_client_id
  external_google_secret        = var.google_client_secret
  external_google_redirect_uri  = "https://${supabase_project.this.id}.supabase.co/auth/v1/callback"
}

# Provisions the private storage bucket for user documents (PDFs, images).
# Security is handled via RLS policies defined in the database migrations.
resource "supabase_storage_bucket" "user_documents" {
  project_ref = supabase_project.this.id
  id          = "user_documents"
  public      = false
}

output "project_id" {
  description = "The unique reference ID for the Supabase project."
  value       = supabase_project.this.id
}

output "anon_key" {
  description = "The public 'anon' API key for client-side use."
  value       = supabase_project.this.anon_key
  sensitive   = true
}

output "service_role_key" {
  description = "The secret 'service_role' key for administrative operations. NEVER expose to client."
  value       = supabase_project.this.service_role_key
  sensitive   = true
}

output "supabase_url" {
  description = "The base URL for the Supabase project API."
  value       = "https://${supabase_project.this.id}.supabase.co"
}
