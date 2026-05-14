'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@stashflow/core';
import { createClient } from '~/lib/supabase/client';

interface Projection {
  period: string;
  month: string;
  income: number;
  expenses: number;
  debt: number;
  net: number;
}

/**
 * Properties for the CashFlowProjectionChart component.
 */
interface Props {
  /** The currency code for formatting axes and tooltips. */
  currency: string;
}

/**
 * Fetches 12-month forward cash flow projections from the get-cash-flow edge
 * function and renders them as a grouped bar chart.
 *
 * @param props - Component properties.
 * @returns A JSX element with the projection chart or a loading/empty state.
 */
export function CashFlowProjectionChart({ currency }: Props) {
  /*
   * PSEUDOCODE:
   * 1. On mount, invoke the get-cash-flow edge function via the browser Supabase client.
   * 2. Store the returned projections array in state.
   * 3. While loading, render a spinner placeholder.
   * 4. If no projections returned, render nothing (parent shows EmptyChartState).
   * 5. Transform projection data into Recharts-compatible format.
   * 6. Render a grouped BarChart with Income, Expenses, and Debt series.
   */
  const [projections, setProjections] = useState<Projection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.functions
      .invoke('get-cash-flow')
      .then(({ data }) => {
        if (data?.projections) setProjections(data.projections);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (projections.length === 0) return null;

  const chartData = projections.map((p) => ({
    name: p.month,
    Income: p.income,
    Expenses: p.expenses,
    Debt: p.debt,
  }));

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(value) =>
              formatCurrency(value, currency, 'en-US').replace(/\.00$/, '')
            }
          />
          <Tooltip
            cursor={{ fill: '#f9fafb' }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: unknown) => formatCurrency(Number(value), currency)}
          />
          <Legend
            iconType="circle"
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
          />
          <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="Debt" fill="#f97316" radius={[4, 4, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
