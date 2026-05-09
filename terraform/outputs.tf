output "supabase_project_id" {
  value = supabase_project.stashflow.id
}

output "supabase_api_url" {
  value = "https://${supabase_project.stashflow.id}.supabase.co"
}

output "vercel_project_url" {
  value = "https://${vercel_project.web_app.name}.vercel.app"
}
