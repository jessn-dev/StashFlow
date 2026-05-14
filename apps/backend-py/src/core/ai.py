"""
AI Client Module for StashFlow.

This module initializes and provides a centralized AI client using the Instructor
library to patch LiteLLM. This setup allows for structured data extraction
from various AI providers (like Groq or Gemini) using Pydantic models.

Attributes:
    client (instructor.AsyncInstructor): The async-patched AI client for structured outputs.
"""
import instructor
from litellm import acompletion

# acompletion is LiteLLM's async completion function — yields AsyncInstructor so
# all LLM HTTP calls are non-blocking and don't stall the FastAPI event loop.
client = instructor.from_litellm(acompletion)
