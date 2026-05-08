/**
 * DEBT: pdfjs-dist was removed to resolve dev server RangeErrors.
 * Client-side password detection is temporarily disabled.
 * Backend will catch and report encrypted PDFs.
 */

/**
 * Checks if a PDF file is password protected (encrypted).
 * Returns true if encrypted, false otherwise.
 */
export async function isPdfEncrypted(_file: File): Promise<boolean> {
  // Temporary stub to avoid heavy pdfjs-dist dependency on client
  return false;
}

/**
 * Attempts to load an encrypted PDF with the provided password.
 * Returns true if password is correct, false otherwise.
 */
export async function validatePdfPassword(_file: File, _password: string): Promise<boolean> {
  // Temporary stub
  return true;
}
