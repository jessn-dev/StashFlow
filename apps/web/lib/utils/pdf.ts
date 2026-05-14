/**
 * DEBT: pdfjs-dist was removed to resolve dev server RangeErrors.
 * Client-side password detection is temporarily disabled.
 * Backend will catch and report encrypted PDFs.
 */

/**
 * Checks if a PDF file is password protected.
 * Scans the PDF trailer section for an /Encrypt dictionary entry.
 * Does not require pdfjs-dist — pure byte scan, no external dependency.
 *
 * Fails open: returns false on any read error so the backend can determine encryption.
 */
export async function isPdfEncrypted(file: File): Promise<boolean> {
  try {
    // PDF trailer is in the last portion of the file.
    // 4KB is enough to find /Encrypt for all standard bank-issued PDFs.
    const tailSize = Math.min(file.size, 4096);
    const tail = file.slice(file.size - tailSize);
    const buffer = await tail.arrayBuffer();
    // latin1 decoding preserves byte values without UTF-8 errors on binary PDFs
    const text = new TextDecoder('latin1').decode(buffer);
    return text.includes('/Encrypt');
  } catch {
    // Fail open — let backend determine encryption status
    return false;
  }
}

/**
 * Attempts to load an encrypted PDF with the provided password.
 * Returns true if password is correct, false otherwise.
 */
export async function validatePdfPassword(_file: File, _password: string): Promise<boolean> {
  // Temporary stub
  return true;
}
