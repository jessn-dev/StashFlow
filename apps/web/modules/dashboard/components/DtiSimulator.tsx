'use client';

import { useState, useMemo } from 'react';
import { simulateDTI, formatCurrency, type Region } from '@stashflow/core';
import { Info, Calculator, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

/**
 * Properties for the DtiSimulator component.
 */
interface DtiSimulatorProps {
  /** The user's current total monthly income. */
  currentMonthlyIncome: number;
  /** The user's current total monthly debt obligations. */
  currentMonthlyDebt: number;
  /** The geographical region for threshold calculations (e.g., 'PH', 'US'). */
  region: Region;
  /** The currency code for display. */
  currency: string;
}

/**
 * An interactive simulator that allows users to project their Debt-to-Income (DTI) 
 * ratio based on hypothetical changes to income and debt.
 * 
 * @param props - Component properties.
 * @returns A JSX element representing the DTI simulator interface.
 */
export function DtiSimulator({ currentMonthlyIncome, currentMonthlyDebt, region, currency }: DtiSimulatorProps) {
  const [addLoanMonthly, setAddLoanMonthly] = useState(0);
  const [addIncomeMonthly, setAddIncomeMonthly] = useState(0);
  const [payOffLoanMonthly, setPayOffLoanMonthly] = useState(0);

  /*
   * PSEUDOCODE:
   * 1. Collate current financial state and simulation inputs.
   * 2. Invoke the core simulateDTI engine to calculate current vs. projected ratios.
   * 3. Return a structured simulation result containing labels, ratios, and health status.
   * 4. Memoize the result to avoid re-calculating on unrelated UI re-renders.
   */
  const simulation = useMemo(() => {
    return simulateDTI({
      monthlyIncome: currentMonthlyIncome,
      monthlyDebt: currentMonthlyDebt,
      region,
      addLoanMonthly,
      addIncomeMonthly,
      payOffLoanMonthly,
    });
  }, [currentMonthlyIncome, currentMonthlyDebt, region, addLoanMonthly, addIncomeMonthly, payOffLoanMonthly]);

  const { current, projected, diffPpt } = simulation;

  /*
   * PSEUDOCODE:
   * 1. Render a two-column grid (inputs vs. results).
   * 2. Render range sliders for each simulation input (New Loan, New Income, Debt Payoff).
   * 3. Render a visual SVG gauge representing the projected DTI health.
   * 4. Render a trend indicator comparing current vs. projected states.
   * 5. Conditionally render a 'Health Alert' if the projected ratio exceeds regional limits.
   */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Inputs - 5 cols */}
      <div className="lg:col-span-5 space-y-8">
        <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Calculator size={18} className="text-gray-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Simulation Inputs</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-gray-700">New Monthly Loan Payment</label>
                <span className="text-sm font-black text-gray-900">{formatCurrency(addLoanMonthly, currency)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="50"
                value={addLoanMonthly}
                onChange={(e) => setAddLoanMonthly(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>0</span>
                <span>{formatCurrency(10000, currency).replace(/\.00$/, '')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-gray-700">Monthly Income Increase</label>
                <span className="text-sm font-black text-emerald-600">+{formatCurrency(addIncomeMonthly, currency)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20000" 
                step="100"
                value={addIncomeMonthly}
                onChange={(e) => setAddIncomeMonthly(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>0</span>
                <span>{formatCurrency(20000, currency).replace(/\.00$/, '')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-gray-700">Pay Off Existing Debt (Monthly)</label>
                <span className="text-sm font-black text-red-500">-{formatCurrency(payOffLoanMonthly, currency)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={Math.max(currentMonthlyDebt, 1000)} 
                step="10"
                value={payOffLoanMonthly}
                onChange={(e) => setPayOffLoanMonthly(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>0</span>
                <span>{formatCurrency(Math.max(currentMonthlyDebt, 1000), currency).replace(/\.00$/, '')}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
             <button 
               onClick={() => { setAddLoanMonthly(0); setAddIncomeMonthly(0); setPayOffLoanMonthly(0); }}
               className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
             >
               Reset Simulator
             </button>
          </div>
        </div>

        <div className="bg-amber-50 p-6 rounded-[24px] border border-amber-100 flex gap-4">
           <Info className="text-amber-600 flex-shrink-0" size={20} />
           <p className="text-[13px] text-amber-800 font-medium leading-relaxed">
             This simulator projects your Debt-to-Income (DTI) ratio based on regional thresholds for <strong>{region}</strong> ({Math.round(current.threshold * 100)}%). It is for informational purposes only.
           </p>
        </div>
      </div>

      {/* Results - 7 cols */}
      <div className="lg:col-span-7 space-y-8">
        <div className="bg-white p-10 rounded-[40px] border border-gray-200 shadow-sm flex flex-col items-center text-center">
           <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-8">Projected DTI Ratio</p>
           
           <div className="relative w-64 h-64 flex items-center justify-center mb-8">
              {/* Simple SVG Gauge */}
              <svg className="w-full h-full transform -rotate-90">
                 <circle
                   cx="128"
                   cy="128"
                   r="110"
                   stroke="currentColor"
                   strokeWidth="24"
                   fill="transparent"
                   className="text-gray-100"
                 />
                 <circle
                   cx="128"
                   cy="128"
                   r="110"
                   stroke="currentColor"
                   strokeWidth="24"
                   fill="transparent"
                   strokeDasharray={2 * Math.PI * 110}
                   strokeDashoffset={2 * Math.PI * 110 * (1 - Math.min(projected.ratio, 1))}
                   strokeLinecap="round"
                   className={projected.isHealthy ? 'text-emerald-500' : 'text-red-500'}
                   /* TRANSITION: Smoothly animate the gauge as the user moves sliders. */
                   style={{ transition: 'stroke-dashoffset 0.5s ease-in-out, color 0.5s ease' }}
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                 <span className="text-6xl font-black tracking-tighter text-gray-900">{projected.label}</span>
                 <span className={`text-xs font-black uppercase tracking-widest mt-2 ${projected.isHealthy ? 'text-emerald-600' : 'text-red-500'}`}>
                    {projected.isHealthy ? 'Healthy' : 'High Risk'}
                 </span>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-12 w-full max-w-sm mt-4">
              <div className="space-y-1">
                 <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Current DTI</p>
                 <p className="text-2xl font-bold text-gray-900">{current.label}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Difference</p>
                 <div className="flex items-center justify-center gap-1.5">
                    {diffPpt > 0 ? (
                      <TrendingUp size={16} className="text-red-500" />
                    ) : diffPpt < 0 ? (
                      <TrendingDown size={16} className="text-emerald-600" />
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-3 h-0.5 bg-gray-300 rounded-full" />
                      </div>
                    )}
                    <p className={`text-2xl font-bold ${diffPpt > 0 ? 'text-red-500' : diffPpt < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                       {diffPpt > 0 ? '+' : ''}{(diffPpt * 100).toFixed(1)}%
                    </p>
                 </div>
              </div>
           </div>
        </div>

        {!projected.isHealthy && (
           <div className="bg-red-50 p-8 rounded-[32px] border border-red-100 flex gap-5 items-start animate-in fade-in slide-in-from-top-4 duration-500">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={24} />
              <div className="text-left">
                 <h4 className="text-base font-black text-red-900">Health Alert: High Debt Burden</h4>
                 <p className="text-sm text-red-800/80 font-medium mt-1 leading-relaxed">
                   Your projected DTI ratio exceeds the recommended <strong>{Math.round(projected.threshold * 100)}%</strong> threshold for <strong>{region}</strong>. 
                   Financial institutions may consider this a higher lending risk. Consider reducing debt or increasing income before taking on new obligations.
                 </p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
