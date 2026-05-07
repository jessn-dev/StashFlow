'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useTransition, useCallback } from 'react';

interface Props {
  dateFrom: string;
  dateTo: string;
  type: 'all' | 'income' | 'expense';
  search: string;
}

function computePresetRange(preset: string): { from: string; to: string } {
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

export function TransactionFiltersBar({ dateFrom, dateTo, type, search }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => { setSearchValue(search); }, [search]);

  const buildUrl = useCallback(
    (updates: Partial<{ from: string; to: string; type: string; q: string }>) => {
      const merged = { from: dateFrom, to: dateTo, type, q: searchValue, ...updates };
      const params = new URLSearchParams();
      if (merged.from) params.set('from', merged.from);
      if (merged.to) params.set('to', merged.to);
      if (merged.type && merged.type !== 'all') params.set('type', merged.type);
      if (merged.q) params.set('q', merged.q);
      return `/dashboard/transactions?${params.toString()}`;
    },
    [dateFrom, dateTo, type, searchValue],
  );

  useEffect(() => {
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
