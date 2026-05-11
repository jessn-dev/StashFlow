from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
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

    # Default AI Model
    DEFAULT_AI_MODEL: str = "groq/llama-3.3-70b-versatile"

settings = Settings()
