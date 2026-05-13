"""
Document Service Module for StashFlow.

This module provides core logic for processing financial documents, including 
text extraction from PDFs (with OCR fallback), AI-powered data extraction, 
and parser disagreement detection.
"""
import asyncio
import fitz  # PyMuPDF
from src.schemas.financial import UnifiedDocumentResponse
from src.core.config import settings
from src.utils.ocr import extract_text_with_ocr
from src.core.logger import get_logger
from src.core.ai import client

logger = get_logger(__name__)

async def get_text_from_pdf(content: bytes, password: str | None = None) -> tuple[str, int, str, dict]:
    """
    Extracts text from a PDF document with OCR fallback and password support.

    Args:
        content (bytes): The raw binary content of the PDF file.
        password (str | None): Optional password for encrypted PDFs.

    Returns:
        tuple[str, int, str, dict]: A tuple containing:
            - text (str): The extracted text.
            - page_count (int): Total number of pages in the document.
            - method (str): The extraction method used ("standard" or "ocr").
            - telemetry (dict): Metadata about the extraction process.

    Raises:
        Exception: If the PDF is encrypted and no password is provided, 
            if the password is invalid, if the document exceeds page limits, 
            or if all extraction methods fail.
    """
    # PSEUDOCODE: PDF Text Extraction Pipeline
    # 1. Attempt to open the PDF stream using PyMuPDF (fitz).
    # 2. Handle security: If encrypted, authenticate with the provided password.
    # 3. Validate constraints: Reject documents exceeding the 20-page safety limit.
    # 4. Standard Extraction: Iteratively extract text from all pages.
    # 5. OCR Fallback Trigger: If extracted text is below 150 characters, 
    #    assume it's a scanned image and trigger the OCR engine.
    # 6. Global Fallback: If PyMuPDF fails to open the file, attempt OCR on the 
    #    entire document as a last resort.
    
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

async def _extract_with_llm(text: str, method: str, temperature: float = 0.0) -> UnifiedDocumentResponse:
    """
    Calls the AI model to perform structured extraction on document text.

    Args:
        text (str): The raw text extracted from the document.
        method (str): The method used for text extraction (used for AI context).
        temperature (float): Sampling temperature for the AI model. Defaults to 0.0.

    Returns:
        UnifiedDocumentResponse: The structured AI response containing 
            classification and extracted financial data.
    """
    return client.chat.completions.create(
        model=settings.DEFAULT_AI_MODEL,
        response_model=UnifiedDocumentResponse,
        temperature=temperature,
        messages=[
            {
                "role": "system",
                "content": """You are an elite financial document classifier and analyst. 
                1. First, classify the provided document as a LOAN contract or a BANK_STATEMENT.
                2. If it is a LOAN, extract the loan details into the loan_data field.
                3. If it is a BANK_STATEMENT, extract the transaction list into the statement_data field.
                4. Provide a classification confidence score and reasoning.
                
                PROVENANCE RULES:
                - For loans: set 'provenance' to the page and snippet of the primary source section (e.g., the account summary or loan schedule table).
                - For each transaction: set its 'provenance' to the page and line where that transaction appears.
                - 'page': 1-indexed page number.
                - 'snippet': the exact text line used as evidence.
                
                Be extremely precise with amounts and dates. Use negative numbers for expenses in statements."""
            },
            {
                "role": "user",
                "content": f"Analyze this document (Method: {method}):\n\n{text}"
            }
        ]
    )

async def process_document_content(content: bytes, filename: str, password: str | None = None) -> UnifiedDocumentResponse:
    """
    Orchestrates the full document processing lifecycle.

    This function extracts text, runs parallel AI extractions to detect 
    hallucinations or disagreements, and compiles the final validated result.

    Args:
        content (bytes): Binary content of the PDF document.
        filename (str): Original name of the file (for logging).
        password (str | None): Optional password for PDF decryption.

    Returns:
        UnifiedDocumentResponse: The final structured extraction result.

    Raises:
        Exception: If no text can be extracted or if core processing fails.
    """
    # PSEUDOCODE: Unified Processing & Verification Logic
    # 1. Extract raw text and telemetry from the PDF.
    # 2. Guard against empty files: If no text is found after OCR, abort.
    # 3. Reliability Check (Parser Disagreement):
    #    a. Execute two AI extraction calls in parallel.
    #    b. Call 1: Temperature 0.0 (Deterministic/Strict).
    #    c. Call 2: Temperature 0.2 (Slightly creative/Verification).
    # 4. Compare Results: If classification or critical financial fields (like 
    #    loan principal) differ between calls, flag a "disagreement".
    # 5. Risk Mitigation: If a disagreement is detected, force the confidence 
    #    score below 0.4 to trigger human review in the downstream workflow.
    # 6. Return the result from the deterministic call with attached telemetry.

    text, _, method, telemetry = await get_text_from_pdf(content, password=password)

    if not text.strip():
        logger.warning("no_text_extracted", method=method)
        raise Exception("No text could be extracted from the PDF, even with OCR.")

    # Use AI to classify and extract. To satisfy "parser disagreement detection", we make two parallel calls.
    logger.info("unified_ai_extraction_start", model=settings.DEFAULT_AI_MODEL, text_length=len(text))
    
    extraction_1, extraction_2 = await asyncio.gather(
        _extract_with_llm(text, method, temperature=0.0),
        _extract_with_llm(text, method, temperature=0.2)
    )
    
    # Parser disagreement detection
    disagreement = False
    if extraction_1.document_type != extraction_2.document_type:
        disagreement = True
        logger.warning("parser_disagreement_type", type_1=extraction_1.document_type, type_2=extraction_2.document_type)
    
    if extraction_1.document_type == "LOAN" and extraction_1.loan_data and extraction_2.loan_data:
        if extraction_1.loan_data.principal != extraction_2.loan_data.principal:
            disagreement = True
            logger.warning("parser_disagreement_principal", p1=extraction_1.loan_data.principal, p2=extraction_2.loan_data.principal)
            
    # Base extraction on the lowest temperature (most deterministic)
    extraction = extraction_1
    
    if disagreement:
        # BUSINESS RULE: Heavily penalize confidence to force human-in-the-loop verification
        # This is a safety measure when the AI isn't consistent with itself.
        extraction.confidence = min(extraction.confidence, 0.4)
    
    if extraction.confidence < 0.5:
        logger.warning("unified_ai_low_confidence", type=extraction.document_type, confidence=extraction.confidence)
        
    logger.info("unified_ai_success", type=extraction.document_type, confidence=extraction.confidence, disagreement=disagreement)
    
    # Attach telemetry for operational tracking
    extraction.ocr_telemetry = telemetry
    extraction.ocr_telemetry["method"] = method
    extraction.ocr_telemetry["parser_disagreement_detected"] = disagreement
    
    return extraction
