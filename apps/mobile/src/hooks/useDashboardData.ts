import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  aggregateDashboardData,
  getRegionByCurrency,
  DashboardPayload,
} from '@stashflow/core';

interface UseDashboardDataResult {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const [incomes, expenses, loans, goals, rates, profile] = await Promise.all([
          supabase.from('incomes').select('*').eq('user_id', user.id),
          supabase.from('expenses').select('*').eq('user_id', user.id),
          supabase.from('loans').select('*').eq('user_id', user.id),
          supabase.from('goals').select('*').eq('user_id', user.id),
          supabase.from('exchange_rates').select('target, rate'),
          supabase.from('profiles').select('*').eq('id', user.id).single(),
        ]);

        const ratesMap = (rates.data || []).reduce(
          (acc: Record<string, number>, curr: { target: string; rate: number }) => {
            acc[curr.target] = curr.rate;
            return acc;
          },
          { USD: 1 }
        );

        const currency = profile.data?.preferred_currency || 'USD';

        setData(aggregateDashboardData({
          incomes: incomes.data || [],
          expenses: expenses.data || [],
          loans: loans.data || [],
          goals: goals.data || [],
          rates: ratesMap,
          region: getRegionByCurrency(currency),
          currency,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
