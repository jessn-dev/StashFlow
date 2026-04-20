'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  formatCurrency, Transaction,
  Income, Expense, Loan, LoanPayment, BudgetPeriod,
} from '@stashflow/core'
import { createClient } from '@/utils/supabase/client'
import { XStack, YStack, Text, Button, Circle, View, Spinner, Switch, Theme, ScrollView, Input, Label } from 'tamagui'
import {
  LayoutDashboard, TrendingUp, CreditCard, Landmark,
  Settings, LogOut, Bell, DollarSign, Wallet,
  ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw,
  PieChart, ChevronDown, Trash2, Target, FileText,
  X, Sun, Moon, Monitor, Sparkles, AlertTriangle, Info, Zap,
  CalendarDays, Film, Home, LayoutGrid, UtensilsCrossed, UserCircle,
  ShoppingCart, GraduationCap, Heart, Car,
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

import { CashFlowPayload, DashboardPayload, fetchRateMap } from '@stashflow/api'

type ActiveView = 'overview' | 'income' | 'spending' | 'loans' | 'dti' | 'budgets' | 'cash-flow' | 'goals'

interface DashboardUIProps {
  payload: DashboardPayload
  userEmail: string | undefined
}

// ─── Hydration Safety ────────────────────────────────────────────────────────
function useIsMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

function SafeHydrate({ children }: { children: React.ReactNode }) {
  const mounted = useIsMounted()
  if (!mounted) return null
  return <>{children}</>
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

const CATEGORIES = ['housing', 'food', 'transport', 'utilities', 'healthcare', 'entertainment', 'education', 'personal', 'other'] as const

// ─── Stat card (reference style) ─────────────────────────────────────────────
function StatCard({ label, value, sub, dark, Icon, trend }: {
  label: string; value: string; sub: string; dark?: boolean
  Icon: React.ElementType; trend?: 'up' | 'down' | null
}) {
  const CardIcon = Icon
  return (
    <YStack flex={1} minWidth={160} height={100}
      backgroundColor={dark ? '#0F3D3E' : '$brandWhite'}
      borderRadius={12} padding={16} gap={8}
      shadowColor="rgba(0,0,0,0.04)" shadowOpacity={1} shadowRadius={10}
      borderWidth={1} borderColor="$borderColor"
      cursor="pointer"
      hoverStyle={{ translateY: -2, shadowOpacity: 0.08, shadowRadius: 15 }}
      animation="quick">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack gap={2}>
          <Text fontSize={12} color={dark ? 'rgba(255,255,255,0.6)' : '$brandTextSub'} fontWeight="400">{label}</Text>
          <Text fontSize={24} fontWeight="700" letterSpacing={-0.5}
            color={dark ? 'white' : '$brandText'}>{value}</Text>
        </YStack>
        <YStack width={32} height={32} borderRadius={8}
          backgroundColor={dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,61,62,0.05)'}
          alignItems="center" justifyContent="center">
          {/* @ts-ignore */}
          <CardIcon size={16} color={dark ? 'white' : '#0F3D3E'} />
        </YStack>
      </XStack>
      {/* Trend */}
      <XStack alignItems="center" gap={4}>
        {trend === 'up'   && <ArrowUpRight   size={10} color={dark ? '#2E7D6B' : '#2E7D32'} />}
        {trend === 'down' && <ArrowDownRight size={10} color={dark ? '#ff8a80' : '#D32F2F'} />}
        <Text fontSize={11} color={dark ? 'rgba(255,255,255,0.45)' : '$brandTextSub'} numberOfLines={1}>{sub}</Text>
      </XStack>
    </YStack>
  )
}

// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  entertainment: Film,
  utilities:     Zap,
  housing:       Home,
  food:          UtensilsCrossed,
  personal:      UserCircle,
  transport:     Car,
  healthcare:    Heart,
  education:     GraduationCap,
  other:         LayoutGrid,
}

// ─── Multi-segment donut chart ────────────────────────────────────────────────
const DONUT_COLORS = ['#1A7A7A', '#0D3D3D', '#4ECDC4', '#ff8a80', '#EAB308', '#8B5CF6']

function MultiSegmentDonut({ categories, total, currency }: {
  categories: { category: string; amount: number }[]
  total: number
  currency: string
}) {
  const cx = 110, cy = 110, r = 74, sw = 34
  const circ = 2 * Math.PI * r
  let cumLen = 0

  const segments = categories.slice(0, 5).map((cat, i) => {
    const pct    = total > 0 ? cat.amount / total : 0
    const len    = pct * circ
    const offset = -cumLen
    const midRad = ((cumLen + len / 2) / circ) * 2 * Math.PI - Math.PI / 2
    const lx     = cx + r * Math.cos(midRad)
    const ly     = cy + r * Math.sin(midRad)
    cumLen += len
    return { ...cat, pct, len, offset, lx, ly, color: DONUT_COLORS[i] }
  })

  return (
    <svg width={220} height={220} style={{ overflow: 'visible' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
      {/* Segments */}
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={sw}
          strokeDasharray={`${s.len} ${circ}`}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      {/* Percentage labels on segments */}
      {segments.map((s, i) => s.pct >= 0.07 && (
        <text
          key={`lbl-${i}`}
          x={s.lx} y={s.ly}
          textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="700"
          fill={s.color === '#0D3D3D' ? 'white' : '#111827'}
        >
          {Math.round(s.pct * 100)}%
        </text>
      ))}
      {/* Center */}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="17" fontWeight="800" fill="#111827">
        {formatCurrency(total, currency)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#6B7280" fontWeight="500">
        Total Expenses
      </text>
    </svg>
  )
}

// ─── Info tooltip ─────────────────────────────────────────────────────────────
function InfoTooltip({ content }: { content: string }) {
  const [visible, setVisible] = useState(false)
  return (
    // @ts-ignore — onMouseEnter/Leave are valid web props
    <View style={{ position: 'relative', display: 'inline-flex' }}>
      <View
        // @ts-ignore
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
      >
        <Info size={11} color="#9ca3af" />
      </View>
      {visible && (
        <YStack
          // @ts-ignore
          style={{
            position: 'absolute', bottom: 18, left: -8, zIndex: 1000,
            width: 220, backgroundColor: '#1f2937', borderRadius: 6,
            padding: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
        >
          <Text fontSize={10} color="white" lineHeight={15}>{content}</Text>
          <View
            // @ts-ignore
            style={{
              position: 'absolute', bottom: -5, left: 12,
              width: 10, height: 10, backgroundColor: '#1f2937',
              transform: 'rotate(45deg)',
            }}
          />
        </YStack>
      )}
    </View>
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

// ─── Alerts Drawer ───────────────────────────────────────────────────────────
function AlertsDrawer({ 
  onClose, 
  onAdjustBudget,
  recommendation,
  currency 
}: { 
  onClose: () => void; 
  onAdjustBudget: (category: string | null) => void;
  recommendation?: any;
  currency: string;
}) {
  const alerts = recommendation?.alerts || []
  const hasAlerts = alerts.length > 0

  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" 
      zIndex={1000} justifyContent="flex-end" animation="quick" style={{ backdropFilter: 'blur(4px)' }}>
      <YStack backgroundColor="$brandWhite" height="100%" width="100%" maxWidth={400} padding={24} gap={24} shadowColor="black" shadowOpacity={0.2} shadowRadius={20} animation="lazy" enterStyle={{ x: 400 }} x={0}>
        <XStack justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="$borderColor" paddingBottom={20}>
          <XStack gap={10} alignItems="center">
            <Bell size={20} color="#111827" />
            <Text fontSize={18} fontWeight="700" color="#111827">Notifications</Text>
          </XStack>
          <Button size="$2" chromeless padding={0} onPress={onClose} icon={<X size={20} color="#6B7280" />} />
        </XStack>

        <ScrollView showsVerticalScrollIndicator={false}>
          {!hasAlerts ? (
            <YStack padding={40} alignItems="center" gap={12}>
               <Circle size={48} backgroundColor="#F3F4F6" alignItems="center" justifyContent="center">
                 <Bell size={20} color="#9CA3AF" />
               </Circle>
               <Text fontSize={14} color="#6B7280" textAlign="center">No new notifications. Your finances look healthy!</Text>
            </YStack>
          ) : (
            <YStack gap={16}>
              {alerts.map((alert: any, i: number) => {
                const isDanger = alert.type === 'danger'
                const isWarning = alert.type === 'warning'
                const problemCat = alert.message.split(' ').find((word: string) => CATEGORIES.includes(word.toLowerCase() as any))

                return (
                  <YStack key={i} backgroundColor={isDanger ? 'rgba(211,47,47,0.03)' : isWarning ? 'rgba(237,108,2,0.03)' : '#F7F9FB'} borderRadius={12} padding={16} gap={10} borderWidth={1} borderColor={isDanger ? 'rgba(211,47,47,0.1)' : isWarning ? 'rgba(237,108,2,0.1)' : '$borderColor'}>
                    <XStack gap={10} alignItems="flex-start">
                       <AlertTriangle size={16} color={isDanger || isWarning ? (isDanger ? '#D32F2F' : '#ED6C02') : '#1A7A7A'} style={{ marginTop: 2 }} />
                       <YStack flex={1} gap={2}>
                          <Text fontSize={13} fontWeight="700" color="#111827">{alert.message}</Text>
                          <Text fontSize={12} color="#6B7280" lineHeight={18}>
                            {isDanger ? 'Critical issue detected. Action recommended immediately.' : 'AI analysis suggests a potential budget optimization.'}
                          </Text>
                       </YStack>
                    </XStack>
                    <Button size="$2" backgroundColor={isDanger ? '#D32F2F' : isWarning ? '#ED6C02' : '#0F3D3E'} borderRadius={6} alignSelf="flex-end" onPress={() => onAdjustBudget(problemCat || null)}>
                       <Text color="white" fontWeight="700" fontSize={11}>FIX NOW</Text>
                    </Button>
                  </YStack>
                )
              })}
            </YStack>
          )}
        </ScrollView>

        <YStack borderTopWidth={1} borderColor="$borderColor" paddingTop={20}>
           <Button size="$4" backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" borderRadius={8} onPress={onClose}>
             <Text fontSize={13} fontWeight="700" color="#111827">CLOSE</Text>
           </Button>
        </YStack>
      </YStack>
    </View>
  )
}

// ─── Budget Drawer ────────────────────────────────────────────────────────────
function BudgetDrawer({ 
  onClose, 
  onSuccess,
  currency,
  initialCategory,
  recommendation
}: { 
  onClose: () => void; 
  onSuccess: () => void;
  currency: string;
  initialCategory?: string | null;
  recommendation?: any;
}) {
  const [loading, setLoading] = useState(false)
  const [budgets, setBudgets] = useState<any[]>([])
  const [viewLoading, setViewLoading] = useState(true)
  const [adjustedAmounts, setAdjustedAmounts] = useState<Record<string, number>>({})
  const [showOther, setShowOther] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { getBudgetPeriod } = await import('@stashflow/api')
      const data = await getBudgetPeriod(sb, new Date().toISOString().slice(0, 7))
      setBudgets(data)
      const initial: Record<string, number> = {}
      data.forEach((b: any) => { initial[b.id] = b.budgeted })
      setAdjustedAmounts(initial)
      setViewLoading(false)
    }
    load()
  }, [])

  const handleSliderChange = (id: string, value: number) => {
    setAdjustedAmounts(prev => ({ ...prev, [id]: value }))
  }

  const handleApplyFix = () => {
    if (!recommendation?.allocations) return
    const newAdjustments = { ...adjustedAmounts }
    budgets.forEach(b => {
      const suggested = recommendation.allocations[b.category]
      if (suggested !== undefined) {
        newAdjustments[b.id] = suggested
      }
    })
    setAdjustedAmounts(newAdjustments)
  }

  const handleSaveAll = async () => {
    setLoading(true)
    try {
      const { updateBudgetAction } = await import('@/app/dashboard/budgets/actions')
      await Promise.all(
        Object.entries(adjustedAmounts).map(([id, amount]) => 
          updateBudgetAction({ id, amount })
        )
      )
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalOriginal = budgets.reduce((s, b) => s + b.budgeted, 0)
  const totalAdjusted = Object.values(adjustedAmounts).reduce((s, a) => s + a, 0)
  const monthlySavings = Math.max(0, totalOriginal - totalAdjusted)
  const remainingOverspend = budgets.reduce((s, b) => {
    const adj = adjustedAmounts[b.id] || b.budgeted
    return s + Math.max(0, b.spent - adj)
  }, 0)

  const highPriority = budgets.filter(b => b.spent > b.budgeted || b.category === initialCategory)
  const otherCategories = budgets.filter(b => !highPriority.includes(b))

  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" 
      zIndex={1000} justifyContent="flex-end" animation="quick" style={{ backdropFilter: 'blur(4px)' }}>
      <YStack backgroundColor="$brandWhite" height="100%" width="100%" maxWidth={480} padding={24} gap={24} shadowColor="black" shadowOpacity={0.2} shadowRadius={20} animation="lazy" enterStyle={{ x: 480 }} x={0}>
        <XStack justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="$borderColor" paddingBottom={20}>
          <YStack gap={2}>
            <Text fontSize={18} fontWeight="700" color="#111827">Adjust Budgets</Text>
            <Text fontSize={12} color="#6B7280">Guided Decision Making</Text>
          </YStack>
          <Button size="$2" chromeless padding={0} onPress={onClose} icon={<X size={20} color="#6B7280" />} />
        </XStack>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          {viewLoading ? (
            <YStack padding={40} alignItems="center"><Spinner size="large" color="#0F3D3E" /></YStack>
          ) : (
            <YStack gap={24}>
              {recommendation?.userAnalysis?.problemDetected && (
                <YStack backgroundColor="#0F3D3E" padding={20} borderRadius={12} gap={12} shadowColor="black" shadowOpacity={0.1} shadowRadius={10}>
                  <XStack gap={10} alignItems="center">
                    <AlertTriangle size={18} color="#ED6C02" />
                    <Text color="white" fontWeight="700" fontSize={14}>Guided Fix Available</Text>
                  </XStack>
                  <Text color="rgba(255,255,255,0.7)" fontSize={13} lineHeight={18}>
                    Our AI suggests reducing high-discretionary categories to save {formatCurrency(Math.max(2000, monthlySavings), currency)}/mo.
                  </Text>
                  <XStack gap={10}>
                    <Button flex={1} backgroundColor="#4ECDC4" height={36} borderRadius={6} onPress={handleApplyFix} hoverStyle={{ opacity: 0.9 }}>
                      <Text color="#0F3D3E" fontWeight="700" fontSize={12}>APPLY SUGGESTED FIX</Text>
                    </Button>
                    <Button flex={0.5} backgroundColor="rgba(255,255,255,0.1)" height={36} borderRadius={6} onPress={() => {}}>
                      <Text color="white" fontWeight="700" fontSize={12}>CUSTOMIZE</Text>
                    </Button>
                  </XStack>
                </YStack>
              )}

              <YStack gap={12}>
                <Text fontSize={11} fontWeight="800" color="#D32F2F" textTransform="uppercase" letterSpacing={1}>🔴 High Priority (Action Required)</Text>
                {highPriority.length > 0 ? highPriority.map(b => (
                  <BudgetPriorityCard 
                    key={b.id} 
                    budget={b} 
                    adjustedAmount={adjustedAmounts[b.id]} 
                    suggestedAmount={recommendation?.allocations?.[b.category]}
                    onSliderChange={(v: number) => handleSliderChange(b.id, v)} 
                    currency={currency}
                    isProblem={true}
                  />
                )) : <Text fontSize={12} color="#6B7280" fontStyle="italic">No critical issues detected.</Text>}
              </YStack>

              <YStack gap={12}>
                <button onClick={() => setShowOther(!showOther)} style={{ all: 'unset', cursor: 'pointer' }}>
                  <XStack alignItems="center" gap={8}>
                    <Text fontSize={11} fontWeight="800" color="#6B7280" textTransform="uppercase" letterSpacing={1}>
                      {showOther ? '▼' : '▶'} Other Categories ({otherCategories.length})
                    </Text>
                  </XStack>
                </button>
                {showOther && otherCategories.map(b => (
                  <BudgetPriorityCard 
                    key={b.id} 
                    budget={b} 
                    adjustedAmount={adjustedAmounts[b.id]} 
                    suggestedAmount={recommendation?.allocations?.[b.category]}
                    onSliderChange={(v: number) => handleSliderChange(b.id, v)} 
                    currency={currency}
                  />
                ))}
              </YStack>
            </YStack>
          )}
        </ScrollView>

        <YStack 
          position="absolute" bottom={0} left={0} right={0} 
          backgroundColor="$brandWhite" borderTopWidth={1} borderColor="$borderColor" 
          padding={24} gap={16} shadowColor="black" shadowOpacity={0.05} shadowRadius={10}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack gap={2}>
              <Text fontSize={11} fontWeight="700" color="#6B7280" textTransform="uppercase">Monthly Savings</Text>
              <Text fontSize={18} fontWeight="800" color="#2E7D32">{formatCurrency(monthlySavings, currency)}</Text>
            </YStack>
            <YStack gap={2} alignItems="flex-end">
              <Text fontSize={11} fontWeight="700" color="#6B7280" textTransform="uppercase">Remaining Overspend</Text>
              <Text fontSize={18} fontWeight="800" color={remainingOverspend > 0 ? '#D32F2F' : '#2E7D32'}>
                {formatCurrency(remainingOverspend, currency)}
              </Text>
            </YStack>
          </XStack>
          <Button size="$5" backgroundColor="#0F3D3E" borderRadius={10} disabled={loading} onPress={handleSaveAll} pressStyle={{ scale: 0.98 }}>
            {loading ? <Spinner color="white" /> : <Text color="white" fontWeight="700" fontSize={15}>APPLY ALL CHANGES</Text>}
          </Button>
        </YStack>
      </YStack>
    </View>
  )
}

function BudgetPriorityCard({ budget, adjustedAmount, onSliderChange, currency, isProblem, suggestedAmount }: any) {
  const percent = Math.min((budget.spent / (adjustedAmount || 1)) * 100, 100)
  const isOver = budget.spent > adjustedAmount

  return (
    <YStack padding={16} borderRadius={12} backgroundColor={isProblem ? 'rgba(211,47,47,0.03)' : '#F7F9FB'} borderWidth={1} borderColor={isProblem ? 'rgba(211,47,47,0.1)' : '$borderColor'} gap={12} animation="quick">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={14} fontWeight="700" color="#111827" textTransform="capitalize">{budget.category}</Text>
        <XStack gap={10} alignItems="center">
          {suggestedAmount !== undefined && (
            <XStack backgroundColor="rgba(78,205,196,0.1)" paddingHorizontal={8} paddingVertical={2} borderRadius={4}>
              <Text fontSize={10} fontWeight="700" color="#1A7A7A">AI SUGGESTED: {formatCurrency(suggestedAmount, currency)}</Text>
            </XStack>
          )}
          <Text fontSize={11} color="#6B7280">Spent:</Text>
          <Text fontSize={12} fontWeight="800" color={isOver ? '#D32F2F' : '#111827'}>{formatCurrency(budget.spent, currency)}</Text>
        </XStack>
      </XStack>

      <YStack gap={6}>
        <XStack justifyContent="space-between">
          <Text fontSize={11} fontWeight="600" color={isOver ? '#D32F2F' : '#6B7280'}>{isOver ? `Over by ${formatCurrency(budget.spent - adjustedAmount, currency)}` : `${percent.toFixed(0)}% used`}</Text>
          <Text fontSize={11} fontWeight="700" color="#111827">Budget: {formatCurrency(adjustedAmount || 0, currency)}</Text>
        </XStack>
        <YStack height={8} borderRadius={999} backgroundColor="#E5E7EB" overflow="hidden">
          <YStack height="100%" width={`${percent}%`} backgroundColor={isOver ? '#D32F2F' : '#2E7D6B'} borderRadius={999} />
        </YStack>
      </YStack>

      <YStack gap={4} marginTop={4}>
        <input 
          type="range" 
          min={0} 
          max={Math.max(budget.budgeted * 2, budget.spent * 1.2, 1000)} 
          step={100}
          value={adjustedAmount || 0}
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <XStack justifyContent="space-between">
          <Text fontSize={9} color="#9CA3AF" fontWeight="600">0</Text>
          <Text fontSize={9} color="#9CA3AF" fontWeight="600">{formatCurrency(Math.max(budget.budgeted * 2, budget.spent * 1.2, 1000), currency)}</Text>
        </XStack>
      </YStack>
    </YStack>
  )
}
// ─── Habit Coach Drawer ──────────────────────────────────────────────────────
function HabitCoachDrawer({ 
  onClose, 
  habitTrend,
  subscriptions,
  currency 
}: { 
  onClose: () => void; 
  habitTrend: any;
  subscriptions: any[];
  currency: string;
}) {
  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" 
      zIndex={1000} justifyContent="flex-end" animation="quick" style={{ backdropFilter: 'blur(4px)' }}>
      <YStack backgroundColor="$brandWhite" height="100%" width="100%" maxWidth={400} padding={24} gap={24} shadowColor="black" shadowOpacity={0.2} shadowRadius={20} animation="lazy" enterStyle={{ x: 400 }} x={0}>
        <XStack justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="$borderColor" paddingBottom={20}>
          <XStack gap={10} alignItems="center">
            <TrendingUp size={20} color="#111827" />
            <Text fontSize={18} fontWeight="700" color="#111827">Habit Coach</Text>
          </XStack>
          <Button size="$2" chromeless padding={0} onPress={onClose} icon={<X size={20} color="#6B7280" />} />
        </XStack>

        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap={24}>
            {/* Trend Section */}
            <YStack backgroundColor={habitTrend?.isImproving ? "rgba(46,125,50,0.05)" : "#F7F9FB"} padding={20} borderRadius={12} gap={12} borderLeftWidth={4} borderColor={habitTrend?.isImproving ? "#2E7D32" : "#9CA3AF"}>
              <Text fontSize={14} fontWeight="700" color="#111827">{habitTrend?.isImproving ? "Excellent Progress!" : "Spending Insights"}</Text>
              <Text fontSize={13} color="#6B7280" lineHeight={18}>{habitTrend?.message}</Text>
              {habitTrend?.isImproving && (
                <XStack gap={8} alignItems="center" marginTop={4}>
                  <View width={24} height={24} borderRadius={12} backgroundColor="rgba(46,125,50,0.1)" alignItems="center" justifyContent="center">
                    <Text fontSize={12}>🏆</Text>
                  </View>
                  <Text fontSize={11} fontWeight="700" color="#2E7D32" textTransform="uppercase">Consistency Streak: 3 Months</Text>
                </XStack>
              )}
            </YStack>

            {/* Subscriptions Section */}
            <YStack gap={12}>
              <Text fontSize={13} fontWeight="700" color="#111827" textTransform="uppercase" letterSpacing={0.5}>Detected Subscriptions</Text>
              {subscriptions.length > 0 ? (
                <YStack gap={10}>
                  {subscriptions.map((sub, i) => {
                    const CatIcon = CATEGORY_ICONS[sub.category] ?? LayoutGrid
                    return (
                      <XStack key={i} backgroundColor="#F7F9FB" padding={12} borderRadius={10} alignItems="center" gap={12}>
                        <YStack width={36} height={36} borderRadius={8} backgroundColor="rgba(0,0,0,0.03)" alignItems="center" justifyContent="center">
                           {/* @ts-ignore */}
                           <CatIcon size={18} color="#0F3D3E" />
                        </YStack>
                        <YStack flex={1}>
                          <Text fontSize={13} fontWeight="600" color="#111827">{sub.name}</Text>
                          <Text fontSize={11} color="#6B7280">Billed monthly</Text>
                        </YStack>
                        <Text fontSize={13} fontWeight="700" color="#111827">{formatCurrency(sub.amount, currency)}</Text>
                      </XStack>
                    )
                  })}
                  <YStack marginTop={8} padding={12} borderRadius={8} backgroundColor="rgba(15,61,62,0.03)" borderStyle="dashed" borderWidth={1} borderColor="rgba(15,61,62,0.1)">
                    <Text fontSize={11} color="#6B7280" textAlign="center">
                      Total Monthly: <Text fontWeight="800" color="#0F3D3E">{formatCurrency(subscriptions.reduce((s, a) => s + a.amount, 0), currency)}</Text>
                    </Text>
                  </YStack>
                </YStack>
              ) : (
                <Text fontSize={12} color="#6B7280" fontStyle="italic">No recurring subscriptions detected yet.</Text>
              )}
            </YStack>

            <YStack backgroundColor="#F7F9FB" padding={16} borderRadius={10} gap={8}>
               <Text fontSize={12} fontWeight="700" color="#111827">Coach Tips</Text>
               <Text fontSize={11} color="#6B7280" lineHeight={16}>
                  • Review your subscriptions quarterly to cancel unused services.<br />
                  • Your lowest spending category this month is {CATEGORIES[0]} — keep it up!
               </Text>
            </YStack>
          </YStack>
        </ScrollView>

        <YStack borderTopWidth={1} borderColor="$borderColor" paddingTop={20}>
           <Button size="$4" backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" borderRadius={8} onPress={onClose}>
             <Text fontSize={13} fontWeight="700" color="#111827">CLOSE COACH</Text>
           </Button>
        </YStack>
      </YStack>
    </View>
  )
}

// ─── Add Goal Modal ──────────────────────────────────────────────────────────
function AddGoalModal({ 
  onClose, 
  onSuccess,
  currency 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
  currency: string
}) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    type: 'savings'
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { createGoal } = await import('@/app/dashboard/goals/actions')
      const fd = new FormData()
      fd.append('name', formData.name)
      fd.append('target_amount', formData.target_amount)
      fd.append('type', formData.type)
      fd.append('currency', currency)
      
      await createGoal(fd)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const labelProps = { fontSize: 11, fontWeight: '700' as const, color: '#6B7280', textTransform: 'uppercase' as const, marginBottom: 4 }

  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" 
      zIndex={1000} alignItems="center" justifyContent="center" padding={20} animation="quick">
      <YStack backgroundColor="$brandWhite" borderRadius={12} width="100%" maxWidth={400} padding={24} gap={20} shadowColor="black" shadowOpacity={0.2} shadowRadius={20}>
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontSize={18} fontWeight="700" color="#111827">Create New Goal</Text>
            <Text fontSize={12} color="#6B7280">Step {step} of 2</Text>
          </YStack>
          <Button size="$2" chromeless padding={0} onPress={onClose} icon={<X size={18} color="#6B7280" />} />
        </XStack>

        {step === 1 ? (
          <YStack gap={16}>
             <YStack>
               <Label {...labelProps}>What are you saving for?</Label>
               <Input value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} placeholder="e.g. Dream House" borderRadius={8} backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" height={44} />
             </YStack>
             <YStack>
               <Label {...labelProps}>Goal Type</Label>
               <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{ height: 44, padding: '0 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#F7F9FB', fontSize: 14, color: '#111827', outline: 'none' }}>
                 <option value="savings">Savings / Emergency Fund</option>
                 <option value="debt">Debt Payoff</option>
                 <option value="investment">Investment Portfolio</option>
               </select>
             </YStack>
             <Button size="$4" backgroundColor="#0F3D3E" borderRadius={8} onPress={() => setStep(2)} disabled={!formData.name}>
               <Text fontSize={13} fontWeight="700" color="white">NEXT STEP</Text>
             </Button>
          </YStack>
        ) : (
          <YStack gap={16}>
             <YStack>
               <Label {...labelProps}>Target Amount ({currency})</Label>
               <Input value={formData.target_amount} onChangeText={(t) => setFormData({...formData, target_amount: t})} inputMode="numeric" placeholder="0.00" borderRadius={8} backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" height={44} />
             </YStack>
             
             {formData.target_amount && (
               <YStack backgroundColor="#F7F9FB" padding={12} borderRadius={8} borderLeftWidth={4} borderColor="#2E7D6B">
                 <Text fontSize={11} color="#6B7280" fontWeight="600">Goal Preview</Text>
                 <Text fontSize={13} color="#111827" fontWeight="500" marginTop={2}>
                    To reach {formatCurrency(parseFloat(formData.target_amount), currency)} in 12 months, you'll need {formatCurrency(parseFloat(formData.target_amount)/12, currency)}/mo.
                 </Text>
               </YStack>
             )}

             <XStack gap={12}>
               <Button flex={1} size="$4" backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" borderRadius={8} onPress={() => setStep(1)}>
                 <Text fontSize={13} fontWeight="700" color="#6B7280">BACK</Text>
               </Button>
               <Button flex={2} size="$4" backgroundColor="#0F3D3E" borderRadius={8} disabled={loading || !formData.target_amount} onPress={handleSubmit}>
                 {loading ? <Spinner color="white" /> : <Text fontSize={13} fontWeight="700" color="white">CREATE GOAL</Text>}
               </Button>
             </XStack>
          </YStack>
        )}
      </YStack>
    </View>
  )
}
function AddExpenseModal({ 
  onClose, 
  onSuccess,
  currency 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
  currency: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addAnother, setAddAnother] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    try {
      const { addExpense } = await import('@/app/dashboard/spending/actions')
      const result = await addExpense(formData)
      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
        if (!addAnother) {
          onClose()
        } else {
          const form = document.getElementById('quick-add-expense') as HTMLFormElement
          form?.reset()
          const amountInput = document.getElementsByName('amount')[0] as HTMLInputElement
          amountInput?.focus()
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const labelProps = { fontSize: 11, fontWeight: '700' as const, color: '#6B7280', textTransform: 'uppercase' as const, marginBottom: 4 }

  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" 
      zIndex={1000} alignItems="center" justifyContent="center" padding={20} animation="quick">
      <YStack backgroundColor="$brandWhite" borderRadius={12} width="100%" maxWidth={400} padding={24} gap={20} shadowColor="black" shadowOpacity={0.2} shadowRadius={20}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={18} fontWeight="700" color="#111827">Add Expense</Text>
          <Button size="$2" chromeless padding={0} onPress={onClose} icon={<X size={18} color="#6B7280" />} />
        </XStack>

        <form id="quick-add-expense" action={handleSubmit}>
          <input type="hidden" name="currency" value={currency} />
          <YStack gap={16}>
            <YStack>
              <Label {...labelProps}>Amount</Label>
              <Input name="amount" autoFocus inputMode="decimal" placeholder="0.00" borderRadius={8} backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" height={44} />
            </YStack>

            <YStack>
              <Label {...labelProps}>Category</Label>
              <select name="category" required style={{ height: 44, padding: '0 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#F7F9FB', fontSize: 14, color: '#111827', outline: 'none', textTransform: 'capitalize' }}>
                {['food', 'transport', 'entertainment', 'personal', 'utilities', 'healthcare', 'education', 'housing', 'other'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </YStack>

            <YStack>
              <Label {...labelProps}>Description</Label>
              <Input name="description" placeholder="e.g. Starbucks Coffee" borderRadius={8} backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" height={44} />
            </YStack>

            <YStack>
              <Label {...labelProps}>Date</Label>
              <Input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} borderRadius={8} backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" height={44} />
            </YStack>

            <XStack alignItems="center" gap={10}>
               <input type="checkbox" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} style={{ width: 16, height: 16 }} />
               <Text fontSize={12} color="#6B7280">Save & add another</Text>
            </XStack>

            {error && <Text fontSize={12} color="#D32F2F" textAlign="center">{error}</Text>}

            <XStack gap={12} marginTop={8}>
              <Button flex={1} size="$4" backgroundColor="#F7F9FB" borderWidth={1} borderColor="$borderColor" borderRadius={8} onPress={onClose}>
                <Text fontSize={13} fontWeight="700" color="#6B7280">CANCEL</Text>
              </Button>
              <Button flex={2} size="$4" backgroundColor="#0F3D3E" borderRadius={8} disabled={loading} onPress={(e) => (e.target as any).closest('form')?.requestSubmit()}>
                {loading ? <Spinner color="white" /> : <Text fontSize={13} fontWeight="700" color="white">SAVE EXPENSE</Text>}
              </Button>
            </XStack>
          </YStack>
        </form>
      </YStack>
    </View>
  )
}
function OverviewContent({ 
  summary, transactions, dti, contingency, marketTrends, 
  trend, categoryBreakdown, budgetRecommendation, goals, subscriptions, habitTrend, onRefresh, onSwitchView,
  showAddExpense, setShowAddExpense,
  showBudgetDrawer, setShowBudgetDrawer,
  showAddGoal, setShowAddGoal,
  activeBudgetCategory, setActiveBudgetCategory
}: {
  summary: DashboardPayload['summary']
  transactions: Transaction[]
  dti: DashboardPayload['dti']
  contingency: DashboardPayload['contingency']
  marketTrends: DashboardPayload['marketTrends']
  trend: DashboardPayload['trend']
  categoryBreakdown: DashboardPayload['categoryBreakdown']
  budgetRecommendation: DashboardPayload['budgetRecommendation']
  goals: DashboardPayload['goals']
  subscriptions: any[]
  habitTrend?: any
  onRefresh: () => void
  onSwitchView: (view: any) => void
  showAddExpense: boolean; setShowAddExpense: (v: boolean) => void
  showBudgetDrawer: boolean; setShowBudgetDrawer: (v: boolean) => void
  showAddGoal: boolean; setShowAddGoal: (v: boolean) => void
  activeBudgetCategory: string | null; setActiveBudgetCategory: (v: string | null) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const sb = createClient();
      const { data, error } = await sb.functions.invoke('sync-market-data');
      if (error) {
        const errorData = await error.context?.json();
        setSyncError(errorData?.error || error.message);
      } else {
        onRefresh();
      }
    } catch (e: any) {
      setSyncError(e.message);
    } finally {
      setSyncing(false)
    }
  }

  const dtiRatio = dti?.ratio || 0
  const dtiColor = dti?.color || '#4ECDC4'
  const ringColors = ['#1A7A7A', '#0D3D3D', '#4ECDC4', '#ff8a80', '#EAB308']
  const totalMonthlyExp = (categoryBreakdown || []).reduce((s, c) => s + c.amount, 0)

  // ── Phase 2: First-Class Chart Insights ───────────────────────────────────
  const momInsight = useMemo(() => {
    if (!trend || trend.length < 2) return null
    const latest = trend[trend.length - 1]
    const previous = trend[trend.length - 2]
    if (previous.expense === 0) return null
    const diff = ((latest.expense - previous.expense) / previous.expense) * 100
    const direction = diff > 0 ? 'increased' : 'decreased'
    const color = diff > 0 ? '#D32F2F' : '#2E7D32'
    return {
      text: `Expenses ${direction} ${Math.abs(diff).toFixed(0)}% this month ${diff > 0 ? '↑' : '↓'}`,
      color
    }
  }, [trend])

  const topCategoryInsight = useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return null
    const top = [...categoryBreakdown].sort((a, b) => b.amount - a.amount)[0]
    return `Your highest expense was ${top.category.charAt(0).toUpperCase() + top.category.slice(1)}`
  }, [categoryBreakdown])

  const savingsOpportunity = useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return null
    const discretionary = categoryBreakdown.find(c => ['entertainment', 'personal', 'other'].includes(c.category))
    if (!discretionary || discretionary.amount < 100) return null
    const potential = discretionary.amount * 0.2
    return {
      text: `You could save ${formatCurrency(potential, summary.currency)}/mo by reducing ${discretionary.category} expenses`,
      category: discretionary.category
    }
  }, [categoryBreakdown, summary.currency])

  const [searchTerm, setSearchBar] = useState('')
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null)

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = (tx.description || tx.source || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filter === 'all' || tx.type === filter
      return matchesSearch && matchesFilter
    })
  }, [transactions, searchTerm, filter])

  const [showMarketDetail, setShowMarketDetail] = useState(false)
  const [showSavingsDetail, setShowSavingsDetail] = useState(false)
  const [showHabitCoach, setShowHabitCoach] = useState(false)

  return (
    <SafeHydrate>
      <YStack gap={24} paddingBottom={40} backgroundColor="#F7F9FB">
      {/* Interactive Components */}
      {showHabitCoach && (
        <HabitCoachDrawer 
          onClose={() => setShowHabitCoach(false)}
          habitTrend={habitTrend}
          subscriptions={subscriptions}
          currency={summary.currency}
        />
      )}
      {showAddExpense && (
        <AddExpenseModal 
          currency={summary.currency} 
          onClose={() => setShowAddExpense(false)} 
          onSuccess={onRefresh} 
        />
      )}
      {showBudgetDrawer && (
        <BudgetDrawer 
          currency={summary.currency} 
          initialCategory={activeBudgetCategory}
          recommendation={budgetRecommendation}
          breakdown={categoryBreakdown}
          onClose={() => {
            setShowBudgetDrawer(false)
            setActiveBudgetCategory(null)
          }} 
          onSuccess={onRefresh} 
        />
      )}
      {showAddGoal && (
        <AddGoalModal 
          currency={summary.currency} 
          onClose={() => setShowAddGoal(false)} 
          onSuccess={onRefresh} 
        />
      )}

      {/* Market Detail Panel */}
      {showMarketDetail && budgetRecommendation?.marketIndicators && (
        <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" zIndex={1100} justifyContent="flex-end">
           <YStack backgroundColor="$brandWhite" height="100%" width="100%" maxWidth={500} padding={32} gap={32} animation="lazy" enterStyle={{ x: 500 }} x={0}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={20} fontWeight="700" color="#111827">Market Intelligence</Text>
                <Button size="$2" chromeless onPress={() => setShowMarketDetail(false)} icon={<X size={20} color="#6B7280" />} />
              </XStack>
              
              <YStack gap={20}>
                 <YStack backgroundColor="#F7F9FB" padding={20} borderRadius={12} gap={10}>
                    <Text fontSize={12} fontWeight="700" color="#2E7D6B" textTransform="uppercase">Regional Strategy</Text>
                    <Text fontSize={15} color="#111827" fontWeight="600" fontStyle="italic">"{budgetRecommendation.macroRationale}"</Text>
                    <Text fontSize={13} color="#6B7280" lineHeight={20}>{budgetRecommendation.rationale}</Text>
                 </YStack>

                 <YStack gap={16}>
                    <Text fontSize={14} fontWeight="700" color="#111827">Key Indicators</Text>
                    {budgetRecommendation.marketIndicators.map((ind, i) => (
                      <XStack key={i} justifyContent="space-between" alignItems="center" paddingBottom={12} borderBottomWidth={1} borderColor="$borderColor">
                         <YStack>
                           <Text fontSize={13} fontWeight="600" color="#111827">{ind.label}</Text>
                           <Text fontSize={11} color="#6B7280">Source: {ind.source}</Text>
                         </YStack>
                         <Text fontSize={13} fontWeight="700" color={ind.status === 'up' ? '#D32F2F' : '#2E7D32'}>{ind.value}</Text>
                      </XStack>
                    ))}
                 </YStack>
              </YStack>

              <Button size="$4" backgroundColor="#0F3D3E" borderRadius={8} marginTop="auto" onPress={() => setShowMarketDetail(false)}>
                <Text color="white" fontWeight="700">GOT IT</Text>
              </Button>
           </YStack>
        </View>
      )}

      {/* Savings Detail Panel */}
      {showSavingsDetail && savingsOpportunity && (
        <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)" zIndex={1100} justifyContent="flex-end">
           <YStack backgroundColor="$brandWhite" height="100%" width="100%" maxWidth={500} padding={32} gap={32} animation="lazy" enterStyle={{ x: 500 }} x={0}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={20} fontWeight="700" color="#111827">Savings Opportunity</Text>
                <Button size="$2" chromeless onPress={() => setShowSavingsDetail(false)} icon={<X size={20} color="#6B7280" />} />
              </XStack>

              <YStack gap={24}>
                 <YStack gap={8}>
                    <Text fontSize={14} fontWeight="600" color="#111827">Current {savingsOpportunity.category} spending</Text>
                    <Text fontSize={32} fontWeight="800" color="#111827">
                      {formatCurrency((categoryBreakdown?.find(c => c.category === savingsOpportunity.category)?.amount || 0), summary.currency)}
                    </Text>
                 </YStack>

                 <YStack backgroundColor="#F7F9FB" padding={20} borderRadius={12} gap={16}>
                    <YStack gap={4}>
                      <Text fontSize={13} fontWeight="700" color="#2E7D6B">Potential Monthly Savings</Text>
                      <Text fontSize={24} fontWeight="800" color="#2E7D6B">{formatCurrency((categoryBreakdown?.find(c => c.category === savingsOpportunity.category)?.amount || 0) * 0.2, summary.currency)}</Text>
                    </YStack>
                    <Text fontSize={12} color="#6B7280" lineHeight={18}>
                      By reducing your {savingsOpportunity.category} expenses by 20%, you could reach your goals {Math.round(summary.totalLiabilities / ((categoryBreakdown?.find(c => c.category === savingsOpportunity.category)?.amount || 0) * 0.2 || 1))} months faster.
                    </Text>
                 </YStack>

                 <Button size="$4" backgroundColor="#0F3D3E" borderRadius={8} onPress={() => {
                   setActiveBudgetCategory(savingsOpportunity.category)
                   setShowBudgetDrawer(true)
                   setShowSavingsDetail(false)
                 }}>
                   <Text color="white" fontWeight="700">ADJUST THIS BUDGET</Text>
                 </Button>
              </YStack>
           </YStack>
        </View>
      )}

      {contingency.active && (
        <XStack backgroundColor="#D32F2F" padding={12} borderRadius={12} alignItems="center" gap={12} shadowColor="black" shadowOpacity={0.1} shadowRadius={10}>
          <AlertTriangle size={20} color="white" />
          <YStack flex={1}>
            <Text color="white" fontWeight="700" fontSize={14}>CONTINGENCY PROTOCOL ACTIVE</Text>
            <Text color="rgba(255,255,255,0.9)" fontSize={12}>Focusing on bare-metal essentials ({formatCurrency(contingency.essentialMonthlySpend, summary.currency)}/mo).</Text>
          </YStack>
          <YStack backgroundColor="rgba(255,255,255,0.2)" paddingHorizontal={12} paddingVertical={6} borderRadius={8}>
            <Text color="white" fontWeight="800" fontSize={16}>{contingency.liquidRunwayDays} DAYS</Text>
            <Text color="rgba(255,255,255,0.8)" fontSize={9} textTransform="uppercase" textAlign="center">Liquid Runway</Text>
          </YStack>
        </XStack>
      )}

      {/* ── Summary Strip (Top Row) ── */}
      <XStack gap={16} flexWrap="wrap">
        <StatCard label="Net Worth"     value={formatCurrency(summary.netWorth, summary.currency)}        sub="Total remaining value"    dark Icon={Wallet}          trend={summary.netWorth >= 0 ? 'up' : 'down'} />
        <StatCard label="Monthly Income" value={formatCurrency(summary.thisMonth.income, summary.currency)} sub="Earnings this month"     Icon={TrendingUp}    trend="up" />
        <StatCard label="Monthly Exp"    value={formatCurrency(summary.thisMonth.expense, summary.currency)} sub={`${summary.thisMonth.growth.toFixed(0)}% vs last month`} Icon={CreditCard} trend={summary.thisMonth.growth > 0 ? 'down' : 'up'} />
        <StatCard label="Remaining Debt" value={formatCurrency(summary.totalLiabilities, summary.currency)} sub="Unpaid loan balance"    Icon={Landmark} />
      </XStack>

      {/* ── Main Grid (Middle Area) ── */}
      <XStack gap={16} flexWrap="wrap" alignItems="stretch">
        
        {/* LEFT COLUMN (8 cols ≈ 66%) */}
        <YStack flex={2} minWidth={320} gap={24}>
          {/* Cash Flow Trend (PRIMARY CARD) */}
          <YStack backgroundColor="$brandWhite" borderRadius={12} padding={20} gap={16} shadowColor="rgba(0,0,0,0.02)" shadowOpacity={1} shadowRadius={8} borderWidth={1} borderColor="$borderColor">
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap={4}>
                <Text fontSize={16} fontWeight="700" color="#111827">Cash Flow Trend</Text>
                <Text fontSize={12} color="#6B7280" fontWeight="500">6-month growth analysis</Text>
              </YStack>
              {momInsight && (
                <XStack 
                  backgroundColor={momInsight.color === '#D32F2F' ? 'rgba(211,47,47,0.06)' : 'rgba(46,125,50,0.06)'} 
                  paddingHorizontal={14} paddingVertical={8} borderRadius={20} borderWidth={1} borderColor={momInsight.color as any} 
                  gap={6} alignItems="center"
                  shadowColor={momInsight.color as any} shadowOpacity={0.1} shadowRadius={5}
                >
                  <Text fontSize={15} fontWeight="800" color={momInsight.color as any}>{momInsight.text}</Text>
                </XStack>
              )}
            </XStack>
            
            <XStack 
              paddingHorizontal={5} position="relative"
              onMouseLeave={() => setHoveredTrendIndex(null)}
            >
              {(() => {
                const max = Math.max(...trend.map(t => Math.max(t.income, t.expense, 100))) * 1.1
                const width = 600
                const height = 220
                const stepX = width / (trend.length - 1)
                
                const getPoints = (key: 'income' | 'expense') => 
                  trend.map((m, i) => `${i * stepX},${height - (m[key] / max) * height}`).join(' ')

                const incomePoints = getPoints('income')
                const expensePoints = getPoints('expense')
                
                const incomeArea = `${incomePoints} ${ (trend.length-1)*stepX },${height} 0,${height}`
                const expenseArea = `${expensePoints} ${ (trend.length-1)*stepX },${height} 0,${height}`

                return (
                  <YStack flex={1} gap={12}>
                    <div style={{ height: 240, position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox={`-10 -10 ${width + 20} ${height + 20}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.12" />
                            <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D32F2F" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#D32F2F" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Vertical Guide Line */}
                        {hoveredTrendIndex !== null && (
                          <line x1={hoveredTrendIndex * stepX} y1="0" x2={hoveredTrendIndex * stepX} y2={height} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,2" />
                        )}

                        {/* Area Fills */}
                        <polygon points={incomeArea} fill="url(#gradIncome)" />
                        <polygon points={expenseArea} fill="url(#gradExpense)" />

                        {/* Lines */}
                        <polyline points={incomePoints} fill="none" stroke="#4ECDC4" strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points={expensePoints} fill="none" stroke="#D32F2F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Markers & Interaction Areas */}
                        {trend.map((m, i) => {
                          const isLast = i === trend.length - 1
                          const isHovered = hoveredTrendIndex === i
                          return (
                            <g key={i}>
                              {/* Invisible hit area for better hover experience */}
                              <rect 
                                x={i === 0 ? -10 : (i * stepX) - (stepX / 2)} 
                                y="0" 
                                width={i === 0 || isLast ? stepX / 2 + 10 : stepX} 
                                height={height} 
                                fill="transparent" 
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredTrendIndex(i)}
                              />
                              
                              <circle cx={i * stepX} cy={height - (m.income / max) * height} r={isHovered ? "6" : isLast ? "7" : "4"} fill="white" stroke="#4ECDC4" strokeWidth="2" />
                              <circle cx={i * stepX} cy={height - (m.expense / max) * height} r={isHovered ? "7" : isLast ? "7" : "4"} fill="white" stroke="#D32F2F" strokeWidth={isHovered || isLast ? "4" : "3"} />
                              
                              {isLast && (
                                <circle cx={i * stepX} cy={height - (m.expense / max) * height} r={14} fill="#D32F2F" opacity="0.1">
                                  <animate attributeName="r" from="10" to="20" dur="3s" repeatCount="indefinite" />
                                  <animate attributeName="opacity" from="0.3" to="0" dur="3s" repeatCount="indefinite" />
                                </circle>
                              )}
                            </g>
                          )
                        })}
                      </svg>
                      
                      {/* Tooltip */}
                      {hoveredTrendIndex !== null && (
                        <YStack 
                          position="absolute" 
                          top={-10} 
                          left={hoveredTrendIndex > trend.length / 2 ? (hoveredTrendIndex * 100/ (trend.length -1)) - 30 + "%" : (hoveredTrendIndex * 100/ (trend.length -1)) + 5 + "%"}
                          backgroundColor="#111827" 
                          padding={10} 
                          borderRadius={8} 
                          gap={4} 
                          zIndex={100}
                          shadowColor="black" shadowOpacity={0.3} shadowRadius={15}
                        >
                          <Text fontSize={10} fontWeight="800" color="white" textTransform="uppercase" letterSpacing={1}>{trend[hoveredTrendIndex].month}</Text>
                          <YStack gap={2}>
                            <XStack gap={8} alignItems="center">
                              <Circle size={6} backgroundColor="#4ECDC4" />
                              <Text fontSize={11} color="rgba(255,255,255,0.6)" fontWeight="500">Income: <Text color="white" fontWeight="700">{formatCurrency(trend[hoveredTrendIndex].income, summary.currency)}</Text></Text>
                            </XStack>
                            <XStack gap={8} alignItems="center">
                              <Circle size={6} backgroundColor="#D32F2F" />
                              <Text fontSize={11} color="rgba(255,255,255,0.6)" fontWeight="500">Expense: <Text color="white" fontWeight="700">{formatCurrency(trend[hoveredTrendIndex].expense, summary.currency)}</Text></Text>
                            </XStack>
                          </YStack>
                        </YStack>
                      )}
                    </div>
                    {/* X-Axis Labels */}
                    <XStack justifyContent="space-between">
                      {trend.map((m, i) => (
                        <Text key={i} fontSize={11} color="#6B7280" fontWeight="700">{m.month}</Text>
                      ))}
                    </XStack>
                  </YStack>
                )
              })()}
            </XStack>
            
            <XStack gap={24} justifyContent="center" borderTopWidth={1} borderColor="$borderColor" paddingTop={16}>
              <XStack gap={8} alignItems="center"><View width={12} height={2} backgroundColor="#4ECDC4" borderRadius={2} style={{ borderStyle: 'dashed' }} /><Text fontSize={12} color="#111827" fontWeight="600">Income (Dashed)</Text></XStack>
              <XStack gap={8} alignItems="center"><Circle size={10} backgroundColor="#D32F2F" /><Text fontSize={12} color="#111827" fontWeight="700">Expense (Primary)</Text></XStack>
            </XStack>
          </YStack>

          {/* Spending Breakdown */}
          <YStack backgroundColor="$brandWhite" borderRadius={12} padding={24} gap={20} shadowColor="rgba(0,0,0,0.02)" shadowOpacity={1} shadowRadius={8} borderWidth={1} borderColor="$borderColor">
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap={2}>
                <Text fontSize={16} fontWeight="700" color="#111827">Spending Breakdown</Text>
                <Text fontSize={12} color="#6B7280" fontWeight="500">Where your money goes</Text>
              </YStack>
              <XStack alignItems="center" gap={6} backgroundColor="#F7F9FB" paddingHorizontal={10} paddingVertical={6} borderRadius={8} borderWidth={1} borderColor="$borderColor">
                <CalendarDays size={12} color="#6B7280" />
                <Text fontSize={12} fontWeight="600" color="#374151">This Month</Text>
              </XStack>
            </XStack>

            {/* Body: donut + table */}
            <XStack gap={28} alignItems="flex-start">
              {/* Donut */}
              <YStack width={220} flexShrink={0}>
                {categoryBreakdown?.length > 0
                  ? <MultiSegmentDonut categories={categoryBreakdown} total={totalMonthlyExp} currency={summary.currency} />
                  : <YStack width={220} height={220} alignItems="center" justifyContent="center"><Text fontSize={13} color="#6B7280">No data</Text></YStack>
                }
              </YStack>

              {/* Table */}
              <YStack flex={1} gap={0}>
                {/* Table header */}
                <XStack paddingHorizontal={8} paddingBottom={8} borderBottomWidth={1} borderColor="$borderColor">
                  <Text flex={1} fontSize={10} fontWeight="700" color="#9CA3AF" textTransform="uppercase" letterSpacing={0.5}>Category</Text>
                  <Text width={90} fontSize={10} fontWeight="700" color="#9CA3AF" textTransform="uppercase" letterSpacing={0.5} textAlign="right">Amount</Text>
                  <Text width={72} fontSize={10} fontWeight="700" color="#9CA3AF" textTransform="uppercase" letterSpacing={0.5} textAlign="right">% of Total</Text>
                  <Text width={88} fontSize={10} fontWeight="700" color="#9CA3AF" textTransform="uppercase" letterSpacing={0.5} textAlign="right">vs Last Mo.</Text>
                </XStack>

                {/* Rows */}
                {(categoryBreakdown || []).slice(0, 5).map((c, i) => {
                  const CatIcon = CATEGORY_ICONS[c.category] ?? LayoutGrid
                  const pct     = totalMonthlyExp > 0 ? Math.round((c.amount / totalMonthlyExp) * 100) : 0
                  const maxAmt  = Math.max(...(categoryBreakdown || []).map(x => x.amount))
                  const barW    = maxAmt > 0 ? (c.amount / maxAmt) * 100 : 0
                  const color   = DONUT_COLORS[i % DONUT_COLORS.length]
                  const vs      = c.vsLastMonth

                  return (
                    <YStack key={c.category} borderBottomWidth={i < 4 ? 1 : 0} borderColor="$borderColor" paddingVertical={10} paddingHorizontal={8}>
                      <XStack alignItems="center">
                        {/* Category cell */}
                        <XStack flex={1} alignItems="center" gap={8}>
                          <Circle size={8} backgroundColor={color} />
                          <YStack width={28} height={28} borderRadius={6} backgroundColor={`${color}18`} alignItems="center" justifyContent="center">
                            {/* @ts-ignore */}
                            <CatIcon size={14} color={color} />
                          </YStack>
                          <YStack flex={1} gap={3}>
                            <Text fontSize={12} fontWeight="600" color="#111827" textTransform="capitalize">{c.category}</Text>
                            <YStack height={3} backgroundColor="#F3F4F6" borderRadius={999} overflow="hidden">
                              <YStack height="100%" width={`${barW}%`} backgroundColor={color} borderRadius={999} />
                            </YStack>
                          </YStack>
                        </XStack>
                        {/* Amount */}
                        <Text width={90} fontSize={12} fontWeight="700" color="#111827" textAlign="right">{formatCurrency(c.amount, summary.currency)}</Text>
                        {/* % of total */}
                        <Text width={72} fontSize={12} fontWeight="600" color="#6B7280" textAlign="right">{pct}%</Text>
                        {/* vs last month badge */}
                        <XStack width={88} justifyContent="flex-end">
                          {vs !== null && vs !== undefined ? (
                            <XStack
                              backgroundColor={vs > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)'}
                              paddingHorizontal={7} paddingVertical={3} borderRadius={6}
                              alignItems="center" gap={3}
                            >
                              {vs > 0
                                ? <ArrowUpRight size={10} color="#DC2626" />
                                : <ArrowDownRight size={10} color="#059669" />}
                              <Text fontSize={11} fontWeight="700" color={vs > 0 ? '#DC2626' : '#059669'}>
                                {Math.abs(vs)}%
                              </Text>
                            </XStack>
                          ) : (
                            <Text fontSize={11} color="#D1D5DB" textAlign="right">—</Text>
                          )}
                        </XStack>
                      </XStack>
                    </YStack>
                  )
                })}
              </YStack>
            </XStack>

            {/* Insight block */}
            {categoryBreakdown?.length >= 2 && (() => {
              const top    = categoryBreakdown[0]
              const second = categoryBreakdown.find(c => c.category !== top.category)
              const mult   = second && second.amount > 0 ? (top.amount / second.amount).toFixed(1) : null
              return (
                <XStack backgroundColor="rgba(78,205,196,0.06)" padding={16} borderRadius={12} alignItems="center" gap={16}>
                  <YStack width={36} height={36} borderRadius={999} backgroundColor="rgba(78,205,196,0.15)" alignItems="center" justifyContent="center" flexShrink={0}>
                    <TrendingUp size={18} color="#1A7A7A" />
                  </YStack>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={13} color="#111827" fontWeight="700">
                      <Text textTransform="capitalize">{top.category}</Text> is your highest expense ({totalMonthlyExp > 0 ? Math.round((top.amount / totalMonthlyExp) * 100) : 0}%).
                    </Text>
                    {mult && (
                      <Text fontSize={12} color="#6B7280" fontWeight="500">
                        You're spending {mult}× more than <Text textTransform="capitalize" fontWeight="600">{second?.category}</Text>.
                      </Text>
                    )}
                  </YStack>
                  <Button
                    size="$2" borderRadius={8} borderWidth={1} borderColor="$brandPrimary"
                    backgroundColor="transparent"
                    onPress={() => onSwitchView('spending')}
                  >
                    <Text fontSize={11} fontWeight="700" color="$brandPrimary">View Details</Text>
                  </Button>
                </XStack>
              )
            })()}
          </YStack>
        </YStack>

        {/* RIGHT COLUMN (4 cols ≈ 34%) */}
        <YStack flex={1} minWidth={280} gap={16}>
          {/* Transaction History Panel */}
          <YStack flex={1} backgroundColor="$brandWhite" borderRadius={12}
            shadowColor="rgba(0,0,0,0.03)" shadowOpacity={1} shadowRadius={10}
            borderWidth={1} borderColor="$borderColor" overflow="hidden" minHeight={580}>
            
            {/* Sticky Header with Search & Filter */}
            <YStack paddingHorizontal={16} paddingVertical={12} borderBottomWidth={1} borderColor="$borderColor" gap={12} backgroundColor="$brandWhite">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={14} fontWeight="600" color="#111827">Transactions</Text>
                <XStack gap={8}>
                  {['all', 'income', 'expense'].map((f) => (
                    <Button 
                      key={f} 
                      size="$1" 
                      chromeless 
                      paddingHorizontal={8}
                      backgroundColor={filter === f ? 'rgba(46,125,107,0.1)' : 'transparent'}
                      onPress={() => setFilter(f as any)}
                    >
                      <Text fontSize={10} fontWeight="700" color={filter === f ? '#2E7D6B' : '#6B7280'} textTransform="uppercase">{f}</Text>
                    </Button>
                  ))}
                </XStack>
              </XStack>
              <Input 
                size="$2" 
                placeholder="Search description..." 
                value={searchTerm}
                onChangeText={setSearchBar}
                borderRadius={8}
                backgroundColor="#F7F9FB"
                borderWidth={1}
                borderColor="$borderColor"
              />
            </YStack>

            {/* Scrollable Table */}
            <ScrollView flex={1}>
              {filteredTransactions.length > 0 ? (
                <YStack>
                  {filteredTransactions.map((tx, i) => {
                    const isExpanded = expandedTxId === tx.id
                    const isEven = i % 2 === 0
                    return (
                      <YStack key={tx.id} borderBottomWidth={i < filteredTransactions.length - 1 ? 1 : 0} borderColor="$borderColor" backgroundColor={isEven ? '$brandWhite' : '#FAFAFA'}>
                        <XStack paddingHorizontal={16} paddingVertical={10} alignItems="center" gap={12} 
                          cursor="pointer"
                          hoverStyle={{ backgroundColor: 'rgba(46,125,107,0.04)', scale: 1.005 }}
                          onPress={() => setExpandedTxId(isExpanded ? null : tx.id)}
                          animation="quick"
                        >
                          <YStack width={32} height={32} borderRadius={8} backgroundColor={tx.type === 'income' ? 'rgba(46,125,50,0.08)' : 'rgba(211,47,47,0.05)'} alignItems="center" justifyContent="center">
                            {tx.type === 'income' ? <ArrowUpRight size={14} color="#2E7D32" /> : <ArrowDownRight size={14} color="#D32F2F" />}
                          </YStack>
                          <YStack flex={1} gap={0}>
                            <XStack alignItems="center" gap={6}>
                              {/* Visual Anchor: Category Color Dot */}
                              <Circle size={6} backgroundColor={tx.type === 'income' ? '#2E7D32' : ringColors[CATEGORIES.indexOf(tx.category as any) % ringColors.length]} />
                              <Text fontSize={12} fontWeight="500" color="#111827" numberOfLines={1}>{tx.type === 'income' ? tx.source : tx.description}</Text>
                            </XStack>
                            <Text fontSize={10} color="#9CA3AF" fontWeight="400" marginLeft={12}>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                          </YStack>
                          <Text fontSize={13} fontWeight="700" color={tx.type === 'income' ? '#2E7D32' : '#111827'}>
                            {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, summary.currency)}
                          </Text>
                        </XStack>
                        
                        {isExpanded && (
                          <XStack backgroundColor="rgba(247,249,251,0.8)" paddingHorizontal={16} paddingBottom={12} paddingTop={4} gap={12} justifyContent="flex-end" animation="lazy">
                            <YStack flex={1} gap={2} marginLeft={10}>
                               <Text fontSize={9} fontWeight="700" color="#6B7280" textTransform="uppercase">Category</Text>
                               <Text fontSize={11} color="#111827" fontWeight="600" textTransform="capitalize">{tx.category || 'Income'}</Text>
                            </YStack>
                            <XStack gap={8} alignItems="flex-end">
                              <Button size="$1" backgroundColor="$brandWhite" borderWidth={1} borderColor="$borderColor" borderRadius={6} hoverStyle={{ scale: 1.05 }}>
                                <Text fontSize={10} fontWeight="700" color="#6B7280">EDIT</Text>
                              </Button>
                              <Button size="$1" backgroundColor="rgba(211,47,47,0.05)" borderWidth={1} borderColor="rgba(211,47,47,0.1)" borderRadius={6} hoverStyle={{ scale: 1.05 }}>
                                <Text fontSize={10} fontWeight="700" color="#D32F2F">DELETE</Text>
                              </Button>
                            </XStack>
                          </XStack>
                        )}
                      </YStack>
                    )
                  })}
                </YStack>
              ) : (
                <YStack padding={40} alignItems="center">
                  <Text fontSize={12} color="#6B7280">No matches found.</Text>
                </YStack>
              )}
            </ScrollView>
          </YStack>

          {/* Quick Actions */}
          <YStack backgroundColor="$brandWhite" borderRadius={12} padding={20} gap={16} shadowColor="rgba(0,0,0,0.02)" shadowOpacity={1} shadowRadius={8} borderWidth={1} borderColor="$borderColor" height={140}>
            <Text fontSize={13} fontWeight="700" color="#111827" textTransform="uppercase" letterSpacing={0.5}>Quick Actions</Text>
            <XStack gap={10}>
              <Button flex={1.5} size="$3" backgroundColor="#2E7D32" hoverStyle={{ scale: 1.02, backgroundColor: '#256b29' }} pressStyle={{ scale: 0.98 }} borderRadius={8} onPress={() => setShowAddExpense(true)}>
                <Text color="white" fontSize={11} fontWeight="700">+ EXPENSE</Text>
              </Button>
              <Button flex={1} size="$3" backgroundColor="transparent" borderWidth={1} borderColor="$borderColor" hoverStyle={{ scale: 1.02, backgroundColor: '#F7F9FB' }} pressStyle={{ scale: 0.98 }} borderRadius={8} onPress={() => setShowBudgetDrawer(true)}>
                <Text color="#0F3D3E" fontSize={11} fontWeight="700">BUDGET</Text>
              </Button>
              <Button flex={1} size="$3" backgroundColor="transparent" borderWidth={1} borderColor="$borderColor" hoverStyle={{ scale: 1.02, backgroundColor: '#F7F9FB' }} pressStyle={{ scale: 0.98 }} borderRadius={8} onPress={() => setShowAddGoal(true)}>
                <Text color="#0F3D3E" fontSize={11} fontWeight="700">GOAL</Text>
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </XStack>

      {/* ── Primary Recommendation (V7 Assistant Bar) ── */}
      {savingsOpportunity && (
        <XStack 
          backgroundColor="#0F3D3E" 
          padding={20} 
          borderRadius={12} 
          alignItems="center" 
          gap={20} 
          shadowColor="black" 
          shadowOpacity={0.15} 
          shadowRadius={15}
          marginTop={32}
          marginBottom={24}
          cursor="pointer"
          hoverStyle={{ shadowOpacity: 0.3, translateY: -2, shadowRadius: 20 }}
          animation="quick"
        >
          <YStack width={48} height={48} borderRadius={12} backgroundColor="rgba(78,205,196,0.15)" alignItems="center" justifyContent="center">
            <Zap size={24} color="#4ECDC4" fill="#4ECDC4" />
          </YStack>
          <YStack flex={1} gap={2}>
            <Text color="rgba(255,255,255,0.4)" fontSize={11} fontWeight="800" textTransform="uppercase" letterSpacing={1.2}>Financial Assistant</Text>
            <Text color="white" fontSize={16} fontWeight="600" letterSpacing={-0.1}>
              You're overspending on <Text color="#4ECDC4" fontWeight="700" textTransform="capitalize">{savingsOpportunity.category}</Text>. 
              Reduce by <Text color="#4ECDC4" fontWeight="700">{formatCurrency(Math.round(((categoryBreakdown?.find(c => c.category === savingsOpportunity.category)?.amount || 0) * 0.2) / 100) * 100, summary.currency)}</Text>/mo to stay on track.
            </Text>
          </YStack>
          <YStack alignItems="flex-end" gap={4}>
            <Button 
              backgroundColor="#4ECDC4" 
              hoverStyle={{ scale: 1.05, backgroundColor: '#45b8b0', shadowColor: '#4ECDC4', shadowOpacity: 0.4, shadowRadius: 12 }} 
              pressStyle={{ scale: 0.95 }} 
              borderRadius={8} 
              paddingHorizontal={18} 
              height={44} 
              icon={<Zap size={14} color="#0F3D3E" fill="#0F3D3E" />}
              onPress={() => {
                setActiveBudgetCategory(savingsOpportunity.category)
                setShowBudgetDrawer(true)
              }}
            >
              <Text color="#0F3D3E" fontWeight="800" fontSize={13}>APPLY FIX</Text>
            </Button>
            <Text fontSize={9} color="rgba(255,255,255,0.35)" fontWeight="700" textTransform="uppercase" letterSpacing={0.5}>Instant Update</Text>
          </YStack>
        </XStack>
      )}

      {/* ── Insights Row (Full Width Modular Cards) ── */}
      <XStack gap={16} flexWrap="wrap">
        
        {/* Card 1: Market Trend */}
        <YStack flex={1} minWidth={240} backgroundColor="$brandWhite" borderRadius={12} padding={16} gap={10} borderWidth={1} borderColor="$borderColor" cursor="pointer" hoverStyle={{ translateY: -2, shadowOpacity: 0.05 }} animation="quick">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color="#6B7280" textTransform="uppercase" opacity={0.8}>Market Trend</Text>
            <Sparkles size={14} color="#ED6C02" />
          </XStack>
          {budgetRecommendation?.marketIndicators?.[0] ? (
            <YStack gap={4}>
              <Text fontSize={14} color="#111827" fontWeight="500">
                {budgetRecommendation.marketIndicators[0].label.split(' ')[0]} is <Text fontWeight="700">{budgetRecommendation.marketIndicators[0].status === 'up' ? 'rising' : 'falling'}</Text> (<Text fontWeight="700">{budgetRecommendation.marketIndicators[0].value}</Text>)
              </Text>
              <Text fontSize={12} color="#6B7280" lineHeight={16} numberOfLines={2} opacity={0.7}>
                Local shifts detected via {budgetRecommendation.marketIndicators[0].source}.
              </Text>
            </YStack>
          ) : (
            <Text fontSize={12} color="#6B7280">No trend data available.</Text>
          )}
          <Button size="$1" chromeless padding={0} marginTop={4} justifyContent="flex-start" onPress={() => setShowMarketDetail(true)}>
            <Text fontSize={11} fontWeight="700" color="#2E7D6B">View details →</Text>
          </Button>
        </YStack>

        {/* Card 2: Budget Alert (Promoted V7) */}
        <YStack 
          flex={1} minWidth={240} 
          backgroundColor="rgba(237,108,2,0.04)" 
          borderRadius={12} padding={16} gap={10} 
          borderWidth={2} borderColor="rgba(237,108,2,0.15)" 
          cursor="pointer" hoverStyle={{ translateY: -2, shadowOpacity: 0.1, backgroundColor: 'rgba(237,108,2,0.06)' }} 
          animation="quick"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color="#ED6C02" textTransform="uppercase" letterSpacing={0.5}>Critical Alert</Text>
            <AlertTriangle size={14} color={budgetRecommendation?.alerts?.[0]?.type === 'danger' ? '#D32F2F' : '#ED6C02'} />
          </XStack>
          <YStack gap={4}>
            <Text fontSize={14} fontWeight="700" color="#111827" numberOfLines={1}>
              {budgetRecommendation?.alerts?.[0]?.message.includes(':') ? budgetRecommendation.alerts[0].message.split(':')[0] : 'Spending Alert'}
            </Text>
            <Text fontSize={12} color="#6B7280" lineHeight={16} numberOfLines={2} opacity={0.7}>
              {budgetRecommendation?.alerts?.[0]?.message || "All spending within set limits."}
            </Text>
          </YStack>
          <Button size="$1" chromeless padding={0} marginTop={4} justifyContent="flex-start" onPress={() => {
            const problemCat = budgetRecommendation?.alerts?.[0]?.message.split(' ').find(word => ['entertainment', 'food', 'transport', 'personal'].includes(word.toLowerCase()))
            setActiveBudgetCategory(problemCat || null)
            setShowBudgetDrawer(true)
          }}>
            <Text fontSize={11} fontWeight="700" color="#2E7D6B">Adjust budget →</Text>
          </Button>
        </YStack>

        {/* Card 3: Savings Opportunity */}
        <YStack flex={1} minWidth={240} backgroundColor="$brandWhite" borderRadius={12} padding={16} gap={10} borderWidth={1} borderColor="$borderColor" cursor="pointer" hoverStyle={{ translateY: -2, shadowOpacity: 0.05 }} animation="quick" onPress={() => setShowSavingsDetail(true)}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color="#6B7280" textTransform="uppercase" opacity={0.8}>Opportunity</Text>
            <TrendingUp size={14} color="#2E7D32" />
          </XStack>
          <YStack gap={4}>
            <Text fontSize={14} color="#111827" fontWeight="500">Savings Opportunity</Text>
            <Text fontSize={12} color="#6B7280" lineHeight={16} numberOfLines={2} opacity={0.7}>
              {savingsOpportunity ? savingsOpportunity.text : "Maintain current spending to reach goals faster."}
            </Text>
          </YStack>
          <Button size="$1" chromeless padding={0} marginTop={4} justifyContent="flex-start" onPress={() => setShowSavingsDetail(true)}>
            <Text fontSize={11} fontWeight="700" color="#2E7D6B">Learn more →</Text>
          </Button>
        </YStack>

        {/* Card 4: Goal Progress */}
        <YStack flex={1} minWidth={240} backgroundColor="$brandWhite" borderRadius={12} padding={16} gap={10} borderWidth={1} borderColor="$borderColor" cursor="pointer" hoverStyle={{ translateY: -2, shadowOpacity: 0.05 }} animation="quick" onPress={() => onSwitchView('goals')}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color="#6B7280" textTransform="uppercase" opacity={0.8}>Goal Progress</Text>
            <Target size={14} color="#6B7280" />
          </XStack>
          {goals?.[0] ? (
            <YStack gap={8}>
              <YStack gap={2}>
                <Text fontSize={14} fontWeight="700" color="#111827" numberOfLines={1}>{goals[0].name}</Text>
                <Text fontSize={12} color="#6B7280" opacity={0.7}><Text fontWeight="700" color="#2E7D6B">{goals[0].progress.toFixed(0)}%</Text> complete</Text>
              </YStack>
              <YStack height={6} backgroundColor="#F7F9FB" borderRadius={999} overflow="hidden">
                <YStack height="100%" width={`${Math.min(goals[0].progress, 100)}%`} backgroundColor="#2E7D6B" />
              </YStack>
            </YStack>
          ) : (
            <Text fontSize={12} color="#6B7280">No active goals found.</Text>
          )}
          <Button size="$1" chromeless padding={0} marginTop={4} justifyContent="flex-start" onPress={() => onSwitchView('goals')}>
            <Text fontSize={11} fontWeight="700" color="#2E7D6B">View all goals →</Text>
          </Button>
        </YStack>

        {/* Card 5: Habit Coach & Subscriptions */}
        <YStack 
          flex={1} minWidth={240} 
          backgroundColor={habitTrend?.isImproving ? "rgba(46,125,50,0.03)" : "$brandWhite"} 
          borderRadius={12} padding={16} gap={10} 
          borderWidth={1} borderColor={habitTrend?.isImproving ? "rgba(46,125,50,0.15)" : "$borderColor"} 
          cursor="pointer" hoverStyle={{ translateY: -2, shadowOpacity: 0.05 }} 
          animation="quick"
          onPress={() => setShowHabitCoach(true)}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={12} fontWeight="700" color={habitTrend?.isImproving ? "#2E7D32" : "#6B7280"} textTransform="uppercase" opacity={0.8}>Habit Coach</Text>
            <TrendingUp size={14} color={habitTrend?.isImproving ? "#2E7D32" : "#6B7280"} />
          </XStack>
          <YStack gap={4}>
            <Text fontSize={14} fontWeight="700" color="#111827">
              {habitTrend?.isImproving ? "Trophy Unlocked!" : "Track your habits"}
            </Text>
            <Text fontSize={12} color="#6B7280" lineHeight={16} numberOfLines={2}>
              {subscriptions.length > 0 
                ? `Detected ${subscriptions.length} subscriptions totaling ${formatCurrency(subscriptions.reduce((s:any, a:any) => s + a.amount, 0), summary.currency)}/mo.`
                : habitTrend?.message}
            </Text>
          </YStack>
          <Button size="$1" chromeless padding={0} marginTop={4} justifyContent="flex-start">
            <Text fontSize={11} fontWeight="700" color="#2E7D6B">Analyze habits →</Text>
          </Button>
        </YStack>

      </XStack>

      {/* ── Recent Activity (Bottom Row) ── */}
      <YStack backgroundColor="$brandWhite" borderRadius={12} padding={24} gap={16} shadowColor="rgba(0,0,0,0.02)" shadowOpacity={1} shadowRadius={8} borderWidth={1} borderColor="$borderColor">
        <Text fontSize={13} fontWeight="800" color="#6B7280" textTransform="uppercase" letterSpacing={1}>Recent Activity</Text>
        <XStack gap={16} flexWrap="wrap">
          {transactions.slice(0, 4).map(tx => (
            <XStack key={tx.id} flex={1} minWidth={220} backgroundColor="#F7F9FB" padding={16} borderRadius={12} gap={12} alignItems="center" hoverStyle={{ scale: 1.02 }} animation="quick">
              <Circle size={8} backgroundColor={tx.type === 'income' ? '#2E7D32' : '#D32F2F'} />
              <YStack flex={1}>
                <Text fontSize={12} fontWeight="600" color="#111827" numberOfLines={1}>{tx.type === 'income' ? tx.source : tx.description}</Text>
                <Text fontSize={10} color="#6B7280" fontWeight="500">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </YStack>
              <Text fontSize={13} fontWeight="800" color={tx.type === 'income' ? '#2E7D32' : '#111827'}>
                {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, summary.currency)}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>

    </YStack>
    </SafeHydrate>
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
    <SafeHydrate>
      <YStack gap={24}>
      <XStack gap={16} flexWrap="wrap">
        <StatCard label="DTI Ratio" value={`${dti.ratio}%`} sub={dti.status.toUpperCase()} dark Icon={PieChart} />
        <StatCard label="Monthly Income" value={formatCurrency(dti.gross_income, dti.currency)} sub={`${dti.breakdown.income_sources} source(s)`} Icon={TrendingUp} trend="up" />
        <StatCard label="Monthly Debt" value={formatCurrency(dti.total_debt, dti.currency)} sub={`${dti.breakdown.active_loans} active loan(s)`} Icon={Landmark} trend={dti.total_debt > 0 ? 'down' : null} />
      </XStack>

      <XStack gap={16} flexWrap="wrap" alignItems="stretch">
        <YStack flex={1.5} minWidth={320} gap={24}>
          <YStack backgroundColor="$brandWhite" borderRadius={12} padding={24} gap={20} shadowColor="rgba(0,0,0,0.02)" shadowOpacity={1} shadowRadius={8} borderWidth={1} borderColor="$borderColor">
             <Text fontSize={16} fontWeight="600" color="#111827">Health Assessment</Text>
             <YStack gap={12}>
               <XStack justifyContent="space-between" alignItems="center">
                 <Text fontSize={14} color="#6B7280" fontWeight="500">Current Status</Text>
                 <XStack gap={8} alignItems="center">
                   <Circle size={10} backgroundColor={dti.color} />
                   <Text fontSize={14} fontWeight="700" color={dti.color} textTransform="uppercase">{dti.status}</Text>
                 </XStack>
               </XStack>
               <YStack height={8} borderRadius={999} backgroundColor="#F7F9FB" overflow="hidden">
                 <YStack height="100%" width={`${Math.min(dti.ratio, 100)}%`} backgroundColor={dti.color} borderRadius={999} />
               </YStack>
             </YStack>
             <YStack backgroundColor="#F7F9FB" padding={20} borderRadius={10} gap={10}>
               <Text fontSize={14} fontWeight="700" color="#0F3D3E">Recommendation</Text>
               <Text fontSize={13} color="#6B7280" lineHeight={20} fontWeight="500">{dti.recommendation}</Text>
               
               {dti.currency === 'USD' && (
                 <YStack borderTopWidth={1} borderColor="$borderColor" paddingTop={12} gap={4} marginTop={4}>
                   <XStack justifyContent="space-between">
                     <Text fontSize={12} fontWeight="600" color="#6B7280">Front-End DTI (Housing)</Text>
                     <Text fontSize={12} fontWeight="700" color={dti.front_end_ratio > 28 ? '#D32F2F' : '#2E7D32'}>{dti.front_end_ratio}%</Text>
                   </XStack>
                   <Text fontSize={11} color="#6B7280" opacity={0.8}>Standard limit: 28% of gross income</Text>
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
          <YStack backgroundColor="#0F3D3E" borderRadius={12} padding={24} gap={16}>
            <Text fontSize={16} fontWeight="600" color="white">Understanding DTI</Text>
            <Text fontSize={13} color="rgba(255,255,255,0.7)" lineHeight={20} fontWeight="400">
              Your Debt-to-Income (DTI) ratio compares your total monthly debt payments to your gross monthly income.
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.7)" lineHeight={20} fontWeight="400">
              Lenders use this to measure your ability to manage monthly payments and repay debts. A ratio of 36% or less is generally considered healthy.
            </Text>
            <Button size="$3" backgroundColor="rgba(255,255,255,0.1)" borderRadius={8} hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text color="white" fontWeight="600" fontSize={13}>Learn More</Text>
            </Button>
          </YStack>

          <YStack backgroundColor="$brandWhite" borderRadius={12} padding={24} gap={12} borderWidth={1} borderColor="$borderColor">
            <Text fontSize={14} fontWeight="600" color="#111827">Risk Thresholds</Text>
            {[
              { label: 'Healthy', range: '≤ 36%', color: '#2E7D32', bg: 'rgba(46,125,50,0.08)' },
              { label: 'Manageable', range: '37% - 49%', color: '#ED6C02', bg: 'rgba(237,108,2,0.1)' },
              { label: 'High Risk', range: '≥ 50%', color: '#D32F2F', bg: 'rgba(211,47,47,0.08)' },
            ].map((t) => (
              <XStack key={t.label} justifyContent="space-between" alignItems="center" padding={12} borderRadius={8} backgroundColor={t.bg}>
                <Text fontSize={12} fontWeight="600" color={t.color}>{t.label}</Text>
                <Text fontSize={11} fontWeight="700" color={t.color} fontFamily="$mono">{t.range}</Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </XStack>
    </YStack>
    </SafeHydrate>
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

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showBudgetDrawer, setShowBudgetDrawer] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [activeBudgetCategory, setActiveBudgetCategory] = useState<string | null>(null)
  const [showAlerts, setShowAlerts] = useState(false)

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

      {/* Alerts drawer */}
      {showAlerts && (
        <AlertsDrawer 
          currency={dashboard.summary.currency}
          recommendation={dashboard.budgetRecommendation}
          onClose={() => setShowAlerts(false)}
          onAdjustBudget={(cat) => {
            setActiveBudgetCategory(cat)
            setShowAlerts(false)
            setShowBudgetDrawer(true)
          }}
        />
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
      <YStack width={220} backgroundColor="#0F3D3E"
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
            <Text fontSize={10} fontWeight="700" color="rgba(255,255,255,0.4)" textTransform="uppercase"
              letterSpacing={1.5} paddingHorizontal={12} paddingBottom={6}>Menu</Text>
            {NAV.map(({ id, label, Icon }) => (
              <NavItem key={id} label={label} Icon={Icon} active={activeView === id} onClick={() => switchView(id)} />
            ))}
          </YStack>
        </YStack>

        <YStack gap={2}>
          <Text fontSize={10} fontWeight="700" color="rgba(255,255,255,0.4)" textTransform="uppercase"
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
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: 'white',
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
              hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <FileText size={16} color="rgba(255,255,255,0.6)" />
              <Text fontSize={14} color="rgba(255,255,255,0.6)" fontWeight="500">Documents</Text>
            </XStack>
          </button>
          
          <button onClick={() => setShowSettings(true)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
            <XStack alignItems="center" gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={8}
              hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              {/* @ts-ignore */}
              <Settings size={16} color="rgba(255,255,255,0.6)" />
              <Text fontSize={14} color="rgba(255,255,255,0.6)" fontWeight="500">Settings</Text>
            </XStack>
          </button>

          <View height={1} backgroundColor="rgba(255,255,255,0.08)" marginVertical={8} marginHorizontal={4} />

          <form action="/auth/signout" method="post" style={{ margin: 0 }}>

            <button type="submit" style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
              <XStack alignItems="center" gap={10} paddingHorizontal={12} paddingVertical={10} borderRadius={8}
                hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <LogOut size={15} color="rgba(255,255,255,0.5)" />
                <Text fontSize={14} color="rgba(255,255,255,0.5)" fontWeight="500">Log out</Text>
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
              hoverStyle={{ backgroundColor: 'rgba(13,61,62,0.05)' }}
              icon={loading
                ? <Spinner size="small" color="$brandAccent" />
                : <RefreshCw size={15} color="#6b7280" />} />

            <View position="relative" cursor="pointer" onPress={() => setShowAlerts(true)} hoverStyle={{ opacity: 0.7 }} animation="quick">
              <Bell size={18} color="#9ca3af" />
              {(dashboard.budgetRecommendation?.alerts?.length || 0) > 0 && (
                <Circle 
                  size={8} backgroundColor="#D32F2F" 
                  position="absolute" top={-2} right={-2} 
                  borderWidth={1.5} borderColor="white" 
                />
              )}
            </View>

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
        <YStack flex={1} padding={24} backgroundColor="#F7F9FB" style={{ overflowY: 'auto', minHeight: 0 }}>
          {activeView === 'overview' && (
            <OverviewContent
              summary={dashboard.summary}
              transactions={dashboard.recentTransactions}
              dti={dashboard.dti}
              contingency={dashboard.contingency}
              marketTrends={dashboard.marketTrends}
              trend={dashboard.trend}
              categoryBreakdown={dashboard.categoryBreakdown}
              budgetRecommendation={dashboard.budgetRecommendation}
              goals={dashboard.goals}
              subscriptions={dashboard.subscriptions}
              habitTrend={dashboard.habitTrend}
              onRefresh={refresh}
              onSwitchView={switchView}
              showAddExpense={showAddExpense}
              setShowAddExpense={setShowAddExpense}
              showBudgetDrawer={showBudgetDrawer}
              setShowBudgetDrawer={setShowBudgetDrawer}
              showAddGoal={showAddGoal}
              setShowAddGoal={setShowAddGoal}
              activeBudgetCategory={activeBudgetCategory}
              setActiveBudgetCategory={setActiveBudgetCategory}
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
