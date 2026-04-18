'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  formatCurrency, Transaction,
  Income, Expense, Loan, LoanPayment, BudgetPeriod,
} from '@stashflow/core'
import { CashFlowPayload } from '@stashflow/api'
import { createClient } from '@/utils/supabase/client'
import { XStack, YStack, Text, Button, Circle, View, Spinner, Switch, Theme } from 'tamagui'
import {
  LayoutDashboard, TrendingUp, CreditCard, Landmark,
  Settings, LogOut, Bell, DollarSign, Wallet,
  ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw,
  PieChart, ChevronDown, Trash2, Target, FileText,
  X, Sun, Moon, Monitor, Sparkles, AlertTriangle,
} from 'lucide-react-native'
import IncomeForm from '@/components/income/IncomeForm'
import IncomeList from '@/components/income/IncomeList'
import ExpenseForm from '@/components/spending/ExpenseForm'
import ExpenseList from '@/components/spending/ExpenseList'
import CategoryBreakdown from '@/components/spending/CategoryBreakdown'
import LoanForm from '@/components/loans/LoanForm'
import InstallmentList from '@/components/loans/InstallmentList'
import DTISimulator from '@/components/dti/DTISimulator'
import BudgetsUI from '@/app/dashboard/budgets/BudgetsUI'
import CashFlowUI from '@/app/dashboard/cash-flow/CashFlowUI'
import GoalsUI from '@/app/dashboard/goals/GoalsUI'
import IncomeUI from '@/app/dashboard/income/IncomeUI'
import SpendingUI from '@/app/dashboard/spending/SpendingUI'
import LoansUI from '@/app/dashboard/loans/LoansUI'
import DocumentsModal from '@/components/documents/DocumentsModal'

import { DashboardPayload, fetchRateMap } from '@stashflow/api'

type ActiveView = 'overview' | 'income' | 'spending' | 'loans' | 'dti' | 'budgets' | 'cash-flow' | 'goals'

interface DashboardUIProps {
  payload: DashboardPayload
  userEmail: string | undefined
}

// ─── Ring chart ───────────────────────────────────────────────────────────────
function RingChart({ percent, label, color = '#1A7A7A' }: { percent: number; label: string; color?: string }) {
  const r    = 36
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - Math.min(percent, 100) / 100)
  return (
    <YStack alignItems="center" gap={8}>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
          <circle cx="45" cy="45" r={r} fill="none" stroke={color}
            strokeWidth="9" strokeDasharray={String(circ)} strokeDashoffset={String(off)}
            strokeLinecap="round" transform="rotate(-90 45 45)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sf-text)' }}>{percent}%</span>
        </div>
      </div>
      <Text fontSize={12} color="$brandTextSub" textTransform="capitalize" textAlign="center">{label}</Text>
    </YStack>
  )
}

// ─── Stat card (reference style) ─────────────────────────────────────────────
function StatCard({ label, value, sub, dark, Icon, trend }: {
  label: string; value: string; sub: string; dark?: boolean
  Icon: React.ElementType; trend?: 'up' | 'down' | null
}) {
  const CardIcon = Icon
  return (
    <YStack flex={1} minWidth={160}
      backgroundColor={dark ? '$brandPrimary' : '$brandWhite'}
      borderRadius={16} padding={24} gap={16}
      shadowColor="rgba(0,0,0,0.06)" shadowOpacity={1} shadowRadius={14}
      shadowOffset={{ width: 0, height: 3 }}>
      {/* Icon circle */}
      <YStack width={48} height={48} borderRadius={999}
        backgroundColor={dark ? 'rgba(255,255,255,0.15)' : 'rgba(13,61,61,0.07)'}
        alignItems="center" justifyContent="center">
        {/* @ts-ignore */}
        <CardIcon size={22} color={dark ? 'white' : '#0D3D3D'} />
      </YStack>
      {/* Label + value */}
      <YStack gap={4}>
        <Text fontSize={13} color={dark ? 'rgba(255,255,255,0.6)' : '$brandTextSub'}>{label}</Text>
        <Text fontSize={22} fontWeight="700" letterSpacing={-0.5}
          color={dark ? 'white' : '$brandText'}>{value}</Text>
      </YStack>
      {/* Trend */}
      <XStack alignItems="center" gap={4}>
        {trend === 'up'   && <ArrowUpRight   size={12} color={dark ? 'rgba(255,255,255,0.6)' : '#059669'} />}
        {trend === 'down' && <ArrowDownRight size={12} color={dark ? 'rgba(255,255,255,0.6)' : '#DC2626'} />}
        <Text fontSize={12} color={dark ? 'rgba(255,255,255,0.45)' : '$brandTextSub'} numberOfLines={1}>{sub}</Text>
      </XStack>
    </YStack>
  )
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ label, Icon, active, onClick }: {
  label: string; Icon: React.ElementType; active: boolean; onClick: () => void
}) {
  const NavIcon = Icon
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
      <XStack alignItems="center" gap={10}
        paddingHorizontal={12} paddingVertical={10} borderRadius={8}
        backgroundColor={active ? '$brandAccent' : 'transparent'}
        hoverStyle={{ backgroundColor: active ? '$brandAccent' : 'rgba(255,255,255,0.1)' }}>
        {/* @ts-ignore */}
        <NavIcon size={16} color={active ? '#fff' : 'rgba(255,255,255,0.5)'} />
        <Text fontSize={14} fontWeight={active ? '600' : '400'}
          color={active ? 'white' : 'rgba(255,255,255,0.5)'} flex={1}>{label}</Text>
      </XStack>
    </button>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewContent({ summary, transactions, dti, contingency, marketTrends, trend, categoryBreakdown, goals }: {
  summary: DashboardPayload['summary']
  transactions: Transaction[]
  dti: DashboardPayload['dti']
  contingency: DashboardPayload['contingency']
  marketTrends: DashboardPayload['marketTrends']
  trend: DashboardPayload['trend']
  categoryBreakdown: DashboardPayload['categoryBreakdown']
  goals: DashboardPayload['goals']
}) {
  const dtiRatio = dti?.ratio || 0
  const dtiColor = dti?.color || '#4ECDC4'
  const ringColors = ['#1A7A7A', '#0D3D3D', '#4ECDC4', '#ff8a80', '#EAB308']
  const totalMonthlyExp = (categoryBreakdown || []).reduce((s, c) => s + c.amount, 0)

  return (
    <YStack gap={20}>
      {contingency.active && (
        <XStack backgroundColor="#DC2626" padding={12} borderRadius={8} alignItems="center" gap={12} shadowColor="black" shadowOpacity={0.2} shadowRadius={10}>
          <AlertTriangle size={20} color="white" />
          <YStack flex={1}>
            <Text color="white" fontWeight="700" fontSize={14}>CONTINGENCY PROTOCOL ACTIVE</Text>
            <Text color="rgba(255,255,255,0.8)" fontSize={12}>Discretionary goals paused. Focusing on bare-metal essentials ({formatCurrency(contingency.essentialMonthlySpend, summary.currency)}/mo).</Text>
          </YStack>
          <YStack backgroundColor="rgba(255,255,255,0.2)" paddingHorizontal={12} paddingVertical={6} borderRadius={6}>
            <Text color="white" fontWeight="800" fontSize={16}>{contingency.liquidRunwayDays} DAYS</Text>
            <Text color="rgba(255,255,255,0.8)" fontSize={9} textTransform="uppercase" textAlign="center">Liquid Runway</Text>
          </YStack>
        </XStack>
      )}

      {/* ── Stat cards ── */}
      <XStack gap={14} flexWrap="wrap">
        <StatCard label="Net Worth"     value={formatCurrency(summary.netWorth, summary.currency)}        sub="Total remaining value"    dark Icon={Wallet}          trend={summary.netWorth >= 0 ? 'up' : 'down'} />
        <StatCard label="Monthly Income" value={formatCurrency(summary.thisMonth.income, summary.currency)} sub="Earnings this month"     Icon={TrendingUp}    trend="up" />
        <StatCard label="Monthly Exp"    value={formatCurrency(summary.thisMonth.expense, summary.currency)} sub={`${summary.thisMonth.growth.toFixed(0)}% vs last month`} Icon={CreditCard} trend={summary.thisMonth.growth > 0 ? 'down' : 'up'} />
        <StatCard label="Remaining Debt" value={formatCurrency(summary.totalLiabilities, summary.currency)} sub="Unpaid loan balance"    Icon={Landmark} />
      </XStack>

      {/* ── Middle row ── */}
      <XStack gap={16} flexWrap="wrap" alignItems="stretch">
        <YStack flex={1.2} minWidth={280} gap={16}>
          <YStack borderRadius={16} padding={28} gap={20}
            style={{ background: 'linear-gradient(135deg, #0D3D3D 0%, #1A7A7A 100%)' }}>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack gap={3}>
                <Text fontSize={12} color="rgba(255,255,255,0.6)" fontWeight="700" textTransform="uppercase" letterSpacing={1.5}>StashFlow</Text>
                <Text fontSize={10} color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>Financial Health</Text>
              </YStack>
              <YStack width={36} height={36} borderRadius={9999} backgroundColor="rgba(255,255,255,0.15)" alignItems="center" justifyContent="center">
                <DollarSign size={18} color="white" />
              </YStack>
            </XStack>
            <YStack gap={4}>
              <Text fontSize={12} color="rgba(255,255,255,0.5)">Debt-to-Income Ratio</Text>
              <Text fontSize={36} fontWeight="700" color="white" letterSpacing={-1}>{dti ? `${dti.ratio}%` : '--%'}</Text>
            </YStack>
            <XStack gap={32}>
              <YStack gap={2}>
                <Text fontSize={11} color="rgba(255,255,255,0.5)">Monthly Income</Text>
                <Text fontSize={15} fontWeight="700" color="#4ECDC4">{dti ? formatCurrency(dti.gross_income, dti.currency) : '--'}</Text>
              </YStack>
              <YStack gap={2}>
                <Text fontSize={11} color="rgba(255,255,255,0.5)">Monthly Debt</Text>
                <Text fontSize={15} fontWeight="700" color="#ff8a80">{dti ? formatCurrency(dti.total_debt, dti.currency) : '--'}</Text>
              </YStack>
            </XStack>
            <YStack gap={6}>
              <XStack justifyContent="space-between">
                <Text fontSize={11} color="rgba(255,255,255,0.5)">DTI Health</Text>
                <Text fontSize={11} color="rgba(255,255,255,0.7)" fontWeight="600">{dti?.status.toUpperCase() ?? '--'}</Text>
              </XStack>
              <YStack height={5} borderRadius={999} backgroundColor="rgba(255,255,255,0.2)" overflow="hidden">
                <YStack height="100%" borderRadius={999} backgroundColor={dtiColor}
                  style={{ width: `${Math.min(dtiRatio, 100)}%`, transition: 'width 0.6s ease' }} />
              </YStack>
            </YStack>
          </YStack>

          {/* Cash Flow Trend */}
          <YStack backgroundColor="$brandWhite" borderRadius={16} padding={24} gap={20} shadowColor="rgba(0,0,0,0.04)" shadowOpacity={1} shadowRadius={10} borderWidth={1} borderColor="$borderColor">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={15} fontWeight="700" color="$brandText">Cash Flow Trend</Text>
              <XStack gap={12}>
                <XStack gap={6} alignItems="center"><Circle size={8} backgroundColor="#1A7A7A" /><Text fontSize={10} color="$brandTextSub">Income</Text></XStack>
                <XStack gap={6} alignItems="center"><Circle size={8} backgroundColor="#ff8a80" /><Text fontSize={10} color="$brandTextSub">Expense</Text></XStack>
              </XStack>
            </XStack>
            <XStack height={140} alignItems="flex-end" justifyContent="space-between" paddingHorizontal={10}>
              {trend.map((m, i) => {
                const max = Math.max(...trend.map(t => Math.max(t.income, t.expense, 100)))
                const incH = (m.income / max) * 100
                const expH = (m.expense / max) * 100
                return (
                  <YStack key={i} gap={8} alignItems="center" flex={1}>
                    <XStack gap={3} alignItems="flex-end">
                      <YStack width={10} height={`${incH}%`} minHeight={2} backgroundColor="#1A7A7A" borderRadius={2} />
                      <YStack width={10} height={`${expH}%`} minHeight={2} backgroundColor="#ff8a80" borderRadius={2} />
                    </XStack>
                    <Text fontSize={10} color="$brandTextSub">{m.month}</Text>
                  </YStack>
                )
              })}
            </XStack>
          </YStack>
        </YStack>

        {/* Market Intelligence & Goals */}
        <YStack flex={1} minWidth={280} gap={16}>
          {/* Market Intelligence Widget */}
          <YStack backgroundColor="$brandWhite" borderRadius={14} padding={20} gap={12} shadowColor="black" shadowOpacity={0.04} shadowRadius={10} borderWidth={1} borderColor="$borderColor">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={13} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1}>Market Intel</Text>
              <Sparkles size={14} color="#EAB308" />
            </XStack>
            <YStack gap={8}>
              {marketTrends.length > 0 ? marketTrends.slice(0, 3).map(trend => (
                <XStack key={trend.name} justifyContent="space-between" alignItems="center">
                  <YStack>
                    <Text fontSize={12} fontWeight="600" color="$brandText">{trend.name}</Text>
                    <Text fontSize={10} color="$brandTextSub" textTransform="capitalize">{trend.category || 'Macro'}</Text>
                  </YStack>
                  <XStack alignItems="center" gap={4}>
                    <Text fontSize={11} fontWeight="700" color={trend.status === 'up' ? '#DC2626' : '#059669'}>
                      {trend.status === 'up' ? '+' : ''}{trend.inflationRate}%
                    </Text>
                    {trend.status === 'up' ? <ArrowUpRight size={10} color="#DC2626" /> : <ArrowDownRight size={10} color="#059669" />}
                  </XStack>
                </XStack>
              )) : (
                <YStack gap={8} paddingVertical={10} alignItems="center">
                  <Text fontSize={11} color="$brandTextSub" textAlign="center">No market data synced.</Text>
                  <Button 
                    size="$1" 
                    backgroundColor="rgba(26,122,122,0.1)" 
                    onPress={async () => {
                      const sb = createClient();
                      const { data, error } = await sb.functions.invoke('sync-market-data');
                      if (error) {
                        const errorData = await error.context?.json();
                        alert('Sync failed: ' + (errorData?.error || error.message));
                      }
                      else { alert('Sync successful! Refreshing...'); refresh(); }
                    }}
                  >
                    <Text fontSize={10} fontWeight="700" color="$brandPrimary">SYNC NOW</Text>
                  </Button>
                </YStack>
              )}
            </YStack>
            {marketTrends.length > 0 && (
              <Text fontSize={9} color="$brandTextSub" opacity={0.6} fontStyle="italic" textAlign="center" borderTopWidth={1} borderColor="$borderColor" paddingTop={8}>
                Data sourced from FRED® Macro Endpoints
              </Text>
            )}
          </YStack>

          {/* Goals Widget (Compact) */}
          <YStack backgroundColor="$brandWhite" borderRadius={14} padding={20} gap={12} shadowColor="black" shadowOpacity={0.04} shadowRadius={10} borderWidth={1} borderColor="$borderColor" flex={1}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={13} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1}>Your Goals</Text>
              <Target size={14} color="#9ca3af" />
            </XStack>
            <YStack gap={10}>
              {goals.length > 0 ? goals.slice(0, 2).map(goal => (
                <YStack key={goal.id} gap={4}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={11} fontWeight="600" color="$brandText" numberOfLines={1}>{goal.name}</Text>
                    <Text fontSize={10} fontWeight="700" color="$brandAccent">{goal.progress.toFixed(0)}%</Text>
                  </XStack>
                  <YStack height={4} backgroundColor="$brandBg" borderRadius={999} overflow="hidden">
                    <YStack height="100%" width={`${Math.min(goal.progress, 100)}%`} backgroundColor="$brandAccent" borderRadius={999} />
                  </YStack>
                </YStack>
              )) : (
                <Text fontSize={11} color="$brandTextSub" textAlign="center">No active goals.</Text>
              )}
            </YStack>
          </YStack>
        </YStack>

        {/* Transaction history */}
        <YStack flex={2} minWidth={320} backgroundColor="$brandWhite" borderRadius={14}
          shadowColor="rgba(0,0,0,0.06)" shadowOpacity={1} shadowRadius={12}
          shadowOffset={{ width: 0, height: 2 }} overflow="hidden">
          <XStack paddingHorizontal={22} paddingVertical={16} borderBottomWidth={1}
            borderColor="$borderColor" justifyContent="space-between" alignItems="center">
            <Text fontSize={15} fontWeight="700" color="$brandText">Transaction History</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </XStack>
          {transactions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--sf-thead-bg)' }}>
                    {['Description', 'Type', 'Date', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 18px', textAlign: i === 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--sf-thead-color)', borderBottom: '1px solid var(--sf-border)', whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={tx.id} style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--sf-border-subtle)' : 'none' }}>
                      <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: 'var(--sf-text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.type === 'income' ? tx.source : tx.description}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, backgroundColor: tx.type === 'income' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)', color: tx.type === 'income' ? '#059669' : '#DC2626' }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--sf-date-color)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: tx.type === 'income' ? '#059669' : 'var(--sf-text)', whiteSpace: 'nowrap' }}>
                        {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, summary.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <YStack flex={1} alignItems="center" justifyContent="center" padding={40}>
              <Text fontSize={13} color="$brandTextSub">No transactions yet.</Text>
            </YStack>
          )}
        </YStack>
      </XStack>

      {/* ── Bottom row ── */}
      <XStack gap={16} flexWrap="wrap" alignItems="stretch">
        {/* Recent activity */}
        <YStack flex={1} minWidth={260} backgroundColor="$brandWhite" borderRadius={14}
          shadowColor="rgba(0,0,0,0.06)" shadowOpacity={1} shadowRadius={12}
          shadowOffset={{ width: 0, height: 2 }} overflow="hidden">
          <XStack paddingHorizontal={22} paddingVertical={16} borderBottomWidth={1} borderColor="$borderColor">
            <Text fontSize={15} fontWeight="700" color="$brandText">Recent Activity</Text>
          </XStack>
          <YStack padding={8}>
            {transactions.length > 0 ? transactions.slice(0, 5).map(tx => (
              <XStack key={tx.id} paddingHorizontal={14} paddingVertical={12} borderRadius={8}
                alignItems="center" gap={12}
                hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.03)' }}>
                <YStack width={36} height={36} borderRadius={9999}
                  backgroundColor={tx.type === 'income' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)'}
                  alignItems="center" justifyContent="center">
                  {tx.type === 'income'
                    ? <ArrowUpRight size={16} color="#059669" />
                    : <ArrowDownRight size={16} color="#DC2626" />}
                </YStack>
                <YStack flex={1} gap={2} overflow="hidden">
                  <Text fontSize={13} fontWeight="600" color="$brandText" numberOfLines={1}>
                    {tx.type === 'income' ? tx.source : tx.description}
                  </Text>
                  <Text fontSize={11} color="$brandTextSub" textTransform="capitalize">
                    {tx.type === 'income' ? 'Income' : tx.category}
                  </Text>
                </YStack>
                <Text fontSize={13} fontWeight="700" color={tx.type === 'income' ? '#059669' : '$brandText'}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, summary.currency)}
                </Text>
              </XStack>
            )) : (
              <YStack padding={32} alignItems="center">
                <Text fontSize={13} color="$brandTextSub">No recent activity.</Text>
              </YStack>
            )}
          </YStack>
        </YStack>

        {/* Spending ring charts */}
        <YStack flex={1} minWidth={260} backgroundColor="$brandWhite" borderRadius={14}
          shadowColor="rgba(0,0,0,0.06)" shadowOpacity={1} shadowRadius={12}
          shadowOffset={{ width: 0, height: 2 }}>
          <XStack paddingHorizontal={22} paddingVertical={16} borderBottomWidth={1} borderColor="$borderColor">
            <Text fontSize={15} fontWeight="700" color="$brandText">Monthly Spending</Text>
          </XStack>
          <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
            {(categoryBreakdown || []).length > 0 ? (
              <XStack gap={24} flexWrap="wrap" justifyContent="center">
                {(categoryBreakdown || []).slice(0, 3).map((c, i) => (
                  <RingChart key={c.category}
                    percent={totalMonthlyExp > 0 ? Math.round((c.amount / totalMonthlyExp) * 100) : 0}
                    label={c.category} color={ringColors[i % ringColors.length]} />
                ))}
              </XStack>
            ) : (
              <Text fontSize={13} color="$brandTextSub">No spending this month.</Text>
            )}
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  )
}

// ─── DTI view ─────────────────────────────────────────────────────────────────
function DtiContent({ dti, loading }: { dti: any; loading: boolean }) {
  if (loading) return <YStack flex={1} alignItems="center" justifyContent="center" padding={80}><Spinner size="large" color="$brandAccent" /></YStack>
  if (!dti) return (
    <YStack flex={1} alignItems="center" justifyContent="center" padding={80} gap={8}>
      <Text fontSize={15} fontWeight="700" color="$brandText">No DTI data available</Text>
      <Text fontSize={13} color="$brandTextSub" textAlign="center" maxWidth={360}>Add income and active loans to see your Debt-to-Income ratio.</Text>
    </YStack>
  )

  return (
    <YStack gap={24}>
      <XStack gap={16} flexWrap="wrap">
        <StatCard label="DTI Ratio" value={`${dti.ratio}%`} sub={dti.status.toUpperCase()} dark Icon={PieChart} />
        <StatCard label="Monthly Income" value={formatCurrency(dti.gross_income, dti.currency)} sub={`${dti.breakdown.income_sources} source(s)`} Icon={TrendingUp} trend="up" />
        <StatCard label="Monthly Debt" value={formatCurrency(dti.total_debt, dti.currency)} sub={`${dti.breakdown.active_loans} active loan(s)`} Icon={Landmark} trend={dti.total_debt > 0 ? 'down' : null} />
      </XStack>

      <XStack gap={24} flexWrap="wrap" alignItems="stretch">
        <YStack flex={1.5} minWidth={320} gap={24}>
          <YStack backgroundColor="$brandWhite" borderRadius={14} padding={28} gap={20} shadowColor="black" shadowOpacity={0.04} shadowRadius={10} borderWidth={1} borderColor="$borderColor">
             <Text fontSize={18} fontWeight="700" color="$brandText">Health Assessment</Text>
             <YStack gap={12}>
               <XStack justifyContent="space-between" alignItems="center">
                 <Text fontSize={14} color="$brandTextSub">Current Status</Text>
                 <XStack gap={8} alignItems="center">
                   <Circle size={10} backgroundColor={dti.color} />
                   <Text fontSize={14} fontWeight="700" color={dti.color} textTransform="uppercase">{dti.status}</Text>
                 </XStack>
               </XStack>
               <YStack height={8} borderRadius={999} backgroundColor="$brandBg" overflow="hidden">
                 <YStack height="100%" width={`${Math.min(dti.ratio, 100)}%`} backgroundColor={dti.color} borderRadius={999} />
               </YStack>
             </YStack>
             <YStack backgroundColor="$brandBg" padding={20} borderRadius={10} gap={10}>
               <Text fontSize={14} fontWeight="700" color="$brandPrimary">Recommendation</Text>
               <Text fontSize={13} color="$brandTextSub" lineHeight={20}>{dti.recommendation}</Text>
               
               {dti.currency === 'USD' && (
                 <YStack borderTopWidth={1} borderColor="$borderColor" paddingTop={10} gap={4}>
                   <XStack justifyContent="space-between">
                     <Text fontSize={12} fontWeight="600" color="$brandTextSub">Front-End DTI (Housing)</Text>
                     <Text fontSize={12} fontWeight="700" color={dti.front_end_ratio > 28 ? '#D4522A' : '#1A7A7A'}>{dti.front_end_ratio}%</Text>
                   </XStack>
                   <Text fontSize={11} color="$brandTextSub" opacity={0.7}>Standard limit: 28% of gross income</Text>
                 </YStack>
               )}
             </YStack>
          </YStack>

          <DTISimulator 
            currentMonthlyIncome={dti.gross_income} 
            currentMonthlyDebt={dti.total_debt} 
            currency={dti.currency} 
          />
        </YStack>

        <YStack flex={1} minWidth={280} gap={20}>
          <YStack backgroundColor="$brandPrimary" borderRadius={14} padding={28} gap={16}>
            <Text fontSize={18} fontWeight="700" color="white">Understanding DTI</Text>
            <Text fontSize={13} color="rgba(255,255,255,0.7)" lineHeight={20}>
              Your Debt-to-Income (DTI) ratio compares your total monthly debt payments to your gross monthly income.
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.7)" lineHeight={20}>
              Lenders use this to measure your ability to manage monthly payments and repay debts. A ratio of 36% or less is generally considered healthy.
            </Text>
            <Button size="$3" backgroundColor="rgba(255,255,255,0.1)" borderRadius={8} hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text color="white" fontWeight="600" fontSize={13}>Learn More</Text>
            </Button>
          </YStack>

          <YStack backgroundColor="$brandWhite" borderRadius={14} padding={24} gap={12} borderWidth={1} borderColor="$borderColor">
            <Text fontSize={14} fontWeight="700" color="$brandText">Risk Thresholds</Text>
            {[
              { label: 'Healthy', range: '≤ 36%', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
              { label: 'Manageable', range: '37% - 49%', color: '#EAB308', bg: 'rgba(234,179,8,0.1)' },
              { label: 'High Risk', range: '≥ 50%', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
            ].map((t) => (
              <XStack key={t.label} justifyContent="space-between" alignItems="center" padding={10} borderRadius={8} backgroundColor={t.bg}>
                <Text fontSize={12} fontWeight="600" color={t.color}>{t.label}</Text>
                <Text fontSize={11} fontWeight="700" color={t.color} fontFamily="$mono">{t.range}</Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  )
}

// ─── Settings modal ───────────────────────────────────────────────────────────
type AppTheme = 'light' | 'auto' | 'dark'

import { updateBudgetSettingsAction } from '@/app/dashboard/budgets/actions'

function SettingsModal({
  onClose,
  appTheme, setAppTheme,
  budgetingEnabled, rolloverEnabled,
  onBudgetChange,
  contingencyEnabled,
  onContingencyChange,
}: {
  onClose: () => void
  appTheme: AppTheme; setAppTheme: (t: AppTheme) => void
  budgetingEnabled: boolean
  rolloverEnabled: boolean
  onBudgetChange: (budgeting_enabled: boolean, global_rollover_enabled: boolean) => Promise<void>
  contingencyEnabled: boolean
  onContingencyChange: (active: boolean) => Promise<void>
}) {
  const [savingBudget,      setSavingBudget]      = useState(false)
  const [savingRollover,    setSavingRollover]    = useState(false)
  const [savingContingency, setSavingContingency] = useState(false)

  const themes: { id: AppTheme; label: string; Icon: React.ElementType }[] = [
    { id: 'light', label: 'Light',  Icon: Sun },
    { id: 'auto',  label: 'Auto',   Icon: Monitor },
    { id: 'dark',  label: 'Dark',   Icon: Moon },
  ]

  async function handleBudgetingChange(v: boolean) {
    setSavingBudget(true)
    await onBudgetChange(v, rolloverEnabled)
    setSavingBudget(false)
  }

  async function handleRolloverChange(v: boolean) {
    if (!budgetingEnabled) return
    setSavingRollover(true)
    await onBudgetChange(budgetingEnabled, v)
    setSavingRollover(false)
  }

  async function handleContingencyChange(v: boolean) {
    setSavingContingency(true)
    await onContingencyChange(v)
    setSavingContingency(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal card */}
      <div style={{ background: '#151f2e', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Left nav */}
        <div style={{ width: 180, background: '#0f1623', padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(26,122,122,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={14} color="#1A7A7A" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A7A7A' }}>General</span>
          </div>
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Settings</span>
            <button
              onClick={onClose}
              style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}
            >
              {/* @ts-ignore */}
              <X size={16} color="rgba(255,255,255,0.6)" />
            </button>
          </div>

          {/* ── Appearance ── */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Appearance</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>Theme</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}> Customize how StashFlow looks</p>
              </div>
              {/* Light / Auto / Dark pill toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 2 }}>
                {themes.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setAppTheme(id)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'background 0.15s, color 0.15s',
                      background: appTheme === id ? '#1A7A7A' : 'transparent',
                      color: appTheme === id ? 'white' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {/* @ts-ignore */}
                    <Icon size={12} color={appTheme === id ? 'white' : 'rgba(255,255,255,0.45)'} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Budgeting ── */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Budgeting</p>

            {/* Enable budgeting */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>Enable budgeting</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}> Set monthly budgets for your categories</p>
              </div>
              {savingBudget ? (
                <Spinner size="small" color="rgba(255,255,255,0.5)" />
              ) : (
                <Switch
                  size="$3"
                  checked={budgetingEnabled}
                  onCheckedChange={handleBudgetingChange}
                  backgroundColor={budgetingEnabled ? '#1A7A7A' : 'rgba(255,255,255,0.12)'}
                >
                  {/* @ts-ignore */}
                  <Switch.Thumb animation="quick" backgroundColor="white" />
                </Switch>
              )}
            </div>

            {/* Enable rollover */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', opacity: budgetingEnabled ? 1 : 0.4 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>Enable rollover</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}> Allow budgets to be carried across months</p>
              </div>
              {savingRollover ? (
                <Spinner size="small" color="rgba(255,255,255,0.5)" />
              ) : (
                <Switch
                  size="$3"
                  checked={rolloverEnabled}
                  disabled={!budgetingEnabled}
                  onCheckedChange={v => budgetingEnabled && handleRolloverChange(v)}
                  backgroundColor={rolloverEnabled && budgetingEnabled ? '#1A7A7A' : 'rgba(255,255,255,0.12)'}
                >
                  {/* @ts-ignore */}
                  <Switch.Thumb animation="quick" backgroundColor="white" />
                </Switch>
              )}
            </div>
          </div>

          {/* ── Intelligence & Contingency ── */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Intelligence & Contingency</p>

            {/* Contingency Protocol */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0 }}>Contingency Protocol (Survival Mode)</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}> 1-click bare-metal survival budget</p>
              </div>
              {savingContingency ? (
                <Spinner size="small" color="rgba(255,255,255,0.5)" />
              ) : (
                <Switch
                  size="$3"
                  checked={contingencyEnabled}
                  onCheckedChange={handleContingencyChange}
                  backgroundColor={contingencyEnabled ? '#DC2626' : 'rgba(255,255,255,0.12)'}
                >
                  {/* @ts-ignore */}
                  <Switch.Thumb animation="quick" backgroundColor="white" />
                </Switch>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function DashboardUI({ payload, userEmail }: DashboardUIProps) {
  const [activeView, setActiveView]   = useState<ActiveView>('overview')
  const [refreshKey, setRefreshKey]   = useState(0)
  const [viewLoading, setViewLoading] = useState(false)

  const [incomes,  setIncomes]  = useState<Income[]  | null>(null)
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [loans,    setLoans]    = useState<Loan[]    | null>(null)
  const [expCats,  setExpCats]  = useState<{ category: string; amount: number }[]>([])

  const [dashboard, setDashboard] = useState<DashboardPayload>(payload)
  const [loading, setLoading]     = useState(false)

  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([])
  const [cashFlow, setCashFlow]           = useState<CashFlowPayload | null>(null)
  const [rates, setRates]                 = useState<Record<string, number>>({})

  // Settings modal & Theme
  const [showSettings,      setShowSettings]      = useState(false)
  const [showDocuments,     setShowDocuments]     = useState(false)
  const [mounted,           setMounted]           = useState(false)
  const [appTheme,          setAppTheme]          = useState<AppTheme>('light')

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sf-theme') as AppTheme
    if (saved) setAppTheme(saved)
  }, [])

  const [budgetingEnabled,  setBudgetingEnabled]  = useState(dashboard.profile.budgeting_enabled)
  const [rolloverEnabled,   setRolloverEnabled]   = useState(dashboard.profile.global_rollover_enabled)
  const [contingencyEnabled, setContingencyEnabled] = useState(dashboard.profile.contingency_mode_active)

  // Persist theme to localStorage and apply to <html>
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('sf-theme', appTheme)
    const root = document.documentElement
    if (appTheme === 'dark') root.setAttribute('data-theme', 'dark')
    else if (appTheme === 'light') root.removeAttribute('data-theme')
    else {
      // 'auto'
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) root.setAttribute('data-theme', 'dark')
      else root.removeAttribute('data-theme')
    }
  }, [appTheme, mounted])

  useEffect(() => {
    const sb = createClient()
    fetchRateMap(sb).then(setRates).catch(() => {})
  }, [])

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (!mounted) return 'light' // Match SSR
    if (appTheme === 'dark') return 'dark'
    if (appTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }, [appTheme, mounted])

  const initials = (userEmail?.[0] ?? 'U').toUpperCase()
  const username = (dashboard.profile.full_name || userEmail?.split('@')[0]) ?? 'User'

  // Unified refresh function
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { getDashboardPayload } = await import('@stashflow/api')
      const sb = createClient()
      const newPayload = await getDashboardPayload(sb)
      setDashboard(newPayload)
      // Sync settings state with fresh DB values
      setBudgetingEnabled(newPayload.profile.budgeting_enabled)
      setRolloverEnabled(newPayload.profile.global_rollover_enabled)
      setContingencyEnabled(newPayload.profile.contingency_mode_active)

      // If we are currently in loans view, refresh the loans list too
      if (activeView === 'loans') {
        const { data } = await sb.from('loans').select('*').order('created_at', { ascending: false })
        setLoans(data ?? [])
      }
    } catch (e) {
      console.error('Refresh failed', e)
    } finally {
      setLoading(false)
    }
  }, [activeView])

  // Fetch view-specific data
  useEffect(() => {
    if (activeView === 'overview' || activeView === 'dti') return
    let cancelled = false
    async function load() {
      setViewLoading(true)
      try {
        const sb = createClient()
        const { fetchRateMap } = await import('@stashflow/api')
        const rMap = await fetchRateMap(sb)
        if (!cancelled) setRates(rMap)

        if (activeView === 'income') {
          const { data } = await sb.from('incomes').select('*').order('date', { ascending: false })
          if (!cancelled) setIncomes(data ?? [])
        }
        if (activeView === 'spending') {
          const { data: exp } = await sb.from('expenses').select('*').order('date', { ascending: false })
          if (!cancelled) {
            setExpenses(exp ?? [])
            const m: Record<string, number> = {}
            ;(exp ?? []).forEach(e => { m[e.category] = (m[e.category] ?? 0) + e.amount })
            setExpCats(Object.entries(m).map(([category, amount]) => ({ category, amount })))
          }
        }
        if (activeView === 'loans') {
          const { data } = await sb.from('loans').select('*').order('created_at', { ascending: false })
          if (!cancelled) setLoans(data ?? [])
        }
        if (activeView === 'budgets') {
          const { getBudgetPeriod } = await import('@stashflow/api')
          const data = await getBudgetPeriod(sb, new Date().toISOString().slice(0, 7))
          if (!cancelled) setBudgetPeriods(data)
        }
        if (activeView === 'cash-flow') {
          const { getCashFlowProjections } = await import('@stashflow/api')
          const data = await getCashFlowProjections(sb)
          if (!cancelled) setCashFlow(data)
        }
      } finally { if (!cancelled) setViewLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [activeView, refreshKey])

  const handleBudgetChange = useCallback(async (budgeting_enabled: boolean, global_rollover_enabled: boolean) => {
    setBudgetingEnabled(budgeting_enabled)
    setRolloverEnabled(global_rollover_enabled)
    await updateBudgetSettingsAction({ budgeting_enabled, global_rollover_enabled })
    await refresh()
  }, [refresh])

  const handleContingencyChange = useCallback(async (active: boolean) => {
    setContingencyEnabled(active)
    const { updateContingencyAction } = await import('@/app/dashboard/settings/actions')
    await updateContingencyAction(active)
    await refresh()
  }, [refresh])

  function switchView(view: ActiveView) {
    setActiveView(view)
    setRefreshKey(k => k + 1)
  }

  const NAV = [
    { id: 'overview'  as ActiveView, label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'budgets'   as ActiveView, label: 'Budgets',   Icon: Wallet },
    { id: 'cash-flow' as ActiveView, label: 'Cash Flow', Icon: TrendingUp },
    { id: 'income'    as ActiveView, label: 'Income',    Icon: DollarSign },
    { id: 'spending'  as ActiveView, label: 'Spending',  Icon: CreditCard },
    { id: 'loans'     as ActiveView, label: 'Loans',     Icon: Landmark },
    { id: 'goals'     as ActiveView, label: 'Goals',     Icon: Target },
    { id: 'dti'       as ActiveView, label: 'DTI Ratio', Icon: PieChart },
  ]

  const PAGE: Record<ActiveView, { title: string; sub: string }> = {
    overview:  { title: 'StashFlow',   sub: 'Your financial overview at a glance.' },
    budgets:   { title: 'Budgets',     sub: 'Manage your monthly spending limits.' },
    'cash-flow': { title: 'Cash Flow', sub: 'Project your future net availability.' },
    income:    { title: 'Income',      sub: 'Log and manage your income sources.' },
    spending:  { title: 'Spending',    sub: 'Track and categorise your expenses.' },
    loans:     { title: 'Loans',       sub: 'Manage your active and past loans.' },
    goals:     { title: 'Goals',       sub: 'Track savings and debt payoff targets.' },
    dti:       { title: 'DTI Ratio',   sub: 'Monitor your Debt-to-Income health.' },
  }

  return (
    <Theme name={resolvedTheme}>
    <XStack height="100vh" backgroundColor="$brandBg" overflow="hidden">

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          appTheme={appTheme} setAppTheme={setAppTheme}
          budgetingEnabled={budgetingEnabled}
          rolloverEnabled={rolloverEnabled}
          onBudgetChange={handleBudgetChange}
          contingencyEnabled={contingencyEnabled}
          onContingencyChange={handleContingencyChange}
        />
      )}

      {/* Documents modal */}
      {showDocuments && (
        <DocumentsModal onClose={() => setShowDocuments(false)} />
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
      <YStack width={220} backgroundColor="#111111"
        paddingTop={28} paddingHorizontal={14} paddingBottom={20}
        justifyContent="space-between"
        style={{ height: '100%', overflowY: 'auto', flexShrink: 0 }}>
        <YStack gap={28}>
          {/* Logo */}
          <XStack alignItems="center" gap={10} paddingHorizontal={8}>
            <YStack width={32} height={32} borderRadius={8} backgroundColor="$brandAccent"
              alignItems="center" justifyContent="center">
              <DollarSign size={16} color="white" />
            </YStack>
            <Text fontSize={15} fontWeight="700" color="white" letterSpacing={0.3}>StashFlow</Text>
          </XStack>
          {/* Nav */}
          <YStack gap={2}>
            <Text fontSize={10} fontWeight="700" color="rgba(255,255,255,0.3)" textTransform="uppercase"
              letterSpacing={1.5} paddingHorizontal={12} paddingBottom={6}>Menu</Text>
            {NAV.map(({ id, label, Icon }) => (
              <NavItem key={id} label={label} Icon={Icon} active={activeView === id} onClick={() => switchView(id)} />
            ))}
          </YStack>
        </YStack>

        <YStack gap={2}>
          <Text fontSize={10} fontWeight="700" color="rgba(255,255,255,0.3)" textTransform="uppercase"
            letterSpacing={1.5} paddingHorizontal={12} paddingBottom={6}>General</Text>

          {/* Currency Switcher */}
          <YStack paddingHorizontal={12} paddingVertical={8} gap={8}>
            <select
              value={dashboard.profile.preferred_currency}
              onChange={async (e) => {
                const newCurrency = e.target.value;
                const { updateCurrencyAction } = await import('@/app/dashboard/settings/actions');
                const formData = new FormData();
                formData.append('currency', newCurrency);
                await updateCurrencyAction(formData);
                refresh();
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                padding: '8px 10px',
                outline: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="PHP">PHP (₱)</option>
              <option value="SGD">SGD ($)</option>
            </select>
          </YStack>

          <button onClick={() => setShowDocuments(true)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
            <XStack alignItems="center" gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={8}
              hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <FileText size={16} color="rgba(255,255,255,0.4)" />
              <Text fontSize={14} color="rgba(255,255,255,0.4)">Documents</Text>
            </XStack>
          </button>
          
          <button onClick={() => setShowSettings(true)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
            <XStack alignItems="center" gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={8}
              hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              {/* @ts-ignore */}
              <Settings size={16} color="rgba(255,255,255,0.4)" />
              <Text fontSize={14} color="rgba(255,255,255,0.4)">Settings</Text>
            </XStack>
          </button>

          <View height={1} backgroundColor="rgba(255,255,255,0.07)" marginVertical={8} marginHorizontal={4} />

          <form action="/auth/signout" method="post" style={{ margin: 0 }}>

            <button type="submit" style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
              <XStack alignItems="center" gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={8}
                hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <LogOut size={15} color="rgba(255,255,255,0.35)" />
                <Text fontSize={14} color="rgba(255,255,255,0.35)">Log out</Text>
              </XStack>
            </button>
          </form>
        </YStack>
      </YStack>

      {/* ══ MAIN ═════════════════════════════════════════════════════════ */}
      <YStack flex={1} style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <XStack backgroundColor="$brandWhite" paddingHorizontal={28} paddingVertical={16}
          borderBottomWidth={1} borderColor="$borderColor"
          justifyContent="space-between" alignItems="center"
          flexShrink={0}>
          <YStack gap={2}>
            <Text fontSize={20} fontWeight="700" color="$brandText" letterSpacing={-0.3}>{PAGE[activeView].title}</Text>
            <Text fontSize={13} color="$brandTextSub">{PAGE[activeView].sub}</Text>
          </YStack>
          <XStack alignItems="center" gap={16}>
            <Button chromeless size="$3" padding={8} borderRadius={8}
              onPress={refresh}
              hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.05)' }}
              icon={loading
                ? <Spinner size="small" color="$brandAccent" />
                : <RefreshCw size={15} color="#6b7280" />} />
            <Bell size={18} color="#9ca3af" />
            <XStack alignItems="center" gap={10}>
              <Circle size={36} backgroundColor="$brandPrimary">
                <Text fontSize={14} fontWeight="700" color="white">{initials}</Text>
              </Circle>
              <YStack gap={1}>
                <Text fontSize={13} fontWeight="600" color="$brandText">{username}</Text>
                <Text fontSize={11} color="$brandTextSub">{userEmail}</Text>
              </YStack>
            </XStack>
          </XStack>
        </XStack>

        {/* Content */}
        <YStack flex={1} padding={24} style={{ overflowY: 'auto', minHeight: 0 }}>
          {activeView === 'overview' && (
            <OverviewContent
              summary={dashboard.summary}
              transactions={dashboard.recentTransactions}
              dti={dashboard.dti}
              contingency={dashboard.contingency}
              marketTrends={dashboard.marketTrends}
              trend={dashboard.trend}
              categoryBreakdown={dashboard.categoryBreakdown}
              goals={dashboard.goals}
            />
          )}
          {activeView === 'income' && (
            viewLoading && incomes === null
              ? <YStack flex={1} alignItems="center" justifyContent="center"><Spinner size="large" color="$brandAccent" /></YStack>
              : <IncomeUI incomes={incomes ?? []} preferredCurrency={dashboard.profile.preferred_currency} rates={rates} />
          )}
          {activeView === 'spending' && (
            viewLoading && expenses === null
              ? <YStack flex={1} alignItems="center" justifyContent="center"><Spinner size="large" color="$brandAccent" /></YStack>
              : <SpendingUI expenses={expenses ?? []} breakdown={expCats} preferredCurrency={dashboard.profile.preferred_currency} rates={rates} />
          )}
          {activeView === 'loans' && (
            viewLoading && loans === null
              ? <YStack flex={1} alignItems="center" justifyContent="center"><Spinner size="large" color="$brandAccent" /></YStack>
              : <LoansUI loans={loans ?? []} totalActiveDebt={dashboard.summary.totalLiabilities} preferredCurrency={dashboard.profile.preferred_currency} rates={rates} onRefresh={refresh} />
          )}
          {activeView === 'budgets' && (
            <BudgetsUI 
              periods={budgetPeriods} 
              profile={dashboard.profile as any} 
              onEnable={refresh}
            />
          )}
          {activeView === 'cash-flow' && (
            cashFlow ? (
              <CashFlowUI 
                payload={cashFlow} 
                userEmail={userEmail || ''}
              />
            ) : <YStack flex={1} alignItems="center" justifyContent="center"><Spinner size="large" color="$brandAccent" /></YStack>
          )}
          {activeView === 'goals' && (
            <GoalsUI 
              goals={dashboard.goals as any} 
              userEmail={userEmail || ''} 
              onRefresh={refresh}
            />
          )}
          {activeView === 'dti' && (
            <DtiContent dti={dashboard.dti} loading={loading} />
          )}
        </YStack>
      </YStack>
    </XStack>
    </Theme>
  )
}
