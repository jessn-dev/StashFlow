'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '~/lib/supabase/client';

interface RateRow {
  base: string;
  target: string;
  rate: number;
  fetched_at: string;
}

/**
 * Properties for the CurrencyConverterWidget component.
 */
interface Props {
  /** The user's preferred currency, pre-selected as the "from" currency. */
  defaultCurrency: string;
}

/**
 * Returns a human-readable relative time string from an ISO timestamp.
 *
 * @param iso - ISO 8601 date string.
 * @returns Relative time string (e.g. "2h ago", "just now").
 */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 2) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

/**
 * Returns the display label for a currency code using the Intl API.
 * Falls back to the raw code if the locale data is unavailable.
 *
 * @param code - ISO 4217 currency code (e.g. 'PHP').
 * @returns Display label (e.g. 'PHP — Philippine Peso').
 */
function currencyLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code);
    return name ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

/**
 * Formats a numeric amount as a localized currency string.
 *
 * @param val - Numeric amount.
 * @param currency - ISO 4217 currency code.
 * @param maxDecimals - Override max fraction digits.
 * @returns Formatted currency string.
 */
function formatAmt(val: number, currency: string, maxDecimals?: number): string {
  // BUSINESS RULE: JPY and other zero-decimal currencies should show no fraction digits.
  const isZeroDecimal = ['JPY', 'KRW', 'ISK', 'HUF', 'CZK'].includes(currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: maxDecimals ?? (isZeroDecimal ? 0 : 4),
  }).format(val);
}

/**
 * An interactive currency converter backed by live ECB reference rates stored in
 * the exchange_rates table (synced via sync-exchange-rates cron from Frankfurter API).
 * Supports all ~30 currencies that the ECB publishes reference rates for.
 *
 * @param props - Component properties.
 * @returns A JSX element containing the converter UI.
 */
export function CurrencyConverterWidget({ defaultCurrency }: Props) {
  /*
   * PSEUDOCODE:
   * 1. On mount, fetch all exchange_rates rows from DB.
   * 2. Derive the sorted list of available currencies from USD-base rows.
   * 3. Pre-select from = user's preferred currency, to = USD (or PHP if user is USD).
   * 4. On input change, look up direct (base=from, target=to) row; triangulate via
   *    USD if no direct row exists (e.g. cross-rates not yet in DB).
   * 5. Display converted result, unit rate, last-updated time, and bank-rate caveat.
   */

  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultCurrency || 'USD');
  const [to, setTo] = useState(defaultCurrency === 'USD' ? 'PHP' : 'USD');
  const [amount, setAmount] = useState('1000');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('exchange_rates')
      .select('base, target, rate, fetched_at')
      .then(({ data }) => {
        if (data) setRates(data as RateRow[]);
        setLoading(false);
      });
  }, []);

  // Derive sorted currency list from USD-base rows (canonical source of all supported currencies).
  // USD itself is added explicitly since it won't appear as a target of a USD-base row.
  const currencies = useMemo(() => {
    const fromUsd = rates.filter((r) => r.base === 'USD').map((r) => r.target);
    const all = Array.from(new Set(['USD', ...fromUsd])).sort();
    return all;
  }, [rates]);

  const getDirectRow = useCallback(
    (fromC: string, toC: string): RateRow | undefined =>
      rates.find((r) => r.base === fromC && r.target === toC),
    [rates],
  );

  const computeRate = useCallback(
    (fromC: string, toC: string): number | null => {
      if (fromC === toC) return 1;
      const direct = getDirectRow(fromC, toC);
      if (direct) return direct.rate;
      // Triangulate via USD for any pair missing from DB
      const toUsd = getDirectRow(fromC, 'USD');
      const fromUsd = getDirectRow('USD', toC);
      if (toUsd && fromUsd) return toUsd.rate * fromUsd.rate;
      return null;
    },
    [getDirectRow],
  );

  const rate = computeRate(from, to);
  const numAmount = Number.parseFloat(amount) || 0;
  const converted = rate !== null ? numAmount * rate : null;
  const directRow = getDirectRow(from, to);
  const updatedAt = directRow?.fetched_at;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-9 bg-gray-100 rounded-xl" />
        <div className="h-9 bg-gray-100 rounded-xl" />
        <div className="h-8 bg-gray-50 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* From: amount + currency */}
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent tabular-nums"
          placeholder="0"
          min={0}
        />
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-20 px-2 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white cursor-pointer"
        >
          {currencies.map((c) => (
            <option key={c} value={c} title={currencyLabel(c)}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* To: result + currency */}
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl min-w-0">
          <p className="text-sm font-bold text-gray-900 tabular-nums truncate">
            {converted !== null ? formatAmt(converted, to) : '—'}
          </p>
        </div>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-20 px-2 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white cursor-pointer"
        >
          {currencies.map((c) => (
            <option key={c} value={c} title={currencyLabel(c)}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Swap */}
      <button
        onClick={swap}
        className="w-full text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors py-0.5 flex items-center justify-center gap-1.5"
        aria-label="Swap currencies"
      >
        <span aria-hidden>⇄</span> Swap
      </button>

      {/* Rate + timestamp */}
      {rate !== null && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            1 {from} = {formatAmt(rate, to, 4)} {to}
            {updatedAt && (
              <span className="text-gray-300"> · {timeAgo(updatedAt)}</span>
            )}
          </p>

          {/* Bank rate caveat */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-amber-700 leading-relaxed">
              <span className="font-bold">Why is this different from your bank?</span>
              {' '}These are ECB mid-market reference rates — the interbank benchmark.
              Banks and remittance services apply a spread of{' '}
              <span className="font-semibold">1–5%</span> on top as their margin.
              For transfers, Wise or Revolut typically offer rates closest to this benchmark.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
