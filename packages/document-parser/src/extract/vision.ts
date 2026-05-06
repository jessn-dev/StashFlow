import type { StageResult } from '../types.ts'

export async function runVisionOCR(base64: string, apiKey: string): Promise<StageResult<string>> {
  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          }],
        }),
      }
    )

    if (res.status === 429) {
      return {
        ok: false,
        error: {
          stage: 'ocr',
          code: 'VISION_QUOTA_EXCEEDED',
          message: 'Google Vision quota exceeded',
          retryable: false,
        },
      }
    }

    if (!res.ok) {
      const body = await res.text()
      return {
        ok: false,
        error: {
          stage: 'ocr',
          code: 'VISION_API_ERROR',
          message: `Vision API ${res.status}: ${body.slice(0, 200)}`,
          retryable: true,
        },
      }
    }

    // deno-lint-ignore no-explicit-any
    const json = await res.json() as any
    const text: string = json.responses?.[0]?.fullTextAnnotation?.text ?? ''
    return { ok: true, value: text }
  } catch (err) {
    return {
      ok: false,
      error: {
        stage: 'ocr',
        code: 'VISION_NETWORK_ERROR',
        message: String(err),
        retryable: true,
      },
    }
  }
}
