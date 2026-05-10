import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { file_url } = await req.json()
    if (!file_url) throw new Error('Missing file_url')

    // In a production environment, you would call an OCR/LLM service here.
    // For this milestone, we provide a structured mock response as proof-of-concept
    // that demonstrates how the system handles the parsed data.

    const mockExtractedData = {
      name: "Auto Loan - Sample",
      principal: 25000.00,
      interest_rate: 5.25,
      duration_months: 60,
      currency: "USD",
      country_code: "US",
      commercial_category: "Asset-Backed",
      interest_type: "Standard Amortized",
      interest_basis: "Actual/365",
      start_date: new Date().toISOString().split('T')[0]
    }

    return new Response(
      JSON.stringify(mockExtractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
