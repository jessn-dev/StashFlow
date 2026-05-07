import { ExtractedLoanData } from '../types.ts'

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

// Semantic clusters for labels — strictly generic to handle any global document
const PRINCIPAL_LABELS   = 'principal|loan\\s*amount|financed|original\\s*balance|original\\s*loan|contract\\s*amount|loan\\s*value|total\\s*loan'
const RATE_LABELS        = 'interest\\s*rate|APR|EIR|nominal\\s*rate|effective\\s*rate|yield|cost\\s*of\\s*borrowing|rate\\s*of\\s*interest'
const INSTALLMENT_LABELS = 'monthly\\s*amort|installment|regular\\s*payment|scheduled\\s*payment|repayment\\s*amount|periodic\\s*payment|amortization\\s*amount'
const LENDER_LABELS      = 'lender|creditor|bank|institution|originator|servicer|serviced\\s*by|financed\\s*by'
const TERM_LABELS        = 'term|duration|tenor|period|tenure|length'

export function parseLoan(text: string): ExtractedLoanData {
  // Normalize text for heuristic analysis
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.length > 0)

  return {
    name: str(text,
      // Priority 1: Label + Value (limit length to avoid header bleed)
      new RegExp(`(?:loan|product)\\s*(?:name|type|description)[:\\s]+([^\\n\\r,]{3,40})`, 'i'),
      /type\\s*of\\s*loan[:\\s]+([^\\n\\r,]{3,40})/i,
      // Priority 2: Title heuristic
      /([^\\n\\r,]{3,40})\\s*(?:amortization|disclosure|ledger|loan\\s*summary)/i,
    ),
    principal: num(text,
      // Priority 1: Multi-word exact matches (Highest precision)
      /outstanding\\s*principal\\s*balance[:\\s₱$€£]+?([\\d,]+(?:\\.\\d+)?)/i,
      /original\\s*loan\\s*amount[:\\s₱$€£]+?([\\d,]+(?:\\.\\d+)?)/i,
      // Priority 2: Label + Value (NEGATIVE LOOKBEHIND: Ignore if preceded by payment-related words)
      new RegExp(`(?<!regular|monthly|scheduled|payment|amortization)\\s+(?:${PRINCIPAL_LABELS})\\s*[:\\s₱$€£]*[\\r\\n]*\\s*[:\\s₱$€£]*\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'),
      // Priority 3: Last resort large amount
      /amount\\s*[:\\s₱$€£]+([1-9][\\d,]{3,}(?:\\.\\d+)?)/i,
    ),
    currency: str(text, /currency[:\\s]+(USD|PHP|SGD|EUR|GBP)/i) ?? detectCurrency(text),
    interest_rate: num(text,
      // Priority 1: Annual EIR (use RegExp ctor — regex literals in this file have double-backslash encoding)
      new RegExp('annual\\s+(?:effective\\s+interest\\s+rate|EIR)[:\\s]+([\\d.]+)\\s*%', 'i'),
      new RegExp('effective\\s+interest\\s+rate[:\\s]+([\\d.]+)\\s*%', 'i'),
      // Priority 2: Generic Labels
      new RegExp(`(?:${RATE_LABELS})\\s*[:\\s]*[\\r\\n]*\\s*([\\d.]+)\\s*%`, 'i'),
      // Priority 3: Standalone percentage if \"interest\" or \"rate\" is nearby
      /(?:interest|rate)[^\\n\\r]{0,30}?([\\d.]+)\\s*%/i,
    ),
    duration_months: extractMonths(text),
    installment_amount: num(text,
      // Priority 1: Multi-word exact matches
      /regular\\s*monthly\\s*payment\\s*amount[:\\s₱$€£]+?([\\d,]+(?:\\.\\d+)?)/i,
      /monthly\\s*amortization[:\\s₱$€£]+?([\\d,]+(?:\\.\\d+)?)/i,
      // Priority 2: Generic Labels
      new RegExp(`(?:${INSTALLMENT_LABELS})\\s*[:\\s₱$€£]*[\\r\\n]*\\s*[:\\s₱$€£]*\\s*([\\d,]+(?:\\.\\d+)?)`, 'i'),
    ),
    lender: str(text,
      // Priority 1: Formal Labels (Support "of" connectors like Bank of...)
      new RegExp(`(?:${LENDER_LABELS})(?:\\s*of)?[:\\s]+([^\\n\\r,]{3,50})`, 'i'),
      // Priority 2: Header Heuristic — The first non-empty line of a document is often the Bank Name
      ...lines.slice(0, 3).map(line => new RegExp(`^(${line.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')})$`, 'm')),
    ),
    start_date: extractDate(text),
    interest_type: inferInterestType(text),
    interest_basis: inferInterestBasis(text),
    inferred_type: inferDocType(text),
  }
}

function detectCurrency(t: string): string | null {
  if (/₱|php|peso|phil[.\s]?peso/i.test(t)) return 'PHP'
  if (/sgd|\bS\$|sing[.\s]?dollar/i.test(t)) return 'SGD'
  if (/\beur\b|€|euro/i.test(t)) return 'EUR'
  if (/\bgbp\b|£|pound|sterling/i.test(t)) return 'GBP'
  if (/\$|usd|u[.\s]?s[.\s]?dollar/i.test(t)) return 'USD'
  return null
}

function extractMonths(t: string): number | null {
  // 1. Date Range Pattern: MM/DD/YYYY to MM/DD/YYYY or Mon-YY to Mon-YY
  const rangeM = t.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[a-z]{3}[- ]\d{2})\s*to\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[a-z]{3}[- ]\d{2})/i)
  if (rangeM?.[1] && rangeM?.[2]) {
    const start = parseFlexibleDate(rangeM[1])
    const end = parseFlexibleDate(rangeM[2])
    if (start && end) {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
      return Math.max(1, Math.abs(months))
    }
  }

  // 2. Pure number after Term:
  const termM = t.match(new RegExp(`(?:${TERM_LABELS})[:\\s]+(\\d+)\\s*$`, 'im')) 
  if (termM?.[1]) return parseInt(termM[1])
  
  // 3. Standard text patterns
  const m = t.match(new RegExp(`(?:${TERM_LABELS})[:\\s]+(\\d+)\\s*months?`, 'i'))
  if (m?.[1]) return parseInt(m[1])
  const y = t.match(new RegExp(`(?:${TERM_LABELS})[:\\s]+(\\d+)\\s*years?`, 'i'))
  if (y?.[1]) return parseInt(y[1]) * 12
  return null
}

function parseFlexibleDate(s: string): Date | null {
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  
  // Try Mon-YY (e.g., Mar-20)
  const m = s.match(/([a-z]{3})[- ](\d{2})/i)
  if (m?.[1] && m?.[2]) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const monthIdx = months.indexOf(m[1].toLowerCase())
    if (monthIdx !== -1) {
      return new Date(2000 + parseInt(m[2]), monthIdx, 1)
    }
  }
  return null
}

function extractDate(t: string): string | null {
  const DATE_LABELS = 'released|disbursement|disbursed|effective|value|booking|start|loan|contract|commencement|D\\.V\\.'
  const m = t.match(
    new RegExp(`(?:${DATE_LABELS})\\s*(?:date)?\\s*[:\\s]+(\\d{1,2}[\\/\\-\\.\\s]\\d{1,2}[\\/\\-\\.\\s]\\d{2,4})`, 'i')
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
  const types = [
    { label: 'Housing Loan',   pattern: /mortgage|housing\s*loan/gi },
    { label: 'Auto Loan',      pattern: /auto|vehicle|car\s*loan/gi },
    { label: 'Personal Loan',  pattern: /personal\s*loan/gi },
    { label: 'Business Loan',  pattern: /business|commercial\s*loan/gi },
    { label: 'Education Loan', pattern: /student|education\s*loan|school|tuition/gi },
  ]

  const scores = types.map(type => {
    let score = 0
    const matches = Array.from(t.matchAll(type.pattern))
    
    matches.forEach(match => {
      // 1. Base score for presence
      score += 1
      
      // 2. Weight boost for being at the top of the document (first 500 chars)
      if (match.index! < 500) score += 2
      
      // 3. Weight boost for being in uppercase (titles usually are)
      if (match[0] === match[0].toUpperCase()) score += 1
    })
    
    return { label: type.label, score }
  })

  // Sort by highest score, then by first occurrence (tie breaker)
  const winner = scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)[0]

  return winner?.label ?? 'Loan'
}
