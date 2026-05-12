"""
Logging Configuration Module for StashFlow.

This module sets up structured logging using the structlog library, providing 
consistent JSON output in production and human-readable output in development. 
It also integrates with ASGI correlation IDs for request tracing.
"""
import logging
import sys
from typing import Any
import structlog
from asgi_correlation_id import CorrelationIdFilter
from .config import settings

def setup_logging():
    """
    Configures structlog for structured JSON logging.

    The configuration includes:
    - Injecting correlation IDs into log records.
    - Adding log levels and timestamps.
    - Switching between JSON and Console rendering based on the environment.
    - Bridging the standard library logging to structlog.
    """
    # 1. Standard library logging setup
    # This filter injects the correlation_id from asgi-correlation-id into standard log records
    cid_filter = CorrelationIdFilter(uuid_length=32)
    
    # Handlers
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(cid_filter)
    
    # 2. Structlog setup
    processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if settings.ENVIRONMENT == "production":
        # JSON output for production
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Pretty-printed output for development
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Bridge standard logging to structlog if needed (optional)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

def get_logger(name: str):
    """
    Creates and returns a structured logger instance.

    Args:
        name (str): The name of the logger, typically __name__.

    Returns:
        structlog.BoundLogger: A configured structlog logger.
    """
    return structlog.get_logger(name)
