import { createClient } from "@supabase/supabase-js"
import * as Sentry from "npm:@sentry/deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENTRY_DSN = Deno.env.get('SENTRY_DSN')

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Verifies file signature (Magic Numbers) to prevent disguised executables.
 */
async function validateFileSignature(buffer: Uint8Array, mimeType: string): Promise<boolean> {
  const hex = Array.from(buffer.slice(0, 4))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  if (mimeType === 'application/pdf') {
    return hex === '25504446' // %PDF
  }
  if (mimeType === 'image/jpeg') {
    return hex.startsWith('FFD8FF') // JPEG
  }
  if (mimeType === 'image/png') {
    return hex === '89504E47' // .PNG
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return hex === '504B0304' // ZIP (OOXML)
  }
  if (mimeType === 'application/vnd.ms-excel') {
    return hex === 'D0CF11E0' // OLE2 Compound Document
  }
  return false
}

/**
 * Calculates SHA-256 hash of the file content.
 */
async function calculateHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Get User
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // 2. Parse Multipart Form Data
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) throw new Error('No file uploaded')

    // 3. Multi-Layered Validation
    // A. Size check
    if (file.size > MAX_FILE_SIZE) throw new Error('File exceeds 5MB limit')

    // B. MIME type check (browser provided)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error(`Type ${file.type} not allowed`)

    // C. Content check (Magic Numbers)
    const arrayBuffer = await file.arrayBuffer()
    const signatureValid = await validateFileSignature(new Uint8Array(arrayBuffer), file.type)
    if (!signatureValid) throw new Error('Invalid file signature. File may be malicious.')

    // D. Content Hash for Idempotency
    const contentHash = await calculateHash(arrayBuffer)

    // 4. Check for existing document (Idempotency)
    const { data: existingDoc } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_hash', contentHash)
      .maybeSingle()

    if (existingDoc) {
      return new Response(
        JSON.stringify({ success: true, document: existingDoc, duplicated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 5. Upload to Private Storage
    const fileExt = file.name.split('.').pop()
    const storagePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('user_documents')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    // 6. Save Metadata to public.documents
    const { data: docData, error: dbError } = await supabaseClient
      .from('documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        storage_path: storagePath,
        content_hash: contentHash
      })
      .select('*')
      .single()

    if (dbError) {
        // Rollback storage if DB fails
        await supabaseClient.storage.from('user_documents').remove([storagePath])
        throw dbError
    }

    return new Response(
      JSON.stringify({ success: true, document: docData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    console.error('[upload-document] error:', err)
    if (SENTRY_DSN) Sentry.captureException(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
