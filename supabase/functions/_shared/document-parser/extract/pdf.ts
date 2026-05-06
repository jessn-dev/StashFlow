import type { StageResult } from '../types.ts'

// unpdf wraps PDF.js for edge/serverless runtimes — no canvas dependency
// deno-lint-ignore no-explicit-any
let _extractText: any

async function getExtractText() {
  if (!_extractText) {
    try {
      console.log('[document-parser] getExtractText: dynamic importing unpdf@0.11.0 from esm.sh...')
      // @ts-ignore — esm.sh import, no local type stubs
      const mod = await import('https://esm.sh/unpdf@0.11.0')
      console.log('[document-parser] getExtractText: import successful')
      _extractText = mod.extractText
    } catch (err) {
      console.error('[document-parser] getExtractText: import failed!', err)
      throw err
    }
  }
  return _extractText
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<StageResult<string>> {
  try {
    console.log(`[document-parser] extractPdfText: starting with ${buffer.byteLength} bytes`)
    
    const extractText = await getExtractText()
    if (!extractText) {
      console.error('[document-parser] extractPdfText: extractText function is undefined after load')
      throw new Error('PDF extraction function not found in library')
    }

    console.log('[document-parser] extractPdfText: calling unpdf.extractText with Uint8Array...')
    
    // We wrap the call in a promise to track if it ever resolves
    const result = await extractText(new Uint8Array(buffer), { mergePages: true })
    
    console.log('[document-parser] extractPdfText: call returned successfully')
    const { text, totalPages } = result
    
    console.log(`[document-parser] pdf result: ${totalPages} pages, ${(text as string || '').length} chars`)
    
    if (!text || (text as string).trim().length === 0) {
      console.warn('[document-parser] extractPdfText: result text is empty (check if PDF is scanned or password protected)')
    }

    return { ok: true, value: text as string || '' }
  } catch (err) {
    console.error('[document-parser] extractPdfText: caught exception during execution:', err)
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
