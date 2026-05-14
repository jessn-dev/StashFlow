"""
Transaction Endpoints for StashFlow.

This module provides API endpoints for managing and processing financial 
transactions, including AI-powered categorization of bank statement descriptions.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.schemas.financial import TransactionCategorizationSchema
from src.core.config import settings
from src.core.logger import get_logger
from src.core.ai import client

router = APIRouter()
logger = get_logger(__name__)

class CategorizationRequest(BaseModel):
    """
    Schema for a transaction categorization request.
    
    Attributes:
        description (str): The raw transaction text from a bank statement 
            (e.g., "Starbucks Manila").
        amount (Optional[float]): Optional transaction amount to provide 
            additional context to the AI.
    """
    description: str
    amount: Optional[float] = None

@router.post("/categorize", response_model=TransactionCategorizationSchema)
async def categorize_transaction(request: CategorizationRequest) -> TransactionCategorizationSchema:
    """
    Categorizes a transaction description into a financial category using AI.
    
    This endpoint uses a Large Language Model to map messy bank statement text 
    to a structured taxonomy. It returns the best-fit category along with 
    a confidence score and justification.

    Args:
        request (CategorizationRequest): The request containing transaction details.

    Returns:
        TransactionCategorizationSchema: The AI-determined category and confidence metadata.

    Raises:
        HTTPException: 400 if the description is empty, or 500 if the AI 
            service fails or returns invalid data.
    """
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty.")

    logger.info("categorize_transaction_start", description=request.description, amount=request.amount)

    try:
        # PSEUDOCODE: AI Categorization Flow
        # 1. Prepare the input prompt by combining the description and optional amount.
        # 2. Instruct the model to act as a financial bookkeeper.
        # 3. Request a structured response that maps to the TransactionCategorizationSchema.
        # 4. Post-process the response: log warnings for low-confidence results.
        
        context_description = f"Categorize this transaction: '{request.description}'"
        if request.amount:
            context_description += f" with amount {request.amount}"

        extraction = await client.chat.completions.create(
            model=settings.DEFAULT_AI_MODEL,
            response_model=TransactionCategorizationSchema,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert financial bookkeeper. Categorize the given bank transaction description into one of the provided categories. Be precise. If you are unsure, use 'other'. Provide a short reasoning for your choice."
                },
                {
                    "role": "user",
                    "content": context_description
                }
            ]
        )
        
        # STRATEGIC LOGGING: We flag low-confidence results for potential human review 
        # or future model fine-tuning. 0.4 is our current threshold for "uncertainty".
        if extraction.confidence < 0.4:
            logger.warning(
                "ai_low_confidence_transaction", 
                description=request.description, 
                category=extraction.category, 
                confidence=extraction.confidence
            )

        logger.info("categorize_transaction_success", category=extraction.category, confidence=extraction.confidence)
        return extraction

    except Exception as e:
        logger.error("categorize_transaction_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to categorize transaction: {str(e)}")
