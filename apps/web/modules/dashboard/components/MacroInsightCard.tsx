'use client';

import { useEffect, useState } from 'react';
import { createClient } from '~/lib/supabase/client';

/**
 * Maps @stashflow/core Region values to the display names expected by the
 * macro-financial-advisor edge function's REGIONAL_FALLBACKS and AI prompt.
 */
const REGION_DISPLAY: Record<string, string> = {
  US: 'USA',
  PH: 'Philippines',
  SG: 'Singapore',
  JPY: 'Japan',
};

interface MacroAlert {
  type: 'info' | 'warning';
  message: string;
}

interface MacroIndicator {
  label: string;
  value: string;
  status: 'up' | 'down' | 'stable';
  source: string;
}

interface MacroData {
  strategyShift: string;
  rationale: string;
  alerts: MacroAlert[];
  indicators: MacroIndicator[];
  _meta: { modelUsed: string; timestamp: string };
}

/**
 * Properties for the MacroInsightCard component.
 */
interface Props {
  /** The user's preferred currency code (e.g. 'USD', 'PHP'). */
  currency: string;
  /** The core Region identifier (e.g. 'US', 'PH', 'SG', 'JPY'). */
  region: string;
}

/**
 * Fetches regional macroeconomic intelligence from the macro-financial-advisor
 * edge function and renders it as a forecast card in the Intelligence Feed.
 * Respects the shared 24-hour cache — most renders return instantly from cache.
 *
 * @param props - Component properties.
 * @returns A JSX element with macro intelligence, or null on error.
 */
export function MacroInsightCard({ currency, region }: Props) {
  /*
   * PSEUDOCODE:
   * 1. On mount, invoke macro-financial-advisor with currency + display region.
   * 2. While fetching, render a purple-tinted skeleton card matching feed height.
   * 3. On error or empty response, render nothing (don't break the feed).
   * 4. On success, render strategy shift as headline, first alert as subtext,
   *    and top 4 indicators as small inline pills.
   */
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.functions
      .invoke('macro-financial-advisor', {
        body: { currency, region: REGION_DISPLAY[region] ?? region },
      })
      .then(({ data: res }) => {
        if (res && !res.error) setData(res as MacroData);
      })
      .finally(() => setLoading(false));
  }, [currency, region]);

  if (loading) {
    return (
      <div
        className="rounded-3xl border border-purple-100 bg-purple-50 animate-pulse"
        style={{ height: '120px', borderRadius: '24px' }}
      />
    );
  }

  if (!data) return null;

  const firstAlert = data.alerts?.[0];
  const isAiGenerated =
    data._meta?.modelUsed &&
    data._meta.modelUsed !== 'cache' &&
    data._meta.modelUsed !== 'static-fallback';

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: '#FAF5FF',
        border: '1px solid #E9D5FF',
        padding: '24px',
        borderRadius: '24px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: '#F3E8FF', color: '#6B21A8' }}
        >
          ◈ Macro Forecast
        </span>
        {isAiGenerated && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            AI Generated
          </span>
        )}
      </div>

      {/* Strategy shift — headline insight */}
      <p
        className="font-semibold text-gray-900 leading-snug mb-2"
        style={{ fontSize: '18px', lineHeight: '1.4' }}
      >
        {data.strategyShift}
      </p>

      {/* First alert as supporting context */}
      {firstAlert && (
        <p
          className="text-sm mb-3"
          style={{
            lineHeight: '1.5',
            color: firstAlert.type === 'warning' ? '#92400E' : '#4B5563',
          }}
        >
          {firstAlert.message}
        </p>
      )}

      {/* Top 4 economic indicators as pills */}
      {data.indicators && data.indicators.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {data.indicators.slice(0, 4).map((ind, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-lg px-2.5 py-1"
            >
              <span className="text-[10px] font-medium text-gray-500">{ind.label}</span>
              <span className="text-[10px] font-bold text-gray-900">{ind.value}</span>
              <span
                style={{
                  fontSize: '10px',
                  color:
                    ind.status === 'up'
                      ? '#10b981'
                      : ind.status === 'down'
                        ? '#ef4444'
                        : '#9ca3af',
                }}
              >
                {ind.status === 'up' ? '↑' : ind.status === 'down' ? '↓' : '→'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
