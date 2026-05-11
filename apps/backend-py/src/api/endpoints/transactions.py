from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import instructor
from litellm import completion
from src.schemas.financial import TransactionCategorizationSchema
from src.core.config import settings
from src.core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Patch litellm with instructor
client = instructor.from_litellm(completion)

class CategorizationRequest(BaseModel):
    description: str
    amount: float | None = None

@router.post("/categorize", response_model=TransactionCategorizationSchema)
async def categorize_transaction(request: CategorizationRequest):
    """
    Categorizes a transaction description into a financial category using AI.
    """
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty.")

    logger.info("categorize_transaction_start", description=request.description, amount=request.amount)

    try:
        extraction = client.chat.completions.create(
            model=settings.DEFAULT_AI_MODEL,
            response_model=TransactionCategorizationSchema,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert financial bookkeeper. Categorize the given bank transaction description into one of the provided categories. Be precise. If you are unsure, use 'other'. Provide a short reasoning for your choice."
                },
                {
                    "role": "user",
                    "content": f"Categorize this transaction: '{request.description}'" + (f" with amount {request.amount}" if request.amount else "")
                }
            ]
        )
        
        if extraction.confidence < 0.4:
            logger.warning("ai_low_confidence_transaction", description=request.description, category=extraction.category, confidence=extraction.confidence)

        logger.info("categorize_transaction_success", category=extraction.category, confidence=extraction.confidence)
        return extraction
    except Exception as e:
        logger.error("categorize_transaction_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to categorize transaction: {str(e)}")
