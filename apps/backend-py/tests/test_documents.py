import pytest
from unittest.mock import MagicMock, patch
from io import BytesIO

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
@patch("src.api.endpoints.documents.fitz.open")
@patch("src.api.endpoints.documents.extract_text_with_ocr")
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
@patch("src.api.endpoints.documents.fitz.open")
@patch("src.api.endpoints.documents.extract_text_with_ocr")
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
@patch("src.api.endpoints.documents.fitz.open")
async def test_extract_document_password_required(mock_fitz_open, client):
    mock_doc = MagicMock()
    mock_doc.needs_pass = True
    mock_fitz_open.return_value = mock_doc
    
    files = {'file': ('protected.pdf', b'%PDF-1.4', 'application/pdf')}
    # No password provided
    response = await client.post("/api/v1/documents/extract", files=files)
    assert response.status_code == 500
    assert "requires a password" in response.json()["detail"]
