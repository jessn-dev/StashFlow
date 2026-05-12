'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useTransition, useCallback } from 'react';

/**
 * Properties for the TransactionFiltersBar component.
 */
interface Props {
  /** The starting ISO date string (YYYY-MM-DD) for the filter range. */
  dateFrom: string;
  /** The ending ISO date string (YYYY-MM-DD) for the filter range. */
  dateTo: string;
  /** The transaction category type filter. */
  type: 'all' | 'income' | 'expense';
  /** The current search query string. */
  search: string;
}

/**
 * Calculates start and end dates based on predefined time range presets.
 * 
 * @param preset - The identifier for the date range (e.g., '7d', 'month').
 * @returns An object containing the from and to date strings in ISO format.
 */
function computePresetRange(preset: string): { from: string; to: string } {
  // PSEUDOCODE:
  // 1. Get current date as baseline.
  // 2. Based on preset key:
  //    - '7d'/'30d': Subtract N-1 days from today.
  //    - 'month': Set start to 1st of current month, end to today.
  //    - 'last-month': Set start to 1st of previous month, end to last day of previous month.
  //    - 'quarter': Calculate start of current calendar quarter.
  //    - 'year': Set start to Jan 1st of current year.
  // 3. Format result as YYYY-MM-DD strings.

  const today = new Date();
  const toStr = today.toISOString().split('T')[0]!;

  switch (preset) {
    case '7d': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split('T')[0]!, to: toStr };
    }
    case '30d': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().split('T')[0]!, to: toStr };
    }
    case 'month':
      return { from: toStr.slice(0, 7) + '-01', to: toStr };
    case 'last-month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: first.toISOString().split('T')[0]!, to: last.toISOString().split('T')[0]! };
    }
    case 'quarter': {
      const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      return { from: qStart.toISOString().split('T')[0]!, to: toStr };
    }
    case 'year':
      return { from: `${today.getFullYear()}-01-01`, to: toStr };
    default:
      return { from: toStr.slice(0, 7) + '-01', to: toStr };
  }
}

/**
 * Determines which preset, if any, matches the current date filter range.
 * 
 * @param dateFrom - Current start date string.
 * @param dateTo - Current end date string.
 * @returns The key of the matching preset, or 'custom' if none match.
 */
function detectActivePreset(dateFrom: string, dateTo: string): string {
  const presets = ['7d', '30d', 'month', 'last-month', 'quarter', 'year'];
  for (const p of presets) {
    const { from, to } = computePresetRange(p);
    if (from === dateFrom && to === dateTo) return p;
  }
  return 'custom';
}

const PRESETS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'month', label: 'Month' },
  { key: 'last-month', label: 'Last Mo.' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
] as const;

const TYPES = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expense' },
] as const;

/**
 * Interactive filter bar for transactions including search, date presets, and type filters.
 * Synchronizes filter state with the URL query parameters.
 * 
 * @param props - Component properties.
 * @returns A rendered filter bar component.
 */
export function TransactionFiltersBar({ dateFrom, dateTo, type, search }: Props) {
  const router = useRouter();
  // useTransition allows the UI to stay responsive during navigation-triggered re-renders
  const [, startTransition] = useTransition();
  // Local state for search value to allow for immediate UI feedback before debounced sync
  const [searchValue, setSearchValue] = useState(search);

  // Keep local search state in sync with external prop changes (e.g., from browser back button)
  useEffect(() => { setSearchValue(search); }, [search]);

  /**
   * Constructs the target dashboard URL with merged filter parameters.
   */
  const buildUrl = useCallback(
    (updates: Partial<{ from: string; to: string; type: string; q: string }>) => {
      const merged = { from: dateFrom, to: dateTo, type, q: searchValue, ...updates };
      const params = new URLSearchParams();
      if (merged.from) params.set('from', merged.from);
      if (merged.to) params.set('to', merged.to);
      // 'all' is the default and omitted from URL to keep it clean
      if (merged.type && merged.type !== 'all') params.set('type', merged.type);
      if (merged.q) params.set('q', merged.q);
      return `/dashboard/transactions?${params.toString()}`;
    },
    [dateFrom, dateTo, type, searchValue],
  );

  useEffect(() => {
    // PSEUDOCODE:
    // 1. Check if local search value differs from current filter prop.
    // 2. If same, do nothing.
    // 3. If different, start a debounce timer (400ms).
    // 4. On timer expiry, trigger a router replacement to update URL with new search term.
    // 5. Wrap router call in startTransition to keep search input fluid.
    // 6. Cleanup timer if value changes before expiry.

    if (searchValue === search) return;
    const timer = setTimeout(() => {
      startTransition(() => { router.replace(buildUrl({ q: searchValue })); });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, search, buildUrl, router]);

  const activePreset = detectActivePreset(dateFrom, dateTo);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="search"
          placeholder="Search transactions…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-gray-400 outline-none transition-colors"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Date presets */}
      <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-xl">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              const range = computePresetRange(p.key);
              startTransition(() => { router.replace(buildUrl(range)); });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePreset === p.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
        {/* Custom state shown when manual dates are in effect and don't match any preset */}
        {activePreset === 'custom' && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-900 shadow-sm">
            Custom
          </span>
        )}
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-xl">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => startTransition(() => { router.replace(buildUrl({ type: t.key })); })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              type === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
