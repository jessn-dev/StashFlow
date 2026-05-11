FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies for OCR and PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Create non-root user
RUN groupadd -r appgroup && useradd -r -m -g appgroup appuser

# Change ownership of /app to appuser
RUN chown -R appuser:appgroup /app

# Switch to non-privileged user
USER appuser

# Copy project files
COPY --chown=appuser:appgroup pyproject.toml uv.lock ./

# Install dependencies
# We use --frozen to ensure we use the lockfile exactly
RUN uv sync --frozen --no-dev

# Copy source code
COPY --chown=appuser:appgroup src/ ./src/

# Run the application
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
