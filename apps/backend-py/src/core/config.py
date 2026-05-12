"""
Configuration Module for StashFlow Backend.

This module defines the global settings and environment variables for the 
FastAPI backend and background workers using Pydantic Settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Global application settings loaded from environment variables.

    Attributes:
        model_config (SettingsConfigDict): Pydantic settings configuration.
        GROQ_API_KEY (str | None): API key for Groq AI provider.
        GEMINI_API_KEY (str | None): API key for Gemini AI provider.
        SENTRY_DSN (str | None): DSN for Sentry error tracking.
        ENVIRONMENT (str): Deployment environment (e.g., "production", "development").
        REDIS_URL (str): Connection string for the Redis instance.
        QUEUE_NAME (str): Name of the background task queue.
        SUPABASE_URL (str | None): Public URL for the Supabase project.
        SUPABASE_SERVICE_ROLE_KEY (str | None): Service role key for Supabase admin access.
        WEBHOOK_SECRET (str): Shared secret for validating incoming webhooks.
        DEFAULT_AI_MODEL (str): The default AI model to use for extractions.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # AI Provider Keys
    GROQ_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    # Observability
    SENTRY_DSN: str | None = None
    ENVIRONMENT: str = "development"

    # Redis Queue
    REDIS_URL: str = "redis://localhost:6379/0"
    QUEUE_NAME: str = "stashflow-ingestion"

    # Supabase (for downloading files in background and calling webhooks)
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    WEBHOOK_SECRET: str = "dev-secret-123"

    # Default AI Model
    DEFAULT_AI_MODEL: str = "groq/llama-3.3-70b-versatile"

settings = Settings()
