import pytesseract
from pdf2image import convert_from_bytes

def extract_text_with_ocr(pdf_bytes: bytes, password: str | None = None) -> str:
    """
    Converts PDF pages to images and uses Tesseract OCR to extract text.
    This is a fallback for scanned documents.
    """
    try:
        # Convert PDF to list of PIL images
        images = convert_from_bytes(pdf_bytes, userpw=password or "")
        
        full_text = ""
        for i, image in enumerate(images):
            # Run OCR on the image
            text = pytesseract.image_to_string(image)
            full_text += f"--- Page {i+1} ---\n{text}\n\n"
            
        return full_text
    except Exception as e:
        raise Exception(f"OCR extraction failed: {str(e)}")
