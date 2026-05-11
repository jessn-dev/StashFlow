import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from asgi_correlation_id import CorrelationIdMiddleware
import sentry_sdk
from .api.router import api_router
from .core.config import settings
from .core.logger import setup_logging, get_logger

# 1. Setup Structured Logging
setup_logging()
logger = get_logger(__name__)

# --- ARCHITECTURAL INTEGRITY WARNING ---
# Rule 1: This service MUST NOT persist financial truth. No database connections allowed.
# Rule 2: Deterministic financial logic (amortization, DTI, etc.) MUST remain in TypeScript.
# This layer is for PROBABILISTIC enrichment (AI/OCR/ML) only.
# See docs/python_integration.md for details.
# ----------------------------------------

# 2. Setup Error Tracking (Sentry)
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=1.0 if settings.ENVIRONMENT != "production" else 0.1,
    )

app = FastAPI(
    title="StashFlow Python API",
    description="Python Intelligence Layer for StashFlow",
    version="0.1.0",
)

# 3. Middleware Integration
app.add_middleware(CorrelationIdMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Injects mandatory security headers into every response.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Middleware to log request details and timing.
    """
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    # Log the interaction
    logger.info(
        "http_interaction",
        path=request.url.path,
        method=request.method,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "stashflow-python-ai"}
