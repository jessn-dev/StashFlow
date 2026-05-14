import type { StageResult } from '../types.ts'

// unpdf wraps PDF.js for edge/serverless runtimes — no canvas dependency
// deno-lint-ignore no-explicit-any
let _extractText: any

async function getExtractText() {
  if (!_extractText) {
    // @ts-ignore — esm.sh import, no local type stubs
    const mod = await import('https://esm.sh/unpdf@0.11')
    _extractText = mod.extractText
  }
  return _extractText
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<StageResult<string>> {
  try {
    const extractText = await getExtractText()
    const { text, totalPages } = await extractText(new Uint8Array(buffer), { mergePages: true })
    console.log(`[document-parser] pdf: ${totalPages} pages, ${(text as string).length} chars`)
    return { ok: true, value: text as string }
  } catch (err) {
    return {
      ok: false,
      error: {
        stage: 'extract',
        code: 'PDF_PARSE_FAILED',
        message: String(err),
        retryable: false,
      },
    }
  }
}
