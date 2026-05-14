'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { formatCurrency } from '@stashflow/core';
import type { HistoricalSummary, SpendingByCategory } from '@stashflow/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

/**
 * Renders a bar chart comparing historical income vs expenses.
 * 
 * @param props - Component properties.
 * @param props.data - Array of historical monthly financial summaries.
 * @param props.currency - The currency code for formatting tooltips and axes.
 * @returns A JSX element containing a responsive bar chart.
 */
export function CashFlowChart({ data, currency }: Readonly<{ data: HistoricalSummary[], currency: string }>) {
  /*
   * PSEUDOCODE:
   * 1. Transform raw historical data into Recharts-compatible format.
   * 2. Format month strings into short names (e.g., "Jan").
   * 3. Render a responsive container with a BarChart.
   * 4. Configure axes, tooltips, and legends with custom formatting and styles.
   * 5. Define two bars: one for Income (green) and one for Expenses (red).
   */
  const chartData = data.map(item => ({
    name: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
    Income: item.totalIncome,
    Expenses: item.totalExpenses,
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
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            tickFormatter={(value) => formatCurrency(value, currency, 'en-US').replace(/\.00$/, '')}
          />
          <Tooltip 
            cursor={{ fill: '#f9fafb' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: any) => formatCurrency(Number(value), currency)}
          />
          <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
          <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Renders a donut pie chart showing the top spending categories.
 * 
 * @param props - Component properties.
 * @param props.data - Array of spending amounts grouped by category.
 * @param props.currency - The currency code for formatting tooltips.
 * @returns A JSX element containing a pie chart.
 */
export function SpendingPieChart({ data, currency }: Readonly<{ data: SpendingByCategory[], currency: string }>) {
  /*
   * PSEUDOCODE:
   * 1. Slice the top 6 spending categories to prevent visual clutter.
   * 2. Format category names and map amounts to values.
   * 3. Render a PieChart with a donut (innerRadius) style.
   * 4. Map colors from the defined palette to each pie slice.
   * 5. Add legends and tooltips for interaction.
   */
  const chartData = data.slice(0, 6).map((item, index) => ({
    name: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    value: item.amount,
  }));

  return (
    <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]!} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: any) => formatCurrency(Number(value), currency)}
          />
          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Renders a bar chart showing the historical net worth trend.
 * 
 * @param props - Component properties.
 * @param props.data - Array of monthly net worth snapshots.
 * @param props.currency - The currency code for axis and tooltip formatting.
 * @returns A JSX element containing a net worth trend chart.
 */
export function NetWorthChart({ data, currency }: Readonly<{ data: { month: string, netWorth: number }[], currency: string }>) {
  /*
   * PSEUDOCODE:
   * 1. Map monthly net worth data into chart labels and values.
   * 2. Render a ResponsiveContainer with a BarChart.
   * 3. Apply thematic coloring (Indigo) to represent assets/equity.
   * 4. Format axes to ensure large currency values remain readable.
   */
  const chartData = data.map(item => ({
    name: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
    "Net Worth": item.netWorth,
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
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            tickFormatter={(value) => formatCurrency(value, currency, 'en-US').replace(/\.00$/, '')}
          />
          <Tooltip 
            cursor={{ fill: '#f9fafb' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: any) => formatCurrency(Number(value), currency)}
          />
          <Bar dataKey="Net Worth" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
