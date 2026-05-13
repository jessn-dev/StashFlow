/**
 * @fileoverview Utility functions for the transaction import pipeline.
 * Handles normalization of raw CSV data into shapes the database accepts.
 */

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Normalizes a raw date string from a bank CSV export into ISO 8601 (YYYY-MM-DD).
 *
 * Handles the formats most commonly seen in PH, US, and SG bank exports:
 * - `YYYY-MM-DD` (ISO — pass-through)
 * - `MM/DD/YYYY` (US/PH banks — BDO, Metrobank, Chase)
 * - `DD/MM/YYYY` (detected when first segment > 12)
 * - `DD-Mon-YYYY` (e.g. `15-Jan-2024` — BPI, DBS)
 * - Any format `new Date()` can parse (last-resort fallback)
 *
 * @param raw - Raw date string from the CSV cell.
 * @returns ISO date string (`YYYY-MM-DD`), or `null` if the format is unrecognizable.
 */
export function normalizeToISODate(raw: string): string | null {
  const s = raw.trim();

  // PSEUDOCODE: Date Normalization
  // 1. Pass through if already ISO.
  // 2. Try slash-delimited (MM/DD or DD/MM detected by first-segment value).
  // 3. Try DD-Mon-YYYY with static month lookup.
  // 4. Fallback to JS Date parser.
  // 5. Return null if all attempts fail.

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    // If first segment > 12 it can't be a month, so treat as DD/MM/YYYY.
    const [month, day] = Number.parseInt(a ?? '0', 10) > 12 ? [b, a] : [a, b];
    return `${year}-${(month ?? '01').padStart(2, '0')}-${(day ?? '01').padStart(2, '0')}`;
  }

  const dmonthMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmonthMatch) {
    const [, day, mon, year] = dmonthMatch;
    const monthNum = MONTH_MAP[(mon ?? '').toLowerCase()];
    if (monthNum) return `${year}-${monthNum}-${(day ?? '01').padStart(2, '0')}`;
  }

  const fallback = new Date(s);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString().split('T')[0] ?? null;

  return null;
}
