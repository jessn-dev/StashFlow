import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1"
// Note: We'll use a local copy of the logic since edge functions can't easily import from packages/core yet
// in a local dev environment without complex volume mapping or bundling.
// For now, we'll implement the verify logic directly or via a shared utility in supabase/functions/_shared.

const HMAC_SECRET = Deno.env.get('LEDGER_SECRET') || 'default-fallback-secret-for-dev'

async function verifyEntry(
  entry: any,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(JSON.stringify(entry));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, data);
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    // 2. Fetch last 1,000 ledger entries (incomes + expenses)
    // We'll verify them in parallel.
    const [incomesRes, expensesRes] = await Promise.all([
      supabase
        .from('incomes')
        .select('id, user_id, amount, currency, date, created_at, signature')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('expenses')
        .select('id, user_id, amount, currency, date, created_at, signature')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500)
    ])

    const results = {
      total: 0,
      valid: 0,
      invalid: [] as string[]
    }

    const verifyList = [
      ...(incomesRes.data || []).map(i => ({ ...i, type: 'income' })),
      ...(expensesRes.data || []).map(e => ({ ...e, type: 'expense' }))
    ]

    results.total = verifyList.length

    for (const item of verifyList) {
      const { signature, ...entryData } = item
      if (!signature) {
        results.invalid.push(item.id)
        continue
      }

      // Reconstruct the entry for verification matching the LedgerEntry interface
      const entry = {
        id: entryData.id,
        userId: entryData.user_id,
        amount: entryData.amount,
        currency: entryData.currency,
        type: entryData.type,
        date: entryData.date,
        createdAt: entryData.created_at
      }

      const isValid = await verifyEntry(entry, signature, HMAC_SECRET)
      if (isValid) {
        results.valid++
      } else {
        results.invalid.push(item.id)
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
