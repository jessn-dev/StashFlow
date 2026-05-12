import { createClient } from '~/lib/supabase/server';
import { TransactionQuery } from '@stashflow/api';
import { CashFlowChart } from '~/modules/dashboard/components/DashboardCharts';
import { formatCurrency } from '@stashflow/core';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default async function CashFlowDrilldownPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const transactionQuery = new TransactionQuery(supabase);
  const history = await transactionQuery.getHistoricalSummaries(user.id);
  
  // Get preferred currency from profile
  const { data: profile } = await supabase.from('profiles').select('preferred_currency').eq('id', user.id).single();
  const currency = profile?.preferred_currency || 'USD';

  // Calculate totals
  const totalIncome = history.reduce((sum, h) => sum + h.totalIncome, 0);
  const totalExpenses = history.reduce((sum, h) => sum + h.totalExpenses, 0);
  const netFlow = totalIncome - totalExpenses;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-900 transition-all"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Cash Flow Analytics</h1>
            <p className="text-gray-400 font-medium mt-1">Detailed monthly income vs. expenses trend.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Period Income</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome, currency)}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Period Expenses</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-gray-200 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Net Flow</p>
          <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(netFlow, currency)}
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">12-Month Performance</h2>
            <p className="text-sm text-gray-400 font-medium">Historical trend across all accounts.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-gray-500">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-gray-500">Expenses</span>
            </div>
          </div>
        </div>
        <div className="h-[350px]">
           <CashFlowChart data={history} currency={currency} />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100">
           <h2 className="text-xl font-bold text-gray-900">Monthly Breakdown</h2>
           <p className="text-sm text-gray-400 font-medium mt-1">Raw figures for the past year.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Month</th>
                <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Income</th>
                <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400">Expenses</th>
                <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 text-right">Net Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">
                    No historical data found. Add transactions to see analytics.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.month} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-gray-900">
                      {new Date(item.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-emerald-600">
                      {formatCurrency(item.totalIncome, currency)}
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-red-500">
                      {formatCurrency(item.totalExpenses, currency)}
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.netFlow > 0 ? (
                          <TrendingUp size={14} className="text-emerald-600" />
                        ) : item.netFlow < 0 ? (
                          <TrendingDown size={14} className="text-red-500" />
                        ) : (
                          <Minus size={14} className="text-gray-300" />
                        )}
                        <span className={item.netFlow > 0 ? 'text-emerald-600' : item.netFlow < 0 ? 'text-red-500' : 'text-gray-400'}>
                          {formatCurrency(item.netFlow, currency)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
