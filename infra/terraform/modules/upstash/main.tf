# Upstash Module: Manages Redis instances for queueing and caching.

variable "database_name" {
  description = "The display name for the Upstash Redis database."
  type        = string
}

variable "region" {
  description = "The Upstash region. Default is Singapore."
  type        = string
  default     = "ap-southeast-1"
}

# Provisions a serverless Redis database with TLS enabled.
resource "upstash_redis_database" "this" {
  name   = var.database_name
  region = var.region
  tls    = true
}

output "redis_url" {
  description = "The full Redis connection string (redis://...). Handle as sensitive."
  value       = "redis://:${upstash_redis_database.this.password}@${upstash_redis_database.this.endpoint}:${upstash_redis_database.this.port}"
  sensitive   = true
}

output "redis_host" {
  description = "The Redis endpoint hostname."
  value       = upstash_redis_database.this.endpoint
}

output "redis_port" {
  description = "The Redis connection port."
  value       = upstash_redis_database.this.port
}

output "redis_password" {
  description = "The Redis authentication password."
  value       = upstash_redis_database.this.password
  sensitive   = true
}
