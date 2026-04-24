import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
  if (mimeType === 'image/heic') {
    return hex.includes('66747970') // ftyp (HEIF/HEIC signature often at offset 4)
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return hex === '504B0304' // ZIP (OOXML)
  }
  if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/msword') {
    return hex === 'D0CF11E0' // OLE2 Compound Document
  }
  if (mimeType === 'text/csv') {
    return true // Text-based, signature validation skipped
  }
  return false
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

    // 4. Upload to Private Storage
    const fileExt = file.name.split('.').pop()
    const storagePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('user_documents')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    // 5. Trigger Analysis (Background)
    let analysisResult = { inferred_type: 'unknown', extracted_data: {} }
    try {
      const { data: { publicUrl } } = supabaseClient.storage.from('user_documents').getPublicUrl(storagePath)
      const analysisResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-financial-document`, {
        method: 'POST',
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_url: publicUrl,
          mime_type: file.type,
          // We can't easily extract raw_text here for non-text files, 
          // Gemini multimodal will handle the publicUrl directly.
        })
      })
      if (analysisResp.ok) {
        analysisResult = await analysisResp.json()
      }
    } catch (e) {
      console.error('Analysis trigger failed:', e.message)
    }

    // 6. Save Metadata to public.documents
    const { data: docData, error: dbError } = await supabaseClient
      .from('documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        storage_path: storagePath,
        inferred_type: analysisResult.inferred_type,
        extracted_data: analysisResult.extracted_data
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
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
