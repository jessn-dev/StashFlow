"""
Main entry point for the StashFlow Python Intelligence Layer.

This service provides AI-driven financial insights, document parsing, and transaction 
enrichment. It is designed as a stateless, probabilistic layer that complements 
the deterministic TypeScript core.

Architectural Rules:
1. No Database Persistence: This service must remain stateless.
2. AI/ML Focus: Only probabilistic or complex OCR/ML tasks should reside here.
"""

import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from asgi_correlation_id import CorrelationIdMiddleware
import sentry_sdk
from .api.router import api_router
from .core.config import settings
from .core.logger import setup_logging, get_logger

# 1. Setup Structured Logging (JSON format for production ELK/Grafana)
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
        # Sample 100% in non-prod for debugging; 10% in prod to save quota.
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
    allow_origins=["*"],  # TODO: Restrict to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    """
    Injects mandatory security headers into every outgoing response.

    Args:
        request (Request): The incoming HTTP request.
        call_next (Callable): The next middleware or endpoint in the stack.

    Returns:
        Response: The modified response with security headers applied.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    """
    Middleware to log request details, completion status, and execution timing.

    Args:
        request (Request): The incoming HTTP request.
        call_next (Callable): The next middleware or endpoint in the stack.

    Returns:
        Response: The response from the downstream handler.
    """
    # PSEUDOCODE: Request Logging Flow
    # 1. Record the current system time at the start of the request.
    # 2. Wait for the downstream handlers to process the request and return a response.
    # 3. Calculate the delta between start and end time.
    # 4. Emit a structured log entry containing path, method, status, and duration.
    
    start_time = time.time()
    
    response = await call_next(request)
    
    duration_seconds = time.time() - start_time
    
    logger.info(
        "http_interaction",
        path=request.url.path,
        method=request.method,
        status_code=response.status_code,
        duration_ms=round(duration_seconds * 1000, 2),
    )
    
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """
    Simple health check endpoint for monitoring and container probes.
    """
    return {"status": "ok", "service": "stashflow-python-ai"}

