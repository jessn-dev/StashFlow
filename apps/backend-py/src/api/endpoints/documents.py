"""
Document Management Endpoints for StashFlow.

This module provides API endpoints for uploading, extracting text from, 
and processing financial PDF documents. It supports both synchronous 
extraction and asynchronous background processing.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from src.schemas.financial import UnifiedDocumentResponse
from src.core.document_service import get_text_from_pdf, process_document_content
from src.core.logger import get_logger
from src.core.queue import ingestion_queue
from src.tasks.document_processing import run_process_document_task

router = APIRouter()
logger = get_logger(__name__)

class DocumentExtractionResponse(BaseModel):
    """
    Schema for raw document text extraction response.
    
    Attributes:
        text (str): The raw text extracted from the document.
        page_count (int): Number of pages in the PDF.
        success (bool): Whether the extraction was successful.
        method (str): The method used ("standard" or "ocr").
        telemetry (dict | None): Performance metrics and extraction details.
    """
    text: str
    page_count: int
    success: bool
    method: str  # "standard" or "ocr"
    telemetry: dict | None = None

class EnqueueRequest(BaseModel):
    """
    Schema for enqueuing a document for background processing.
    
    Attributes:
        document_id (str): UUID of the document in the database.
        storage_path (str): Path to the file in Supabase storage.
        password (str | None): Optional password for the PDF.
    """
    document_id: str
    storage_path: str
    password: str | None = None

@router.post("/extract", response_model=DocumentExtractionResponse)
async def extract_document_text(
    file: UploadFile = File(...),
    password: str | None = Form(None)
):
    """
    Extracts raw text from an uploaded PDF document with OCR fallback.

    Args:
        file (UploadFile): The uploaded PDF file.
        password (str | None): Optional password for encrypted PDFs.

    Returns:
        DocumentExtractionResponse: The extracted text and metadata.

    Raises:
        HTTPException: 400 for invalid file types, 413 for oversized files, 
            or 500 for internal processing failures.
    """
    # PSEUDOCODE: Raw Text Extraction Endpoint Flow
    # 1. Validate the file type: Reject if not 'application/pdf'.
    # 2. Security Check: Read content and verify size is under 10MB limit.
    # 3. Call 'get_text_from_pdf' in the document service (handles OCR fallback).
    # 4. Return structured response with extraction telemetry.

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    logger.info("extract_text_start", filename=file.filename)

    try:
        content = await file.read()
        
        # STRATEGIC LIMIT: Enforce 10MB limit to prevent memory exhaustion on worker nodes.
        if len(content) > 10 * 1024 * 1024:
            logger.warning("file_size_limit_exceeded", filename=file.filename, size=len(content))
            raise HTTPException(status_code=413, detail="File is too large. Maximum allowed size is 10MB.")

        text, page_count, method, telemetry = await get_text_from_pdf(content, password=password)
            
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

    Args:
        file (UploadFile): The uploaded PDF file.
        password (str | None): Optional password for encrypted PDFs.

    Returns:
        UnifiedDocumentResponse: The structured AI-extracted data.

    Raises:
        HTTPException: 400 for invalid file types, 413 for oversized files, 
            or 500 for extraction failures.
    """
    # PSEUDOCODE: Unified Processing Endpoint Flow
    # 1. Validate the file type: Ensure it is a PDF.
    # 2. Enforce 10MB size limit for performance and cost control.
    # 3. Call 'process_document_content':
    #    a. Extract text.
    #    b. Perform dual AI-extraction for verification.
    #    c. Classify (LOAN vs BANK_STATEMENT).
    # 4. Return the most deterministic extraction result.

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    logger.info("process_document_start", filename=file.filename)

    try:
        content = await file.read()
        
        # Enforce 10MB limit
        if len(content) > 10 * 1024 * 1024:
            logger.warning("file_size_limit_exceeded", filename=file.filename, size=len(content))
            raise HTTPException(status_code=413, detail="File is too large. Maximum allowed size is 10MB.")

        extraction = await process_document_content(content, file.filename or "unknown", password=password)
        return extraction

    except HTTPException:
        raise
    except Exception as e:
        logger.error("process_document_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Unified processing failed: {str(e)}")

@router.post("/enqueue")
async def enqueue_document_processing(req: EnqueueRequest):
    """
    Enqueues a document for background processing via Redis Queue (RQ).

    Args:
        req (EnqueueRequest): The request containing document and storage details.

    Returns:
        dict: A success indicator and the background job ID.
    """
    logger.info("enqueue_request", document_id=req.document_id)
    
    # We set a 5-minute timeout for the job to account for large PDFs or high OCR load.
    job = ingestion_queue.enqueue(
        run_process_document_task,
        document_id=req.document_id,
        storage_path=req.storage_path,
        password=req.password,
        job_timeout='5m'
    )
    
    return {"success": True, "job_id": job.id}
