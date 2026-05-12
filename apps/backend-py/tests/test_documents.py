import pytest
from unittest.mock import MagicMock, patch

@pytest.mark.asyncio
async def test_extract_document_unsupported_type(client):
    files = {'file': ('test.txt', b'hello world', 'text/plain')}
    response = await client.post("/api/v1/documents/extract", files=files)
    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]

@pytest.mark.asyncio
async def test_extract_document_too_large(client):
    large_content = b"a" * (11 * 1024 * 1024) # 11MB
    files = {'file': ('large.pdf', large_content, 'application/pdf')}
    response = await client.post("/api/v1/documents/extract", files=files)
    assert response.status_code == 413
    assert "File is too large" in response.json()["detail"]

@pytest.mark.asyncio
@patch("src.core.document_service.fitz.open")
@patch("src.core.document_service.extract_text_with_ocr")
async def test_extract_document_happy_path(mock_ocr, mock_fitz_open, client):
    # Setup mock fitz document
    mock_doc = MagicMock()
    mock_doc.needs_pass = False
    mock_doc.is_encrypted = False
    mock_doc.__len__.return_value = 1
    
    mock_page = MagicMock()
    # Provide > 150 chars to avoid OCR fallback
    mock_page.get_text.return_value = "Extracted text content " * 10
    mock_doc.__iter__.return_value = [mock_page]
    
    mock_fitz_open.return_value = mock_doc
    
    files = {'file': ('test.pdf', b'%PDF-1.4', 'application/pdf')}
    response = await client.post("/api/v1/documents/extract", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Extracted text content" in data["text"]
    assert data["method"] == "standard"

@pytest.mark.asyncio
@patch("src.core.document_service.fitz.open")
@patch("src.core.document_service.extract_text_with_ocr")
async def test_extract_document_ocr_fallback(mock_ocr, mock_fitz_open, client):
    # Setup mock fitz document with very little text
    mock_doc = MagicMock()
    mock_doc.needs_pass = False
    mock_doc.is_encrypted = False
    mock_doc.__len__.return_value = 1
    
    mock_page = MagicMock()
    mock_page.get_text.return_value = "short" # < 150 chars
    mock_doc.__iter__.return_value = [mock_page]
    
    mock_fitz_open.return_value = mock_doc
    mock_ocr.return_value = "OCR extracted text"
    
    files = {'file': ('scanned.pdf', b'%PDF-1.4', 'application/pdf')}
    response = await client.post("/api/v1/documents/extract", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "ocr"
    assert data["text"] == "OCR extracted text"

@pytest.mark.asyncio
@patch("src.core.document_service.fitz.open")
async def test_extract_document_password_required(mock_fitz_open, client):
    mock_doc = MagicMock()
    mock_doc.needs_pass = True
    mock_fitz_open.return_value = mock_doc
    
    files = {'file': ('protected.pdf', b'%PDF-1.4', 'application/pdf')}
    # No password provided
    response = await client.post("/api/v1/documents/extract", files=files)
    assert response.status_code == 500
    assert "requires a password" in response.json()["detail"]

@pytest.mark.asyncio
@patch("src.core.document_service.fitz.open")
@patch("src.core.document_service.extract_text_with_ocr")
async def test_extract_document_ocr_failure(mock_ocr, mock_fitz_open, client):
    # Standard extraction fails, and then OCR also fails
    mock_fitz_open.side_effect = Exception("Fitz failed")
    mock_ocr.side_effect = Exception("OCR failed")
    
    files = {'file': ('test.pdf', b'%PDF-1.4', 'application/pdf')}
    response = await client.post("/api/v1/documents/extract", files=files)
    assert response.status_code == 500
    assert "Both standard and OCR extraction failed" in response.json()["detail"]

@pytest.mark.asyncio
@patch("src.core.document_service.get_text_from_pdf")
@patch("src.core.document_service._extract_with_llm")
async def test_process_document_disagreement(mock_llm, mock_get_text, client):
    from src.schemas.financial import UnifiedDocumentResponse, LoanExtractionSchema
    mock_get_text.return_value = ("Sample text", 1, "standard", {})
    
    # Use real models for validation
    res1 = UnifiedDocumentResponse(
        document_type="LOAN",
        confidence=0.9,
        reasoning="Matched well",
        loan_data=LoanExtractionSchema(
            name="Loan A",
            principal=1000,
            interest_rate=5.0,
            installment_amount=100,
            duration_months=12
        )
    )
    
    res2 = UnifiedDocumentResponse(
        document_type="LOAN",
        confidence=0.9,
        reasoning="Matched well",
        loan_data=LoanExtractionSchema(
            name="Loan A",
            principal=2000, # Different principal
            interest_rate=5.0,
            installment_amount=100,
            duration_months=12
        )
    )
    
    mock_llm.side_effect = [res1, res2]
    
    files = {'file': ('loan.pdf', b'%PDF-1.4', 'application/pdf')}
    response = await client.post("/api/v1/documents/process", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["ocr_telemetry"]["parser_disagreement_detected"] is True
    assert data["confidence"] <= 0.4
