'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@stashflow/core';

export interface DebtPayoffPoint {
  month: string;
  total: number;
}

interface Props {
  data: DebtPayoffPoint[];
  currency: string;
}

export function DebtPayoffChart({ data, currency }: Props) {
  const debtFreeIndex = data.findIndex((p) => p.total === 0);
  const debtFreeLabel = debtFreeIndex > 0 ? data[debtFreeIndex]?.month : null;

  // Show every 6th label so x-axis stays readable on long projections
  const tickFormatter = (_: string, index: number) =>
    index % 6 === 0 ? data[index]?.month ?? '' : '';

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={tickFormatter}
            dy={10}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) =>
              formatCurrency(v as number, currency, 'en-US')
                .replace(/\.00$/, '')
                .replace(/,000$/, 'K')
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: unknown) => [
              formatCurrency(Number(value), currency),
              'Remaining debt',
            ]}
          />
          {debtFreeLabel && (
            <ReferenceLine
              x={debtFreeLabel}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{
                value: 'Debt-free',
                position: 'top',
                fontSize: 11,
                fill: '#10b981',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="total"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#debtGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
