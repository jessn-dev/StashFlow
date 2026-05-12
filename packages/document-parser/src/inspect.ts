import type { StageResult } from './types.ts'

export interface FileInfo {
  mimeType: string
  isPDF: boolean
  isImage: boolean
}

const SUPPORTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export function inspectFile(mimeType: string): StageResult<FileInfo> {
  if (!SUPPORTED.includes(mimeType)) {
    return {
      ok: false,
      error: {
        stage: 'inspect',
        code: 'UNSUPPORTED_TYPE',
        message: `Unsupported MIME type: ${mimeType}`,
        retryable: false,
      },
    }
  }
  return {
    ok: true,
    value: {
      mimeType,
      isPDF: mimeType === 'application/pdf',
      isImage: mimeType.startsWith('image/'),
    },
  }
}

/**
 * Validates the 'magic bytes' (file signature) of a document buffer.
 * Provides protection against file extension spoofing.
 */
export function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  
  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  
  // PNG: 0x89 0x50 0x4E 0x47
  if (mimeType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  }
  
  // JPEG: 0xFF 0xD8 0xFF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  
  // WebP: RIFF (0x52 0x49 0x46 0x46) at start
  if (mimeType === 'image/webp') {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  }

  return true; // Fallback for types without strict signature checks
}
