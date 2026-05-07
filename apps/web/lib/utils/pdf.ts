import * as pdfjs from 'pdfjs-dist';

// Initialize pdfjs worker
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

/**
 * Checks if a PDF file is password protected (encrypted).
 * Returns true if encrypted, false otherwise.
 */
export async function isPdfEncrypted(file: File): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    await loadingTask.promise;
    return false;
  } catch (error: any) {
    if (error.name === 'PasswordException') {
      return true;
    }
    // For other errors, we assume it's not encrypted or unreadable
    // (Actual unreadable files will be caught by the backend)
    return false;
  }
}

/**
 * Attempts to load an encrypted PDF with the provided password.
 * Returns true if password is correct, false otherwise.
 */
export async function validatePdfPassword(file: File, password: string): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer, password });
    await loadingTask.promise;
    return true;
  } catch (error: any) {
    return false;
  }
}
