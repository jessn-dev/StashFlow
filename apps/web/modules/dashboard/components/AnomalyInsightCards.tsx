'use client';

import { useEffect, useState } from 'react';
import { createClient } from '~/lib/supabase/client';

interface Anomaly {
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommended_action: string;
}

/**
 * Fetches spending anomalies from the detect-anomalies edge function (backed by
 * the Python FastAPI statistical analysis pipeline) and renders each as a Risk
 * card in the Intelligence Feed. Renders nothing when there are no anomalies or
 * insufficient data — the feed stays clean.
 *
 * @returns A JSX fragment of anomaly cards, or null.
 */
export function AnomalyInsightCards() {
  /*
   * PSEUDOCODE:
   * 1. On mount, invoke detect-anomalies edge function.
   * 2. If response contains anomalies array, store in state.
   * 3. If no anomalies (clean spending), render nothing.
   * 4. For each anomaly, render a Risk-type card with description + recommended action.
   * 5. Elevate high-severity anomalies with "High Priority" badge.
   */
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.functions.invoke('detect-anomalies').then(({ data }) => {
      if (data?.anomalies && data.anomalies.length > 0) setAnomalies(data.anomalies as Anomaly[]);
    });
  }, []);

  if (anomalies.length === 0) return null;

  return (
    <>
      {anomalies.map((anomaly, i) => (
        <div
          key={i}
          className="rounded-3xl overflow-hidden"
          style={{
            background: '#FFF1F2',
            border: '1px solid #FECDD3',
            padding: '24px',
            borderRadius: '24px',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#FFE4E6', color: '#9F1239' }}
            >
              ◆ Spending Anomaly
            </span>
            {anomaly.severity === 'high' && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                High Priority
              </span>
            )}
          </div>

          <p
            className="font-semibold text-gray-900 leading-snug mb-2"
            style={{ fontSize: '18px', lineHeight: '1.4' }}
          >
            {anomaly.description}
          </p>

          <p className="text-sm text-gray-500" style={{ lineHeight: '1.5' }}>
            {anomaly.recommended_action}
          </p>
        </div>
      ))}
    </>
  );
}
