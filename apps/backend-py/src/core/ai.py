"""
AI Client Module for StashFlow.

This module initializes and provides a centralized AI client using the Instructor 
library to patch LiteLLM. This setup allows for structured data extraction 
from various AI providers (like Groq or Gemini) using Pydantic models.

Attributes:
    client (instructor.Instructor): The patched AI client for structured outputs.
"""
import instructor
from litellm import completion

client = instructor.from_litellm(completion)
