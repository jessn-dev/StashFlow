from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
import fitz  # PyMuPDF
import instructor
from litellm import completion
from src.schemas.financial import UnifiedDocumentResponse
from src.core.config import settings
from src.utils.ocr import extract_text_with_ocr
from src.core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Patch litellm with instructor
client = instructor.from_litellm(completion)

class DocumentExtractionResponse(BaseModel):
    text: str
    page_count: int
    success: bool
    method: str  # "standard" or "ocr"
    telemetry: dict | None = None

async def _get_text_from_pdf(content: bytes, password: str | None = None) -> tuple[str, int, str, dict]:
    """
    Helper to extract text from PDF with OCR fallback and password support.
    Returns (text, page_count, method, telemetry)
    """
    telemetry = {"standard_char_count": 0, "ocr_char_count": 0}
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        
        # Handle password protection
        if doc.needs_pass:
            if password:
                doc.authenticate(password)
            else:
                raise Exception("PDF is encrypted and requires a password")
                
        if doc.is_encrypted:
             raise Exception("Invalid password for encrypted PDF")

        page_count = len(doc)
        if page_count > 20:
             raise Exception(f"Document exceeds the 20-page safety limit (detected {page_count} pages). Please upload a smaller document.")

        text = ""
        for page in doc:
            text += page.get_text()

        telemetry["standard_char_count"] = len(text.strip())

        # Threshold for triggering OCR fallback (e.g., < 150 characters across entire doc)
        if len(text.strip()) < 150:
            logger.info("triggering_ocr_fallback", char_count=len(text.strip()), page_count=page_count)
            text = extract_text_with_ocr(content, password=password)
            telemetry["ocr_char_count"] = len(text.strip())
            return text, page_count, "ocr", telemetry
            
        return text, page_count, "standard", telemetry
    except Exception as e:
        logger.warning("fitz_extraction_failed", error=str(e))
        # If fitz fails entirely, try OCR
        try:
            text = extract_text_with_ocr(content, password=password)
            telemetry["ocr_char_count"] = len(text.strip())
            return text, 0, "ocr", telemetry
        except Exception as ocr_e:
            logger.error("all_extraction_methods_failed", standard_error=str(e), ocr_error=str(ocr_e))
            raise Exception(f"Both standard and OCR extraction failed. Standard: {str(e)}, OCR: {str(ocr_e)}")

@router.post("/extract", response_model=DocumentExtractionResponse)
async def extract_document_text(
    file: UploadFile = File(...),
    password: str | None = Form(None)
):
    """
    Extracts raw text from an uploaded PDF document with OCR fallback and password support.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    logger.info("extract_text_start", filename=file.filename)

    try:
        content = await file.read()
        
        # Enforce 10MB limit
        if len(content) > 10 * 1024 * 1024:
            logger.warning("file_size_limit_exceeded", filename=file.filename, size=len(content))
            raise HTTPException(status_code=413, detail="File is too large. Maximum allowed size is 10MB.")

        text, page_count, method, telemetry = await _get_text_from_pdf(content, password=password)
            
        logger.info("extract_text_success", method=method, page_count=page_count, text_length=len(text))
        
        return DocumentExtractionResponse(
            text=text,
            page_count=page_count,
            success=True,
            method=method,
            telemetry=telemetry
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("extract_text_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.post("/process", response_model=UnifiedDocumentResponse)
async def process_document(
    file: UploadFile = File(...),
    password: str | None = Form(None)
):
    """
    Unified endpoint that classifies and extracts data from any financial PDF.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    logger.info("process_document_start", filename=file.filename)

    try:
        content = await file.read()
        
        # Enforce 10MB limit
        if len(content) > 10 * 1024 * 1024:
            logger.warning("file_size_limit_exceeded", filename=file.filename, size=len(content))
            raise HTTPException(status_code=413, detail="File is too large. Maximum allowed size is 10MB.")

        text, _, method, telemetry = await _get_text_from_pdf(content, password=password)

        if not text.strip():
            logger.warning("no_text_extracted", method=method)
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF, even with OCR.")

        # 2. Use AI to classify and extract
        logger.info("unified_ai_extraction_start", model=settings.DEFAULT_AI_MODEL, text_length=len(text))
        extraction = client.chat.completions.create(
            model=settings.DEFAULT_AI_MODEL,
            response_model=UnifiedDocumentResponse,
            messages=[
                {
                    "role": "system",
                    "content": """You are an elite financial document classifier and analyst. 
                    1. First, classify the provided document as a LOAN contract or a BANK_STATEMENT.
                    2. If it is a LOAN, extract the loan details into the loan_data field.
                    3. If it is a BANK_STATEMENT, extract the transaction list into the statement_data field.
                    4. Provide a classification confidence score and reasoning.
                    
                    Be extremely precise with amounts and dates. Use negative numbers for expenses in statements."""
                },
                {
                    "role": "user",
                    "content": f"Analyze this document (Method: {method}):\n\n{text}"
                }
            ]
        )
        
        if extraction.confidence < 0.5:
            logger.warning("unified_ai_low_confidence", type=extraction.document_type, confidence=extraction.confidence)
            
        logger.info("unified_ai_success", type=extraction.document_type, confidence=extraction.confidence)
        
        # Attach telemetry for operational tracking
        extraction.ocr_telemetry = telemetry
        extraction.ocr_telemetry["method"] = method
        
        return extraction

    except HTTPException:
        raise
    except Exception as e:
        logger.error("process_document_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Unified processing failed: {str(e)}")
