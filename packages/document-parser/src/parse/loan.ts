import type { ExtractedLoanData } from '../types.ts'

function num(text: string, ...patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return parseFloat(m[1].replace(/,/g, ''))
  }
  return null
}

function str(text: string, ...patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

export function parseLoan(text: string): ExtractedLoanData {
  return {
    name: str(text,
      /loan name[:\s]+([^\n\r,]+)/i,
      /product(?:\s*name)?[:\s]+([^\n\r,]+)/i,
    ) ?? 'Unknown Loan',
    principal: num(text,
      /(?:loan|principal)\s*amount[:\s₱$€£]+?([\d,]+(?:\.\d+)?)/i,
      /amount\s*(?:financed|borrowed|disbursed)[:\s₱$€£]+?([\d,]+(?:\.\d+)?)/i,
      /(?:outstanding|original)\s*balance[:\s₱$€£]+?([\d,]+(?:\.\d+)?)/i,
    ) ?? 0,
    currency: str(text, /currency[:\s]+(USD|PHP|SGD|EUR|GBP)/i) ?? detectCurrency(text) ?? 'USD',
    interest_rate: num(text,
      /annual\s+(?:effective\s+interest\s+rate|EIR)[:\s]+([\d.]+)\s*%/i,
      /(?:annual|nominal|effective)?\s*interest\s*rate[:\s]+([\d.]+)\s*%/i,
      /\bAPR\b[:\s]+([\d.]+)\s*%/i,
      /\brate\b[:\s]+([\d.]+)\s*%\s*(?:per\s*annum|p\.?a\.?)/i,
    ) ?? 0,
    duration_months: extractMonths(text) ?? 0,
    installment_amount: num(text,
      /(?:monthly|regular)\s*(?:payment|installment|amortization)[:\s₱$€£]+?([\d,]+(?:\.\d+)?)/i,
      /(?:installment|amortization)\s*amount[:\s₱$€£]+?([\d,]+(?:\.\d+)?)/i,
    ) ?? 0,
    lender: str(text,
      /(?:lender|creditor|bank|financial\s*institution)[:\s]+([^\n\r,]+)/i,
      /financed\s*by[:\s]+([^\n\r,]+)/i,
    ),
    start_date: extractDate(text),
    interest_type: (inferInterestType(text) as any) ?? 'Standard Amortized',
    interest_basis: inferInterestBasis(text),
    inferred_type: inferDocType(text),
  }
}

function detectCurrency(t: string): string | null {
  if (/₱|php|peso/i.test(t)) return 'PHP'
  if (/sgd|\bS\$/i.test(t)) return 'SGD'
  if (/\beur\b|€/i.test(t)) return 'EUR'
  if (/\bgbp\b|£/i.test(t)) return 'GBP'
  if (/\$|usd/i.test(t)) return 'USD'
  return null
}

function extractMonths(t: string): number | null {
  const m = t.match(/(?:loan\s*)?(?:term|duration|tenor|period)[:\s]+(\d+)\s*months?/i)
  if (m?.[1]) return parseInt(m[1])
  const y = t.match(/(?:loan\s*)?(?:term|duration|tenor|period)[:\s]+(\d+)\s*years?/i)
  if (y?.[1]) return parseInt(y[1]) * 12
  const alt = t.match(/(\d+)[- ]month\s+(?:loan|term|tenor)/i)
  if (alt?.[1]) return parseInt(alt[1])
  return null
}

function extractDate(t: string): string | null {
  const m = t.match(
    /(?:start|loan|disbursement|release|value|effective)\s*date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  )
  if (!m?.[1]) return null
  try {
    const d = new Date(m[1])
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

function inferInterestType(t: string): string | null {
  if (/add[- ]on\s*interest/i.test(t)) return 'Add-on Interest'
  if (/interest[- ]only/i.test(t)) return 'Interest-Only'
  if (/fixed\s*principal/i.test(t)) return 'Fixed Principal'
  if (/(?:standard\s*)?amortiz/i.test(t)) return 'Standard Amortized'
  return null
}

function inferInterestBasis(t: string): string | null {
  if (/actual\s*\/\s*360/i.test(t)) return 'Actual/360'
  if (/actual\s*\/\s*365/i.test(t)) return 'Actual/365'
  if (/30\s*\/\s*360/i.test(t)) return '30/360'
  return null
}

function inferDocType(t: string): string | null {
  if (/mortgage|housing\s*loan/i.test(t)) return 'Housing Loan'
  if (/auto|vehicle|car\s*loan/i.test(t)) return 'Auto Loan'
  if (/personal\s*loan/i.test(t)) return 'Personal Loan'
  if (/business|commercial\s*loan/i.test(t)) return 'Business Loan'
  if (/student|education\s*loan/i.test(t)) return 'Education Loan'
  return 'Loan'
}
