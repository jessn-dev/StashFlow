# StashFlow Python Backend

This is the Python Intelligence Layer for StashFlow as outlined in the integration strategy. It provides specialized services for document processing, OCR, and AI extraction using FastAPI, PyMuPDF, and uv.

## Prerequisites

- [uv](https://github.com/astral-sh/uv) (fast Python package manager)
- Python 3.14
- **Tesseract OCR** (for scanned document support)
- **Poppler** (for PDF-to-image conversion)

### Local Prerequisite Installation (macOS)

```bash
brew install tesseract poppler
```

## Setup

```bash
cd apps/backend-py
uv sync
```

## Environment Configuration

Create a `.env` file in `apps/backend-py/` to configure your AI providers:

```env
# At least one of these is required for structured extraction
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Optional: Override the default model
# DEFAULT_AI_MODEL=groq/llama-3.3-70b-versatile
```

## Running the Development Server

```bash
uv run uvicorn src.main:app --reload --port 8000
```

Or via Turborepo from the root:

```bash
pnpm dev --filter @stashflow/backend-py
```

## Running via Docker

```bash
docker build -t stashflow-backend-py .
docker run -p 8008:8000 stashflow-backend-py
```
