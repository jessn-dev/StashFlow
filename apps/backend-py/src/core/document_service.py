"""
Document Service Module for StashFlow.

This module provides core logic for processing financial documents, including 
text extraction from PDFs (with OCR fallback), AI-powered data extraction, 
and parser disagreement detection.
"""
import asyncio
import fitz  # PyMuPDF
from src.schemas.financial import UnifiedDocumentResponse, DocumentType
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

async def _extract_with_llm(text: str, method: str, temperature: float = 0.0, model: str | None = None) -> UnifiedDocumentResponse:
    """
    Calls the AI model to perform structured extraction on document text.

    Args:
        text (str): The raw text extracted from the document.
        method (str): The method used for text extraction (used for AI context).
        temperature (float): Sampling temperature for the AI model. Defaults to 0.0.
        model (str | None): Explicit model string to use. Defaults to settings.DEFAULT_AI_MODEL.

    Returns:
        UnifiedDocumentResponse: The structured AI response containing 
            classification and extracted financial data.
    """
    target_model = model or settings.DEFAULT_AI_MODEL
    return client.chat.completions.create(
        model=target_model,
        response_model=UnifiedDocumentResponse,
        temperature=temperature,
        messages=[
            {
                "role": "system",
                "content": """You are an elite financial document classifier and data extractor.
    ...
        Be precise with amounts and dates. Use negative numbers for expenses in statements."""
            },
            {
                "role": "user",
                "content": f"Analyze this document (Method: {method}):\n\n{text}"
            }
        ]
    )

async def process_document_content(content: bytes, filename: str, password: str | None = None) -> UnifiedDocumentResponse:
    """
    Orchestrates the full document processing lifecycle with high reliability.

    This function extracts text, runs resilient sequential AI extractions to detect 
    hallucinations or disagreements, and handles provider failover (Groq -> Gemini).

    Args:
        content (bytes): Binary content of the PDF document.
        filename (str): Original name of the file (for logging).
        password (str | None): Optional password for PDF decryption.

    Returns:
        UnifiedDocumentResponse: The final structured extraction result.

    Raises:
        Exception: If no text can be extracted or if ALL extraction methods fail.
    """
    from src.schemas.financial import UnifiedDocumentResponse, DocumentType

    # PSEUDOCODE: Resilient Unified Processing
    # 1. Extract raw text from the PDF.
    # 2. Sequential Extraction Pattern (TPM Management):
    #    a. Call 1 (Deterministic): Try Groq (70B). If fails, fallback to Gemini.
    #    b. Call 2 (Verification): If Call 1 succeeded, try Groq (70B) again with temp 0.2.
    #       - If Call 2 fails, degrade gracefully: return Call 1 with 'verification_skipped'.
    # 3. Disagreement Detection: Compare Call 1 and Call 2 if both succeeded.
    # 4. Error Transformation: Map technical errors (RateLimit) to user-friendly messages.

    text, _, method, telemetry = await get_text_from_pdf(content, password=password)

    if not text.strip():
        logger.warning("no_text_extracted", method=method)
        raise Exception("No text could be extracted from the PDF, even with OCR.")

    # Reliability Tier 1: Primary Extraction
    extraction_1 = None
    fallback_used = False
    
    try:
        logger.info("unified_ai_primary_start", model=settings.DEFAULT_AI_MODEL)
        extraction_1 = await _extract_with_llm(text, method, temperature=0.0)
    except Exception as e:
        logger.warning("primary_extraction_failed_retrying_fallback", error=str(e))
        try:
            # Fallback 1: Gemini 2.0 Flash
            fallback_model = "gemini/gemini-2.0-flash"
            logger.info("unified_ai_fallback_start", model=fallback_model)
            extraction_1 = await _extract_with_llm(text, method, temperature=0.0, model=fallback_model)
            fallback_used = True
        except Exception as fe:
            logger.warning("first_fallback_failed_trying_flash_lite", error=str(fe))
            try:
                # Fallback 2: Gemini 2.0 Flash Lite (often has separate/higher limits)
                lite_model = "gemini/gemini-2.0-flash-lite"
                logger.info("unified_ai_lite_fallback_start", model=lite_model)
                extraction_1 = await _extract_with_llm(text, method, temperature=0.0, model=lite_model)
                fallback_used = True
                fallback_model = lite_model
            except Exception as final_e:
                logger.error("all_ai_providers_exhausted", error=str(final_e))
                # BUSINESS RULE: Never return a 500 for provider exhaustion.
                # Return a structured "failed" response that the UI handles gracefully.
                return UnifiedDocumentResponse(
                    document_type=DocumentType.UNKNOWN,
                    loan_structure="single",
                    confidence=0.0,
                    reasoning="All AI providers are currently exhausted.",
                    verification_status="failed",
                    user_friendly_message="Our AI analysis engine is currently under extreme load. Please try again in a few minutes or enter your details manually.",
                    extraction_warnings=["Quota exceeded for all available AI models."]
                )

    # Reliability Tier 2: Verification (Sequential to avoid TPM bursts)
    extraction_2 = None
    verification_skipped = False
    
    # Introduce small jittered breather (500ms) between calls to prevent RPM bursts
    await asyncio.sleep(0.5)
    
    try:
        logger.info("unified_ai_verification_start", model=settings.DEFAULT_AI_MODEL)
        # Use same provider logic for verification if primary was fallback
        verify_model = fallback_model if fallback_used else settings.DEFAULT_AI_MODEL
        extraction_2 = await _extract_with_llm(text, method, temperature=0.2, model=verify_model)
    except Exception as e:
        logger.warning("verification_call_skipped_graceful_degradation", error=str(e))
        verification_skipped = True

    # Parser disagreement detection (only if both succeeded)
    disagreement = False
    if extraction_1 and extraction_2:
        if extraction_1.document_type != extraction_2.document_type:
            disagreement = True
            logger.warning("parser_disagreement_type", t1=extraction_1.document_type, t2=extraction_2.document_type)
        
        if extraction_1.document_type == "LOAN" and extraction_1.loan_data and extraction_2.loan_data:
            if extraction_1.loan_data.principal != extraction_2.loan_data.principal:
                disagreement = True
                logger.warning("parser_disagreement_principal", p1=extraction_1.loan_data.principal, p2=extraction_2.loan_data.principal)
        
        # Structure agreement
        if extraction_1.loan_structure != extraction_2.loan_structure:
            disagreement = True
            logger.warning("parser_disagreement_structure", s1=extraction_1.loan_structure, s2=extraction_2.loan_structure)

        # Currency agreement
        if extraction_1.document_type == "LOAN":
            def get_currencies(ext):
                loans = ([ext.loan_data] if ext.loan_structure == 'single' and ext.loan_data
                         else (ext.multi_loan_data.loans if ext.multi_loan_data else []))
                return {l.currency for l in loans if l}
            
            c1, c2 = get_currencies(extraction_1), get_currencies(extraction_2)
            if c1 != c2:
                disagreement = True
                logger.warning("parser_disagreement_currency", c1=list(c1), c2=list(c2))

        # Rate and Type agreement
        if extraction_1.document_type == "LOAN":
            def get_rates(ext):
                loans = ([ext.loan_data] if ext.loan_structure == 'single' and ext.loan_data
                         else (ext.multi_loan_data.loans if ext.multi_loan_data else []))
                return [l.interest_rate for l in loans]

            def get_types(ext):
                loans = ([ext.loan_data] if ext.loan_structure == 'single' and ext.loan_data
                         else (ext.multi_loan_data.loans if ext.multi_loan_data else []))
                return [l.interest_type for l in loans]

            r1, r2 = get_rates(extraction_1), get_rates(extraction_2)
            for v1, v2 in zip(r1, r2):
                if v2 > 0 and abs(v1 - v2) / v2 > 0.20:
                    disagreement = True
                    break
            
            t1, t2 = get_types(extraction_1), get_types(extraction_2)
            if t1 != t2:
                disagreement = True

    # Compiling the final response
    extraction = extraction_1
    extraction.verification_status = 'verified'
    
    if verification_skipped:
        extraction.verification_status = 'skipped'
        extraction.user_friendly_message = "Automated verification was skipped due to high provider load. Please review the results carefully."
        extraction.extraction_warnings.append("Parallel cross-check unavailable.")
        # Penalize confidence slightly but not as much as a disagreement
        extraction.confidence = min(extraction.confidence, 0.7)

    if disagreement:
        extraction.verification_status = 'failed'
        extraction.user_friendly_message = "Our verification engine detected inconsistencies in the extracted data. Manual review is required."
        extraction.confidence = min(extraction.confidence, 0.4)
    
    if fallback_used:
        extraction.extraction_warnings.append("Processed using secondary AI provider (Gemini).")

    logger.info("unified_ai_success", 
        type=extraction.document_type, 
        status=extraction.verification_status, 
        fallback=fallback_used
    )
    
    extraction.ocr_telemetry = telemetry
    extraction.ocr_telemetry["method"] = method
    extraction.ocr_telemetry["verification_status"] = extraction.verification_status
    extraction.ocr_telemetry["parser_disagreement_detected"] = disagreement
    
    return extraction
