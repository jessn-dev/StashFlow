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
