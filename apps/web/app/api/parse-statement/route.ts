import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/utils/supabase/server'
import { createLoan } from '@stashflow/api'

const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

const MONTH_ABBR = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

// Matches many real-world bank statement date formats
const DATE_PATTERNS: RegExp[] = [
  /\b(\d{4}-\d{2}-\d{2})\b/,                                          // 2024-03-15
  /\b(\d{2}\/\d{2}\/\d{4})\b/,                                        // 03/15/2024 or 15/03/2024
  /\b(\d{2}\/\d{2}\/\d{2})\b/,                                        // 03/15/24
  /\b(\d{2}-\d{2}-\d{4})\b/,                                          // 03-15-2024
  /\b(\d{2}-\d{2}-\d{2})\b/,                                          // 03-15-24
  new RegExp(`\\b(\\d{1,2}\\s+(?:${MONTH_ABBR})\\s+\\d{4})\\b`, 'i'), // 15 Mar 2024
  new RegExp(`\\b((?:${MONTH_ABBR})\\s+\\d{1,2},?\\s+\\d{4})\\b`, 'i'), // Mar 15, 2024
  new RegExp(`\\b((?:${MONTH_ABBR})\\s+\\d{1,2})\\b`, 'i'),            // Mar 15 (no year)
  /\b(\d{1,2}\/\d{1,2})\b/,                                           // 3/15 (no year)
]

// Matches amounts: 1234.56  1,234.56  (1,234.56)  -1,234.56  1234  etc.
const AMOUNT_RE = /(?<!\d)[-+]?\(?([\d]{1,3}(?:,\d{3})*|\d+)(\.\d{1,2})?\)?(?!\d)/g

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[(),\s]/g, '').replace(/,/g, ''))
}

function normaliseDate(raw: string): string | null {
  try {
    // Try direct parse first
    const d = new Date(raw)
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
      return d.toISOString().split('T')[0]
    }
    // MM/DD/YY or DD/MM/YY fallback — assume current century
    const parts = raw.split(/[\/\-]/)
    if (parts.length === 3 && parts[2].length === 2) {
      const full = `${parts[0]}/${parts[1]}/20${parts[2]}`
      const d2 = new Date(full)
      if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0]
    }
    // Short form e.g. "Mar 15" — use current year
    if (/^[a-z]{3}\s+\d{1,2}$/i.test(raw)) {
      const d3 = new Date(`${raw} ${new Date().getFullYear()}`)
      if (!isNaN(d3.getTime())) return d3.toISOString().split('T')[0]
    }
  } catch {}
  return null
}

function isDebitKeyword(line: string): boolean {
  return /\b(debit|dr|withdrawal|purchase|payment|paid|charge|fee|expense)\b/i.test(line)
}

function isCreditKeyword(line: string): boolean {
  return /\b(credit|cr|deposit|salary|refund|transfer in|received)\b/i.test(line)
}

function localPatternMatch(text: string): { incomes: any[]; expenses: any[] } {
  console.log('[local-parser] extracted text sample:', text.slice(0, 400))

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const incomes: any[] = []
  const expenses: any[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Find a date in this line
    let rawDate: string | null = null
    for (const pat of DATE_PATTERNS) {
      const m = line.match(pat)
      if (m) { rawDate = m[1] ?? m[0]; break }
    }
    if (!rawDate) continue

    const date = normaliseDate(rawDate)
    if (!date) continue

    // Find ALL amounts on this line and the next line
    const searchText = line + ' ' + (lines[i + 1] ?? '')
    const amounts: number[] = []
    AMOUNT_RE.lastIndex = 0
    let am: RegExpExecArray | null
    while ((am = AMOUNT_RE.exec(searchText)) !== null) {
      const val = parseAmount(am[0])
      if (val > 0 && val < 1_000_000) amounts.push(val)
    }
    if (amounts.length === 0) continue

    // Pick the most transaction-like amount (prefer smaller, rightmost)
    const amount = amounts[amounts.length - 1]

    // Deduplicate
    const key = `${date}|${amount}`
    if (seen.has(key)) continue
    seen.add(key)

    // Description: strip date and amounts from line
    let desc = line
      .replace(rawDate, '')
      .replace(AMOUNT_RE, '')
      .replace(/[|,\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (desc.length < 3) desc = lines[i + 1]?.replace(AMOUNT_RE, '').trim() ?? 'Bank Transaction'
    if (desc.length < 3) desc = 'Bank Transaction'

    // Determine direction
    const context = line + ' ' + (lines[i - 1] ?? '') + ' ' + (lines[i + 1] ?? '')
    const rawAmt = line.match(AMOUNT_RE)?.[0] ?? ''
    const isNeg = rawAmt.startsWith('-') || rawAmt.includes('(') || isDebitKeyword(context)
    const isPos = isCreditKeyword(context)

    const entry = { source: desc, description: desc, amount, date, category: 'other', notes: 'Extracted via local mode (AI fallback)' }

    if (isNeg && !isPos) expenses.push(entry)
    else if (isPos && !isNeg) incomes.push(entry)
    else expenses.push(entry) // default to expense when ambiguous
  }

  console.log(`[local-parser] found ${incomes.length} incomes, ${expenses.length} expenses`)
  return { incomes, expenses }
}

function isAmortizationScheduleText(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    (lower.includes('amortization') || lower.includes('amortisation') || lower.includes('payment schedule') || lower.includes('installment schedule')) &&
    lower.includes('principal') &&
    lower.includes('interest') &&
    lower.includes('balance')
  )
}

function parseAmortizationLocal(text: string, fallbackCurrency: string): { type: 'loan_schedule'; loan: any } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Lender: line containing a known financial entity keyword
  const lenderPattern = /(?:corporation|corp\.?|bank|finance|lending|capital|financial|credit|insurance)\b/i
  const lender = lines.find(l =>
    lenderPattern.test(l) &&
    l.length > 4 &&
    l.length < 80 &&
    !/^(printed|issued|date|page|version|license|release|ref)/i.test(l)
  ) || null

  // Loan name: prefer "Type of Loan" label, fallback to first non-header line
  const loanTypeMatch = text.match(/type\s+of\s+loan[:\s]+(.+)/i)
  const headerWords = /^(date|no\.?|seq|#|payment|principal|interest|balance|amount|period|month|schedule|repayment|installment|due|remaining|ending|beginning)/i
  const name = loanTypeMatch
    ? loanTypeMatch[1].trim()
    : lines.find(l =>
        l.length > 4 &&
        !/^\d/.test(l) &&
        !/^[#$₱]/.test(l) &&
        !headerWords.test(l) &&
        !lenderPattern.test(l)
      ) || 'Imported Loan'

  // Annual interest rate — prefer Annual EIR over stated monthly rate
  const annualEirMatch = text.match(/annual\s+eir[:\s]+([0-9.]+)/i)
  const statedRateMatch = text.match(/interest\s+rate[:\s]+([0-9.]+)\s*%/i)
  const monthlyRateMatch = text.match(/monthly\s+eir[:\s]+([0-9.]+)/i)
  let interestRate = 0
  if (annualEirMatch) {
    interestRate = parseFloat(annualEirMatch[1])
  } else if (statedRateMatch) {
    const r = parseFloat(statedRateMatch[1])
    // Heuristic: if rate < 5 it's likely monthly — annualise it
    interestRate = r < 5 ? parseFloat((r * 12).toFixed(3)) : r
  } else if (monthlyRateMatch) {
    interestRate = parseFloat((parseFloat(monthlyRateMatch[1]) * 12).toFixed(3))
  }

  // Principal — prefer "Amount Financed" label
  const principalPatterns = [
    /amount\s+financed[:\s]+(?:Php|PHP|₱|\$)?\s*([\d,]+\.?\d*)/i,
    /(?:loan\s*amount|original\s*(?:loan\s*)?(?:principal|balance)|principal\s*amount)[:\s]+(?:Php|PHP|₱|\$)?\s*([\d,]+\.?\d*)/i,
  ]
  let principal = 0
  for (const pat of principalPatterns) {
    const m = text.match(pat)
    if (m) { principal = parseFloat(m[1].replace(/,/g, '')); break }
  }

  // Duration — prefer explicit "Term:" label over row count
  const termMatch = text.match(/\bterm[:\s]+(\d+)/i)
  let durationFromTerm = termMatch ? parseInt(termMatch[1]) : 0

  // Currency
  const currencyMatch = text.match(/\b(PHP|USD|EUR|GBP|JPY|SGD)\b/i)
  const fromCode = currencyMatch?.[1]?.toUpperCase()
  const fromSymbol =
    text.includes('₱') ? 'PHP' :
    text.includes('€') ? 'EUR' :
    text.includes('£') ? 'GBP' :
    text.includes('¥') ? 'JPY' :
    text.includes('S$') ? 'SGD' :
    text.includes('$') ? 'USD' :
    null
  const currency = fromCode ?? fromSymbol ?? fallbackCurrency

  // Start date — prefer "Date Released" label
  const releasedMatch = text.match(/date\s+released[:\s]+([^\n]+)/i)
  let startDate: string
  if (releasedMatch) {
    startDate = normaliseDate(releasedMatch[1].trim()) ?? new Date().toISOString().split('T')[0]
  } else {
    // Fall back to one month before first dated payment row
    const paymentDates: string[] = []
    for (const line of lines) {
      let rowDate: string | null = null
      for (const pat of DATE_PATTERNS) {
        const m = line.match(pat)
        if (m) { rowDate = normaliseDate(m[1] ?? m[0]); break }
      }
      if (!rowDate) continue
      AMOUNT_RE.lastIndex = 0
      const amounts: number[] = []
      let am: RegExpExecArray | null
      while ((am = AMOUNT_RE.exec(line)) !== null) {
        const v = parseAmount(am[0])
        if (v > 0 && v < 10_000_000) amounts.push(v)
      }
      if (amounts.length >= 3) paymentDates.push(rowDate)
    }
    try {
      const d = new Date(paymentDates[0])
      d.setUTCMonth(d.getUTCMonth() - 1)
      startDate = d.toISOString().split('T')[0]
    } catch {
      startDate = new Date().toISOString().split('T')[0]
    }
    if (!durationFromTerm) durationFromTerm = paymentDates.length
  }

  // Count payment rows if term not found via label
  if (!durationFromTerm) {
    let rowCount = 0
    for (const line of lines) {
      let hasDate = false
      for (const pat of DATE_PATTERNS) { if (line.match(pat)) { hasDate = true; break } }
      if (!hasDate) continue
      AMOUNT_RE.lastIndex = 0
      const amounts: number[] = []
      let am: RegExpExecArray | null
      while ((am = AMOUNT_RE.exec(line)) !== null) {
        const v = parseAmount(am[0])
        if (v > 0 && v < 10_000_000) amounts.push(v)
      }
      if (amounts.length >= 3) rowCount++
    }
    durationFromTerm = rowCount
  }

  if (durationFromTerm < 1 || principal < 1) return null

  return {
    type: 'loan_schedule',
    loan: { name, lender, principal, interest_rate: interestRate, duration_months: durationFromTerm, start_date: startDate, currency },
  }
}

function detectContentType(storagePath: string, hint?: string): string {
  if (hint) return hint
  const ext = storagePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
  }
  return map[ext] ?? 'application/pdf'
}

async function parseExcelFallback(buffer: Buffer): Promise<{ incomes: any[]; expenses: any[] }> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const incomes: any[] = []
  const expenses: any[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    if (rows.length < 2) continue

    const header = rows[0].map((h: any) => String(h).toLowerCase().trim())
    const dateIdx = header.findIndex(h => /date|time/.test(h))
    const descIdx = header.findIndex(h => /desc|narr|memo|payee|detail|particulars/.test(h))
    const amtIdx = header.findIndex(h => /^amount$|^value$|^total$/.test(h))
    const debitIdx = header.findIndex(h => /debit|withdraw/.test(h))
    const creditIdx = header.findIndex(h => /credit|deposit/.test(h))

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every((c: any) => !c)) continue

      let date: string | null = null
      if (dateIdx >= 0 && row[dateIdx]) {
        const raw = row[dateIdx]
        if (raw instanceof Date) {
          date = raw.toISOString().split('T')[0]
        } else {
          const parsed = new Date(raw)
          if (!isNaN(parsed.getTime())) date = parsed.toISOString().split('T')[0]
        }
      }
      if (!date) continue

      const description = descIdx >= 0 ? String(row[descIdx] || 'Bank Transaction') : 'Bank Transaction'

      if (debitIdx >= 0 && creditIdx >= 0) {
        const debit = Math.abs(parseFloat(String(row[debitIdx]).replace(/[,$]/g, '')) || 0)
        const credit = Math.abs(parseFloat(String(row[creditIdx]).replace(/[,$]/g, '')) || 0)
        if (debit > 0) expenses.push({ date, description, source: description, amount: debit, category: 'other', notes: 'Extracted via Excel (local)' })
        if (credit > 0) incomes.push({ date, description, source: description, amount: credit, notes: 'Extracted via Excel (local)' })
      } else if (amtIdx >= 0 && row[amtIdx] !== '') {
        const amount = parseFloat(String(row[amtIdx]).replace(/[,$]/g, ''))
        if (isNaN(amount)) continue
        const entry = { date, description, source: description, amount: Math.abs(amount), category: 'other', notes: 'Extracted via Excel (local)' }
        if (amount < 0) expenses.push(entry)
        else incomes.push(entry)
      }
    }
  }

  return { incomes, expenses }
}

async function excelToCsvText(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  return workbook.SheetNames.map(name =>
    `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`
  ).join('\n\n').slice(0, 30_000) // cap to avoid token overflow
}

async function parseImageFallback(buffer: Buffer): Promise<{ incomes: any[]; expenses: any[] }> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data: { text } } = await worker.recognize(buffer)
    return localPatternMatch(text)
  } finally {
    await worker.terminate()
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { storage_path, content_type: ctHint, preferred_currency } = await req.json()
    if (!storage_path) return NextResponse.json({ error: 'Missing storage_path' }, { status: 400 })

    const contentType = detectContentType(storage_path, ctHint)
    const isImage = contentType.startsWith('image/')
    const isExcel = EXCEL_TYPES.includes(contentType)

    const { data: urlData } = await supabase.storage.from('user_documents').createSignedUrl(storage_path, 120)
    if (!urlData) throw new Error('Could not access document')

    const fileRes = await fetch(urlData.signedUrl)
    const buffer = Buffer.from(await fileRes.arrayBuffer())

    let parsedData: any = null
    let method = 'ai'
    let aiError: string | null = null

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const base64 = buffer.toString('base64')
        const PROMPT = `Analyze this financial document.

If it is an AMORTIZATION SCHEDULE (a table showing a loan's periodic payment breakdown with columns for payment number/date, total payment, principal portion, interest portion, and/or remaining balance):
Return ONLY this JSON (no markdown, no explanation):
{"type":"loan_schedule","loan":{"name":"<loan type or purpose e.g. '2nd Hand Car', 'Home Mortgage'>","lender":"<financing company or bank name e.g. 'Asialink Finance Corporation', 'BDO Unibank'>","principal":<original loan amount as number>,"interest_rate":<ANNUAL rate as percentage — if only monthly rate is shown, multiply by 12; prefer Annual EIR if present>,"duration_months":<term in months>,"start_date":"<date released or loan origination date as YYYY-MM-DD>","currency":"<3-letter ISO code e.g. PHP for Philippine Peso, USD for US Dollar>"}}

Otherwise, if it is a BANK STATEMENT or list of financial transactions:
Return ONLY this JSON (no markdown, no explanation):
{"type":"transactions","incomes":[{"date":"YYYY-MM-DD","source":"...","description":"...","amount":<number>,"currency":"..."}],"expenses":[{"date":"YYYY-MM-DD","description":"...","amount":<number>,"currency":"..."}]}`

        let messageContent: any[]

        if (isImage) {
          messageContent = [
            { type: 'image', source: { type: 'base64', media_type: contentType as 'image/jpeg' | 'image/png', data: base64 } },
            { type: 'text', text: PROMPT },
          ]
        } else if (isExcel) {
          const csvText = await excelToCsvText(buffer)
          messageContent = [
            { type: 'text', text: `Bank statement data (CSV):\n\n${csvText}\n\n${PROMPT}` },
          ]
        } else {
          messageContent = [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: PROMPT },
          ]
        }

        const message = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{ role: 'user', content: messageContent }],
        })

        const raw = (message.content[0] as any).text.trim()
        parsedData = JSON.parse(raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, ''))
      } catch (err: any) {
        aiError = err.message
        console.warn('[parse-statement] AI failed:', err.message)
      }
    }

    if (!parsedData) {
      method = 'local'
      try {
        if (isImage) {
          parsedData = await parseImageFallback(buffer)
        } else if (isExcel) {
          parsedData = await parseExcelFallback(buffer)
        } else {
          const { PDFParse } = await import('pdf-parse')
          const parser = new PDFParse({ data: buffer })
          const result = await parser.getText()
          console.log('[local-parser] pdf text length:', result.text.length)
          if (isAmortizationScheduleText(result.text)) {
            const loanData = parseAmortizationLocal(result.text, preferred_currency || 'USD')
            if (loanData) {
              parsedData = loanData
            } else {
              throw new Error('Could not extract loan data from this amortization schedule. Please add the loan manually in the Loans section.')
            }
          } else {
            parsedData = localPatternMatch(result.text)
          }
        }
      } catch (localErr: any) {
        const aiDetail = aiError ? ` AI error: ${aiError}.` : ''
        throw new Error(`Parsing failed.${aiDetail} Local: ${localErr.message}`)
      }
    }

    // Amortization schedule — create a loan, not expenses
    if (parsedData.type === 'loan_schedule' && parsedData.loan) {
      const l = parsedData.loan
      const loan = await createLoan(supabase, {
        name: l.name || 'Imported Loan',
        lender: l.lender || undefined,
        principal: Number(l.principal) || 0,
        currency: l.currency || preferred_currency || 'USD',
        interest_rate: Number(l.interest_rate) || 0,
        duration_months: Number(l.duration_months) || 12,
        start_date: l.start_date || new Date().toISOString().split('T')[0],
      })
      return NextResponse.json({ success: true, type: 'loan_schedule', loan_name: loan.name, method })
    }

    // Bank statement transactions
    const currency = parsedData.currency || preferred_currency || 'USD'
    const incomeRows = parsedData.incomes ?? []
    const expenseRows = parsedData.expenses ?? []
    let incomeCount = 0
    let expenseCount = 0

    if (incomeRows.length) {
      const { error } = await supabase.from('incomes').insert(
        incomeRows.map((i: any) => ({
          user_id: user.id,
          source: i.source || 'Bank Statement',
          amount: Math.abs(Number(i.amount)) || 0,
          date: i.date || new Date().toISOString().split('T')[0],
          currency,
          frequency: 'one-time',
          notes: i.notes || `Imported via ${method}`,
        }))
      )
      if (!error) incomeCount = incomeRows.length
    }

    if (expenseRows.length) {
      const { error } = await supabase.from('expenses').insert(
        expenseRows.map((e: any) => ({
          user_id: user.id,
          description: e.description || 'Bank Statement Transaction',
          amount: Math.abs(Number(e.amount)) || 0,
          date: e.date || new Date().toISOString().split('T')[0],
          currency,
          category: e.category || 'other',
          is_recurring: false,
          notes: e.notes || `Imported via ${method}`,
        }))
      )
      if (!error) expenseCount = expenseRows.length
    }

    return NextResponse.json({ success: true, type: 'transactions', total: incomeCount + expenseCount, incomes: incomeCount, expenses: expenseCount, method })
  } catch (err: any) {
    console.error('[parse-statement] Fatal Error:', err)
    return NextResponse.json({ error: err.message || 'Fatal server error' }, { status: 500 })
  }
}
