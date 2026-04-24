'use client'

import { useState, useEffect } from 'react'
import {
  formatCurrency, Transaction,
  Income, Expense, Loan, LoanPayment,
  DashboardPayload, BudgetPeriod
} from '@stashflow/core'
import { createClient } from '@/utils/supabase/client'
import { XStack, YStack, Text, Button, Circle, View, Spinner, Theme, ScrollView, Input, Label, Heading, Separator } from 'tamagui'
import {
  LayoutDashboard, TrendingUp, CreditCard, Landmark,
  Settings, LogOut, Bell, DollarSign, Wallet,
  ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw,
  PieChart, Trash2, Target, FileText, Plus,
  X, Sun, Moon, Sparkles, AlertTriangle, Zap,
  LayoutGrid, UserCircle, Info, Film, Home,
  UtensilsCrossed, Car, Heart, GraduationCap,
  CalendarDays, Monitor, ChevronDown, Search,
} from 'lucide-react-native'

import { 
  DashboardSummaryStrip, 
  CashFlowChart, 
  MarketIntelCard 
} from '@/modules/dashboard'

import IncomeForm from '@/components/income/IncomeForm'
import ExpenseForm from '@/components/spending/ExpenseForm'
import GoalForm from '@/components/goals/GoalForm'
import LoanForm from '@/components/loans/LoanForm'
import DTISimulator from '@/components/dti/DTISimulator'
import BudgetsUI from '@/app/dashboard/budgets/BudgetsUI'
import CashFlowUI from '@/app/dashboard/cash-flow/CashFlowUI'
import GoalsUI from '@/app/dashboard/goals/GoalsUI'
import IncomeUI from '@/app/dashboard/income/IncomeUI'
import SpendingUI from '@/app/dashboard/spending/SpendingUI'
import LoansUI from '@/app/dashboard/loans/LoansUI'
import SettingsUI from '@/app/dashboard/settings/SettingsUI'
import DocumentsModal from '@/components/documents/DocumentsModal'
import OnboardingWizard from '@/modules/onboarding/components/OnboardingWizard'
import FormModal from '@/components/ui/FormModal'

type ActiveView = 'overview' | 'income' | 'spending' | 'loans' | 'dti' | 'budgets' | 'cash-flow' | 'goals'

interface DashboardUIProps {
  payload: DashboardPayload
  userEmail: string | undefined
}

function useIsMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

export default function DashboardUI({ payload, userEmail }: DashboardUIProps) {
  const isMounted = useIsMounted()
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [dashboard, setDashboard] = useState<DashboardPayload>(payload)
  const [loading, setLoading] = useState(false)

  // Budget States
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([])
  const [adjustedBudgets, setAdjustedBudgets] = useState<Record<string, number>>({})
  const [totalBudgeted, setTotalBudgeted] = useState(0)
  const [freeToSpend, setFreeToSpend] = useState(0)
  const [focusCategory, setFocusCategory] = useState<string | null>(null)
  const [cashFlow, setCashFlow] = useState<any>(null)

  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddIncome, setShowAddIncome] = useState(false)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [showBudgetDrawer, setShowBudgetDrawer] = useState(false)
  const [showHabitCoach, setShowHabitCoach] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // Initialize budget state from dashboard payload
    const sb = createClient()
    sb.from('budget_periods').select('*').eq('period', new Date().toISOString().slice(0, 7))
      .then(({ data }) => {
        if (data) {
          setBudgetPeriods(data)
          const adj: Record<string, number> = {}
          let total = 0
          data.forEach((p: BudgetPeriod) => {
            adj[p.category] = p.budgeted
            total += p.budgeted
          })
          setAdjustedBudgets(adj)
          setTotalBudgeted(total)
          setFreeToSpend((dashboard.dti.gross_income - dashboard.dti.total_debt) - total)
        }
      })

    // Fetch cash flow for the tab
    sb.functions.invoke('get-cash-flow').then(({ data }) => {
      if (data) setCashFlow(data)
    })
  }, [dashboard])

  const handleSliderChange = (cat: string, val: number) => {
    setAdjustedBudgets(prev => {
      const next = { ...prev, [cat]: val }
      const newTotal = Object.values(next).reduce((a, b) => a + b, 0)
      setTotalBudgeted(newTotal)
      setFreeToSpend((dashboard.dti.gross_income - dashboard.dti.total_debt) - newTotal)
      return next
    })
  }

  const handleApplyBudget = async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const period = new Date().toISOString().slice(0, 7)
      const updates = Object.entries(adjustedBudgets).map(([category, budgeted]) => ({
        user_id: user.id,
        period,
        category: category as any,
        budgeted,
        spent: budgetPeriods.find(p => p.category === category)?.spent || 0
      }))

      const { error } = await sb.from('budget_periods').upsert(updates, { onConflict: 'user_id,period,category' })
      if (!error) {
        setShowBudgetDrawer(false)
        refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data, error } = await sb.functions.invoke('get-dashboard')
      if (!error) setDashboard(data)
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) return null

  const initials = (userEmail?.[0] ?? 'U').toUpperCase()
  const username = userEmail?.split('@')[0] ?? 'User'

  return (
    <Theme name="light">
      {dashboard.isNewUser && (
        <div
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(10px)' 
          }}
        >
          <OnboardingWizard onComplete={refresh} userEmail={userEmail} />
        </div>
      )}

      <XStack height="100vh" backgroundColor="#F0F2F5" position="relative" overflow="hidden">
        
        {/* ══ SIDEBAR (Elite V7 Style) ════════════════════════════════════════ */}
        <YStack
          width={240}
          backgroundColor="$brandPrimary"
          paddingTop={28}
          paddingHorizontal={14}
          paddingBottom={20}
          justifyContent="space-between"
          style={{ height: '100vh', overflowY: 'auto', flexShrink: 0 }}
        >
          <YStack gap={28}>
            {/* Logo */}
            <XStack alignItems="center" gap={10} paddingHorizontal={8} marginBottom={4}>
              <YStack
                width={32} height={32} borderRadius={8} backgroundColor="$brandAccent"
                alignItems="center" justifyContent="center"
              >
                <DollarSign size={16} color="white" />
              </YStack>
              <Text fontSize={18} fontWeight="800" color="white" letterSpacing={0.3}>StashFlow</Text>
            </XStack>

            {/* Navigation */}
            <YStack gap={2}>
              <NavItem active={activeView === 'overview'} Icon={LayoutDashboard} label="Overview" onClick={() => setActiveView('overview')} />
              <NavItem active={activeView === 'spending'} Icon={CreditCard} label="Spending" onClick={() => setActiveView('spending')} />
              <NavItem active={activeView === 'income'} Icon={TrendingUp} label="Income" onClick={() => setActiveView('income')} />
              <NavItem active={activeView === 'loans'} Icon={Landmark} label="Loans & Debt" onClick={() => setActiveView('loans')} />
              <NavItem active={activeView === 'budgets'} Icon={PieChart} label="Budgets" onClick={() => setActiveView('budgets')} />
              <NavItem active={activeView === 'goals'} Icon={Target} label="Goals" onClick={() => setActiveView('goals')} />
              <NavItem active={activeView === 'cash-flow'} Icon={TrendingUp} label="Cash Flow" onClick={() => setActiveView('cash-flow')} />
              <NavItem active={activeView === 'dti'} Icon={PieChart} label="DTI Ratio" onClick={() => setActiveView('dti')} />
            </YStack>
          </YStack>

          {/* User & Settings */}
          <YStack gap={2}>
            <NavItem active={false} Icon={FileText} label="Documents" onClick={() => setShowDocuments(true)} />
            <NavItem active={false} Icon={Settings} label="Settings" onClick={() => setShowSettings(true)} />
            
            <View height={1} backgroundColor="rgba(255,255,255,0.08)" marginVertical={10} marginHorizontal={4} />

            <XStack alignItems="center" gap={10} paddingHorizontal={10} paddingVertical={6}>
              <Circle size={32} backgroundColor="$brandAccent">
                <Text fontSize={13} fontWeight="700" color="white">{initials}</Text>
              </Circle>
              <YStack flex={1} overflow="hidden">
                <Text fontSize={13} fontWeight="600" color="rgba(255,255,255,0.9)" numberOfLines={1}>{username}</Text>
                <Text fontSize={10} color="rgba(255,255,255,0.35)" numberOfLines={1}>{userEmail}</Text>
              </YStack>
            </XStack>

            <Button 
              marginTop={8} size="$3" backgroundColor="transparent" 
              hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              onPress={() => {}}
            >
              <XStack alignItems="center" gap={10} width="100%">
                <LogOut size={15} color="rgba(255,255,255,0.45)" />
                <Text fontSize={14} color="rgba(255,255,255,0.45)">Sign Out</Text>
              </XStack>
            </Button>
          </YStack>
        </YStack>

        {/* Main Content */}
        <YStack flex={1} style={{ overflowY: 'auto' }}>
          {/* Header */}
          <XStack padding={24} justifyContent="space-between" alignItems="center" backgroundColor="white" borderBottomWidth={1} borderColor="$borderColor">
            <YStack gap={2}>
              <Text fontSize={22} fontWeight="700" color="$brandText" letterSpacing={-0.3}>
                {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </Text>
              <Text fontSize={13} color="$brandTextSub">Welcome back, {username}</Text>
            </YStack>
            <XStack gap={16} alignItems="center">
              <Button circular size="$3" chromeless icon={loading ? <Spinner /> : <RefreshCw size={16} />} onPress={refresh} />
              <Button circular size="$3" chromeless icon={<Bell size={18} />} />
              <Button 
                backgroundColor="$brandPrimary" borderRadius={9} size="$4"
                icon={<Plus size={15} color="white" />}
                onPress={() => setShowAddExpense(true)}
                hoverStyle={{ backgroundColor: '$brandAccent' }}
              >
                <Text color="white" fontWeight="600">New Entry</Text>
              </Button>
            </XStack>
          </XStack>

          <YStack padding={32} gap={24}>
            {activeView === 'overview' && (
              <OverviewContent 
                dashboard={dashboard} 
                refresh={refresh} 
                onSwitchView={setActiveView}
                onOpenBudget={() => setShowBudgetDrawer(true)}
                onAddExpense={() => setShowAddExpense(true)}
                onAddGoal={() => setShowAddGoal(true)}
                onAddIncome={() => setShowAddIncome(true)}
                onAddLoan={() => setShowAddLoan(true)}
                onOpenHabitCoach={() => setShowHabitCoach(true)}
              />
            )}
            {activeView === 'spending' && (
              <SpendingUI 
                expenses={[]} 
                breakdown={dashboard.categoryBreakdown}
                preferredCurrency={dashboard.summary.currency}
                rates={{}}
              />
            )}
            {activeView === 'income' && (
              <IncomeUI 
                incomes={[]}
                preferredCurrency={dashboard.summary.currency}
                rates={{}}
              />
            )}
            {activeView === 'loans' && (
               <LoansUI 
                 loans={[]} 
                 totalActiveDebt={dashboard.summary.totalLiabilities}
                 preferredCurrency={dashboard.summary.currency}
                 rates={{}}
               />
            )}
            {activeView === 'goals' && (
               <GoalsUI 
                 goals={dashboard.goals as any}
                 userEmail={userEmail || ''}
                 onRefresh={refresh}
               />
            )}
            {activeView === 'budgets' && (
               <BudgetsUI 
                 periods={budgetPeriods}
                 profile={{ preferred_currency: dashboard.summary.currency } as any}
                 userEmail={userEmail || ''}
                 onEnable={refresh}
               />
            )}
            {activeView === 'cash-flow' && (
               cashFlow ? <CashFlowUI payload={cashFlow} userEmail={userEmail || ''} /> : <Spinner />
            )}
            {activeView === 'dti' && (
               <DtiContent dti={dashboard.dti} />
            )}
          </YStack>
        </YStack>

        {/* Interactive Budget Drawer */}
        {showBudgetDrawer && (
          <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)"
            zIndex={1000} justifyContent="flex-end" style={{ backdropFilter: 'blur(4px)' }}>
            <YStack backgroundColor="white" height="100%" width="100%" maxWidth={440} shadowColor="black" shadowOpacity={0.2} shadowRadius={30}>
              <XStack padding={24} justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="#F3F4F6">
                <YStack gap={4}>
                  <XStack alignItems="center" gap={8}>
                    <Sparkles size={18} color="#ED6C02" />
                    <Text fontSize={18} fontWeight="800" color="#111827">Smart Budget</Text>
                  </XStack>
                  <Text fontSize={12} color="#6B7280">AI-optimized for your regional economy</Text>
                </YStack>
                <Button circular size="$3" chromeless icon={<X size={20} />} onPress={() => setShowBudgetDrawer(false)} />
              </XStack>

              <ScrollView flex={1} padding={24}>
                <YStack gap={24}>
                  {/* Budget Summary */}
                  <XStack gap={12}>
                    <YStack flex={1} backgroundColor={freeToSpend < 0 ? '#FEF2F2' : '#F0FDF4'} padding={16} borderRadius={12} gap={4}>
                      <Text fontSize={10} fontWeight="700" color={freeToSpend < 0 ? '#991B1B' : '#166534'} textTransform="uppercase">Safe to Spend</Text>
                      <Text fontSize={18} fontWeight="800" color={freeToSpend < 0 ? '#991B1B' : '#166534'}>{formatCurrency(freeToSpend, dashboard.summary.currency)}</Text>
                    </YStack>
                    <YStack flex={1} backgroundColor="#F8FAFC" padding={16} borderRadius={12} gap={4}>
                      <Text fontSize={10} fontWeight="700" color="#475569" textTransform="uppercase">Total Budgeted</Text>
                      <Text fontSize={18} fontWeight="800" color="#1e293b">{formatCurrency(totalBudgeted, dashboard.summary.currency)}</Text>
                    </YStack>
                  </XStack>

                  <YStack backgroundColor="rgba(237,108,2,0.04)" padding={20} borderRadius={16} gap={12} borderWidth={1} borderColor="rgba(237,108,2,0.1)">
                    <XStack gap={8} alignItems="center">
                      <Zap size={14} color="#ED6C02" />
                      <Text fontSize={12} fontWeight="800" color="#ED6C02" textTransform="uppercase">AI Strategy: {dashboard.budgetRecommendation?.macroRationale}</Text>
                    </XStack>
                    <Text fontSize={13} color="#B45309" fontWeight="600" lineHeight={20}>
                      {dashboard.budgetRecommendation?.rationale}
                    </Text>
                    <Separator borderColor="rgba(237,108,2,0.1)" />
                    <Text fontSize={12} color="#B45309" fontWeight="500" fontStyle="italic">
                      {dashboard.budgetRecommendation?.userAnalysis.advice}
                    </Text>
                  </YStack>

                  <YStack gap={16}>
                    <Text fontSize={12} fontWeight="800" color="#6B7280" textTransform="uppercase" letterSpacing={1}>Adjust Categories</Text>
                    {CATEGORIES.map(cat => {
                      const period = budgetPeriods.find(p => p.category === cat)
                      const isProblem = focusCategory === cat
                      return (
                        <BudgetPriorityCard
                          key={cat}
                          currency={dashboard.summary.currency}
                          budget={{
                            category: cat,
                            budgeted: period?.budgeted || 0,
                            spent: period?.spent || 0
                          }}
                          adjustedAmount={(adjustedBudgets as any)[cat] || 0}
                          suggestedAmount={(dashboard.budgetRecommendation?.allocations as any)?.[cat]}
                          isProblem={isProblem}
                          onSliderChange={(val: number) => handleSliderChange(cat, val)}
                        />
                      )
                    })}
                  </YStack>
                </YStack>
              </ScrollView>

              <YStack padding={24} borderTopWidth={1} borderColor="#F3F4F6" gap={12}>
                <XStack justifyContent="space-between" alignItems="center">
                   <Text fontSize={12} color="#6B7280">Total Disposable:</Text>
                   <Text fontSize={14} fontWeight="700" color="#111827">{formatCurrency(dashboard.dti.gross_income - dashboard.dti.total_debt, dashboard.summary.currency)}</Text>
                </XStack>
                <Button 
                  size="$5" 
                  backgroundColor="#0D3D3D" 
                  borderRadius={12}
                  onPress={handleApplyBudget}
                  disabled={loading}
                >
                  {loading ? <Spinner color="white" /> : <Text color="white" fontWeight="700">SAVE NEW BUDGET</Text>}
                </Button>
              </YStack>
            </YStack>
          </View>
        )}
      </XStack>

      {showHabitCoach && (
        <HabitCoachDrawer 
          isOpen={showHabitCoach} 
          onClose={() => setShowHabitCoach(false)} 
          habitTrend={dashboard.habitTrend}
        />
      )}

      {showDocuments && <DocumentsModal onClose={() => setShowDocuments(false)} />}

      <FormModal 
        isOpen={showAddExpense} 
        onClose={() => setShowAddExpense(false)} 
        title="Add Expense"
      >
        <ExpenseForm onSuccess={() => { setShowAddExpense(false); refresh(); }} />
      </FormModal>

      <FormModal 
        isOpen={showAddGoal} 
        onClose={() => setShowAddGoal(false)} 
        title="Create New Financial Goal"
      >
        <GoalForm onSuccess={() => { setShowAddGoal(false); refresh(); }} />
      </FormModal>

      <FormModal 
        isOpen={showAddIncome} 
        onClose={() => setShowAddIncome(false)} 
        title="Add Income Source"
      >
        <IncomeForm onSuccess={() => { setShowAddIncome(false); refresh(); }} />
      </FormModal>

      <FormModal 
        isOpen={showAddLoan} 
        onClose={() => setShowAddLoan(false)} 
        title="Add Loan/Liability"
      >
        <LoanForm onSuccess={() => { setShowAddLoan(false); refresh(); }} />
      </FormModal>

      <FormModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Account Settings"
      >
        <SettingsUI 
          profile={{
            id: '',
            email: userEmail || '',
            full_name: username,
            preferred_currency: dashboard.summary.currency,
            budgeting_enabled: (dashboard.dti as any).budgeting_enabled || false,
            global_rollover_enabled: false,
            rollover_start_month: null,
            contingency_mode_active: false,
            created_at: ''
          } as any}
          userEmail={userEmail || ''}
        />
      </FormModal>
    </Theme>
  )
}

// ─── Shared constants ────────────────────────────────────────────────────────
const CATEGORIES = ['housing', 'food', 'transport', 'utilities', 'healthcare', 'entertainment', 'education', 'personal', 'other'] as const

const DONUT_COLORS = ['#1A7A7A', '#0D3D3D', '#4ECDC4', '#ff8a80', '#EAB308', '#8B5CF6']

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

// ─── RingChart ────────────────────────────────────────────────────────────────
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

// ─── StatCard ─────────────────────────────────────────────────────────────────
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
      hoverStyle={{ translateY: -2, shadowOpacity: 0.08, shadowRadius: 15 }}>
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
      <XStack alignItems="center" gap={4}>
        {trend === 'up'   && <ArrowUpRight   size={10} color={dark ? '#2E7D6B' : '#2E7D32'} />}
        {trend === 'down' && <ArrowDownRight size={10} color={dark ? '#ff8a80' : '#D32F2F'} />}
        <Text fontSize={11} color={dark ? 'rgba(255,255,255,0.45)' : '$brandTextSub'} numberOfLines={1}>{sub}</Text>
      </XStack>
    </YStack>
  )
}

// ─── MultiSegmentDonut ────────────────────────────────────────────────────────
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
      {segments.map((s, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={sw}
          strokeDasharray={`${s.len} ${circ}`}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      {segments.map((s, i) => s.pct >= 0.07 && (
        <text
          key={`lbl-${i}`} x={s.lx} y={s.ly}
          textAnchor="middle" dominantBaseline="central"
          fontSize="11" fontWeight="700"
          fill={s.color === '#0D3D3D' ? 'white' : '#111827'}
        >
          {Math.round(s.pct * 100)}%
        </text>
      ))}
    </svg>
  )
}

// ─── InfoTooltip ──────────────────────────────────────────────────────────────
function InfoTooltip({ content }: { content: string }) {
  const [visible, setVisible] = useState(false)
  return (
    // @ts-ignore
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

// ─── Alerts Drawer ────────────────────────────────────────────────────────────
function AlertsDrawer({
  onClose,
  onAdjustBudget,
  recommendation,
  currency
}: {
  onClose: () => void
  onAdjustBudget: (category: string | null) => void
  recommendation?: any
  currency: string
}) {
  const alerts = recommendation?.alerts || []
  const hasAlerts = alerts.length > 0

  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)"
      zIndex={1000} justifyContent="flex-end" style={{ backdropFilter: 'blur(4px)' }}>
      <YStack backgroundColor="$brandWhite" height="100%" width="100%" maxWidth={400} padding={24} gap={24}
        shadowColor="black" shadowOpacity={0.2} shadowRadius={20}>
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
                const isDanger  = alert.type === 'danger'
                const isWarning = alert.type === 'warning'
                const problemCat = alert.message.split(' ').find((word: string) =>
                  CATEGORIES.includes(word.toLowerCase() as any)
                )
                return (
                  <YStack key={i}
                    backgroundColor={isDanger ? 'rgba(211,47,47,0.03)' : isWarning ? 'rgba(237,108,2,0.03)' : '#F7F9FB'}
                    borderRadius={12} padding={16} gap={10}
                    borderWidth={1} borderColor={isDanger ? 'rgba(211,47,47,0.1)' : isWarning ? 'rgba(237,108,2,0.1)' : '$borderColor'}>
                    <XStack gap={10} alignItems="flex-start">
                      <AlertTriangle size={16} color={isDanger || isWarning ? (isDanger ? '#D32F2F' : '#ED6C02') : '#1A7A7A'} style={{ marginTop: 2 }} />
                      <YStack flex={1} gap={2}>
                        <Text fontSize={13} fontWeight="700" color="#111827">{alert.message}</Text>
                        <Text fontSize={12} color="#6B7280" lineHeight={18}>
                          {isDanger ? 'Critical issue detected. Action recommended immediately.' : 'AI analysis suggests a potential budget optimization.'}
                        </Text>
                      </YStack>
                    </XStack>
                    <Button size="$2"
                      backgroundColor={isDanger ? '#D32F2F' : isWarning ? '#ED6C02' : '#0F3D3E'}
                      borderRadius={6} alignSelf="flex-end"
                      onPress={() => onAdjustBudget(problemCat || null)}>
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

// ─── BudgetPriorityCard ───────────────────────────────────────────────────────
function BudgetPriorityCard({ budget, adjustedAmount, onSliderChange, currency, isProblem, suggestedAmount }: any) {
  const percent = Math.min((budget.spent / (adjustedAmount || 1)) * 100, 100)
  const isOver  = budget.spent > adjustedAmount

  return (
    <YStack padding={16} borderRadius={12}
      backgroundColor={isProblem ? 'rgba(211,47,47,0.03)' : '#F7F9FB'}
      borderWidth={1} borderColor={isProblem ? 'rgba(211,47,47,0.1)' : '$borderColor'}
      gap={12}>
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
          <Text fontSize={11} fontWeight="600" color={isOver ? '#D32F2F' : '#6B7280'}>
            {isOver ? `Over by ${formatCurrency(budget.spent - adjustedAmount, currency)}` : `${percent.toFixed(0)}% used`}
          </Text>
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
          <Text fontSize={9} color="#9CA3AF" fontWeight="600">
            {formatCurrency(Math.max(budget.budgeted * 2, budget.spent * 1.2, 1000), currency)}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  )
}

// ─── Habit Coach Drawer ───────────────────────────────────────────────────────
function HabitCoachDrawer({ isOpen, onClose, habitTrend }: { isOpen: boolean; onClose: () => void; habitTrend?: any }) {
  if (!isOpen) return null
  return (
    <View position="fixed" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.4)"
      zIndex={1000} justifyContent="flex-end" style={{ backdropFilter: 'blur(4px)' }}>
      <YStack backgroundColor="white" height="100%" width="100%" maxWidth={400} padding={24} gap={32} shadowColor="black" shadowOpacity={0.2} shadowRadius={30}>
        <XStack justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="#F3F4F6" paddingBottom={20}>
          <XStack gap={10} alignItems="center">
            <Sparkles size={20} color="#1A7A7A" />
            <Text fontSize={18} fontWeight="700" color="#111827">Habit Coach</Text>
          </XStack>
          <Button size="$2" chromeless padding={0} onPress={onClose} icon={<X size={20} color="#6B7280" />} />
        </XStack>

        <YStack alignItems="center" gap={16} padding={20} backgroundColor="#F8FAFC" borderRadius={16}>
          <Text fontSize={12} fontWeight="700" color="#64748B" textTransform="uppercase">BEHAVIORAL SCORE</Text>
          <Text fontSize={48} fontWeight="900" color="#1A7A7A">{habitTrend?.score || 85}</Text>
          <XStack backgroundColor={habitTrend?.isImproving ? '#DCFCE7' : '#FEE2E2'} paddingHorizontal={12} paddingVertical={4} borderRadius={20} gap={6} alignItems="center">
             {habitTrend?.isImproving ? <TrendingUp size={12} color="#166534" /> : <TrendingUp size={12} color="#991B1B" style={{ transform: [{ rotate: '180deg' }] }} />}
             <Text fontSize={12} fontWeight="700" color={habitTrend?.isImproving ? '#166534' : '#991B1B'}>
               {habitTrend?.isImproving ? 'Improving' : 'Declining'}
             </Text>
          </XStack>
        </YStack>

        <YStack gap={16}>
          <Text fontSize={14} fontWeight="700" color="#111827">AI Behavioral Insight</Text>
          <Text fontSize={14} color="#475569" lineHeight={22}>
            {habitTrend?.message || "You've stayed 15% below your discretionary budget for 3 weeks. This behavior projects a $400 increase in your end-of-year savings."}
          </Text>
        </YStack>

        <YStack gap={12} marginTop="auto">
           <Text fontSize={12} fontWeight="700" color="#64748B" textTransform="uppercase">Next Step</Text>
           <YStack backgroundColor="#F0F9FF" padding={16} borderRadius={12} borderWidth={1} borderColor="#BAE6FD">
              <Text fontSize={13} color="#0369A1" fontWeight="600">
                Move $200 of this surplus to your 'Emergency Fund' goal to maximize compounding.
              </Text>
           </YStack>
        </YStack>
<Button size="$5" backgroundColor="#0D3D3D" borderRadius={12} onPress={onClose}>
  <Text color="white" fontWeight="700">CLOSE COACH</Text>
</Button>
</YStack>
</View>
)
}

// ─── DTI Content ──────────────────────────────────────────────────────────────
function DtiContent({ dti }: { dti: any }) {
return (
<YStack gap={32}>
<XStack gap={24} flexWrap="wrap">
<YStack flex={1} minWidth={300} backgroundColor="white" padding={28} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={20}>
   <Text fontSize={18} fontWeight="700" color="#111827">Debt-to-Income Analysis</Text>
   <YStack gap={12}>
      <XStack justifyContent="space-between">
         <Text color="#64748B">Gross Monthly Income</Text>
         <Text fontWeight="700" color="#111827">{formatCurrency(dti.gross_income, dti.currency)}</Text>
      </XStack>
      <XStack justifyContent="space-between">
         <Text color="#64748B">Total Monthly Debt</Text>
         <Text fontWeight="700" color="#111827">{formatCurrency(dti.total_debt, dti.currency)}</Text>
      </XStack>
      <Separator />
      <XStack justifyContent="space-between" alignItems="center">
         <Text fontWeight="600" color="#111827">Current DTI Ratio</Text>
         <Text fontSize={24} fontWeight="800" color={dti.color}>{dti.ratio}%</Text>
      </XStack>
   </YStack>
   <YStack backgroundColor={dti.status === 'low' ? '#F0FDF4' : '#FFFBEB'} padding={16} borderRadius={12} borderWidth={1} borderColor={dti.status === 'low' ? '#DCFCE7' : '#FEF3C7'}>
      <Text fontSize={13} color={dti.status === 'low' ? '#166534' : '#92400E'} fontWeight="500">{dti.recommendation}</Text>
   </YStack>
</YStack>

<YStack flex={1.5} minWidth={400}>
   <DTISimulator 
     currentMonthlyIncome={dti.gross_income}
     currentMonthlyDebt={dti.total_debt}
     currency={dti.currency}
   />
</YStack>
</XStack>
</YStack>
)
}

function OverviewContent({ 
  dashboard, refresh, onSwitchView, onOpenBudget, 
  onAddExpense, onAddGoal, onAddIncome, onAddLoan, onOpenHabitCoach 
}: any) {
  const [viewType, setViewType] = useState<'actual' | 'projected'>('actual')
  const [projections, setProjections] = useState<any[]>([])
  const [loadingProjections, setLoadingProjections] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all')

  useEffect(() => {
    if (viewType === 'projected' && projections.length === 0) {
      async function load() {
        setLoadingProjections(true)
        const sb = createClient()
        const { data } = await sb.functions.invoke('get-cash-flow')
        if (data) setProjections(data.projections)
        setLoadingProjections(false)
      }
      load()
    }
  }, [viewType])

  const filteredTxs = dashboard.recentTransactions.filter((tx: any) => {
    const matchesSearch = (tx.description || tx.source || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = txFilter === 'all' || tx.type === txFilter
    return matchesSearch && matchesFilter
  })

  return (
    <YStack gap={32}>
      {/* 1. Stat Cards Strip */}
      <XStack gap={16} flexWrap="wrap">
        <StatCard 
          label="NET WORTH" 
          value={formatCurrency(dashboard.summary.netWorth, dashboard.summary.currency)} 
          sub="Combined Assets & Liabilities"
          Icon={Wallet}
          dark
        />
        <StatCard 
          label="MONTHLY INCOME" 
          value={formatCurrency(dashboard.dti.gross_income, dashboard.summary.currency)} 
          sub={`${dashboard.dti.breakdown.income_sources} sources active`}
          Icon={TrendingUp}
          trend="up"
        />
        <StatCard 
          label="TOTAL DEBT" 
          value={formatCurrency(dashboard.summary.totalLiabilities, dashboard.summary.currency)} 
          sub={`${dashboard.dti.breakdown.active_loans} active liabilities`}
          Icon={Landmark}
          trend="down"
        />
        <StatCard 
          label="DTI RATIO" 
          value={`${dashboard.dti.ratio}%`} 
          sub={dashboard.dti.status === 'low' ? 'Healthy Range' : 'Caution Zone'}
          Icon={PieChart}
        />
      </XStack>

      {/* 2. Main Analytics & Transactions */}
      <XStack gap={24} flexWrap="wrap" alignItems="stretch">
        <YStack flex={2} minWidth={450} gap={32}>
          {/* Cash Flow Chart */}
          <YStack backgroundColor="$brandWhite" padding={28} borderRadius={16} borderWidth={1} borderColor="$borderColor" shadowColor="rgba(0,0,0,0.04)" shadowOpacity={1} shadowRadius={20}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
              <YStack gap={4}>
                <Text fontSize={16} fontWeight="700" color="#111827">Cash Flow Trend</Text>
                <Text fontSize={12} color="#6B7280">Actual vs. Projected Momentum</Text>
              </YStack>
              <XStack backgroundColor="#F1F5F9" borderRadius={8} padding={4} gap={4}>
                <Button 
                  size="$2" 
                  backgroundColor={viewType === 'actual' ? 'white' : 'transparent'} 
                  shadowColor={viewType === 'actual' ? 'rgba(0,0,0,0.05)' : 'transparent'}
                  onPress={() => setViewType('actual')}
                >
                  <Text fontSize={11} fontWeight="700" color={viewType === 'actual' ? '#111827' : '#64748B'}>ACTUAL</Text>
                </Button>
                <Button 
                  size="$2" 
                  backgroundColor={viewType === 'projected' ? 'white' : 'transparent'}
                  onPress={() => setViewType('projected')}
                >
                  <Text fontSize={11} fontWeight="700" color={viewType === 'projected' ? '#111827' : '#64748B'}>PROJECTED</Text>
                </Button>
              </XStack>
            </XStack>

            <View height={260} width="100%">
               <CashFlowChart 
                 actualData={dashboard.trend}
                 projectedData={projections}
                 currency={dashboard.summary.currency}
                 viewType={viewType}
                 onViewTypeChange={setViewType}
                 loading={loadingProjections}
               />
            </View>

            <XStack marginTop={24} paddingTop={20} borderTopWidth={1} borderColor="#F1F5F9" justifyContent="space-between" alignItems="center">
               <XStack gap={20}>
                  <XStack gap={8} alignItems="center">
                     <View width={12} height={3} backgroundColor="#1A7A7A" borderRadius={2} />
                     <Text fontSize={11} fontWeight="600" color="#64748B">Income</Text>
                  </XStack>
                  <XStack gap={8} alignItems="center">
                     <View width={12} height={3} backgroundColor="#DC2626" borderRadius={2} style={{ borderStyle: 'dashed', borderWidth: 1 }} />
                     <Text fontSize={11} fontWeight="600" color="#64748B">Expenses</Text>
                  </XStack>
               </XStack>
               <XStack gap={6} alignItems="center">
                  <Sparkles size={12} color="#ED6C02" />
                  <Text fontSize={11} fontWeight="700" color="#B45309">
                    {dashboard.summary.thisMonth.growth >= 0 ? '+' : ''}{dashboard.summary.thisMonth.growth.toFixed(1)}% Mom Growth
                  </Text>
               </XStack>
            </XStack>
          </YStack>

          {/* Spending Breakdown */}
          <XStack backgroundColor="white" padding={28} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={32} alignItems="center">
             <YStack flex={1} alignItems="center" justifyContent="center">
                <MultiSegmentDonut 
                  categories={dashboard.categoryBreakdown} 
                  total={dashboard.summary.thisMonth.expense} 
                  currency={dashboard.summary.currency} 
                />
             </YStack>
             <YStack flex={1.2} gap={20}>
                <YStack gap={4}>
                  <Text fontSize={16} fontWeight="700" color="#111827">Spending Breakdown</Text>
                  <Text fontSize={12} color="#6B7280">Top categories this period</Text>
                </YStack>
                <YStack gap={10}>
                  {dashboard.categoryBreakdown.slice(0, 4).map((cat: any, i: number) => (
                    <YStack key={cat.category} gap={4}>
                       <XStack justifyContent="space-between" alignItems="center">
                          <XStack gap={8} alignItems="center">
                             <View width={8} height={8} borderRadius={2} backgroundColor={DONUT_COLORS[i]} />
                             <Text fontSize={13} fontWeight="600" color="#334155" textTransform="capitalize">{cat.category}</Text>
                          </XStack>
                          <Text fontSize={13} fontWeight="700" color="#1e293b">{formatCurrency(cat.amount, dashboard.summary.currency)}</Text>
                       </XStack>
                       <View height={4} backgroundColor="#F1F5F9" borderRadius={2} overflow="hidden">
                          <View 
                            height="100%" 
                            backgroundColor={DONUT_COLORS[i]} 
                            width={`${(cat.amount / (dashboard.summary.thisMonth.expense || 1)) * 100}%`} 
                          />
                       </View>
                    </YStack>
                  ))}
                </YStack>
                <Button 
                  marginTop={8} size="$3" chromeless 
                  iconAfter={<ChevronRight size={14} />} 
                  onPress={() => onSwitchView('spending')}
                >
                  <Text fontSize={12} fontWeight="700" color="#1A7A7A">VIEW ALL CATEGORIES</Text>
                </Button>
             </YStack>
          </XStack>

          {/* AI Recommendation Bar */}
          <XStack backgroundColor="#111827" padding={20} borderRadius={16} justifyContent="space-between" alignItems="center" shadowColor="rgba(0,0,0,0.15)" shadowOpacity={1} shadowRadius={20}>
             <XStack gap={16} alignItems="center" flex={1}>
                <YStack width={44} height={44} borderRadius={12} backgroundColor="rgba(255,255,255,0.08)" alignItems="center" justifyContent="center">
                   <Sparkles size={20} color="#FBBF24" />
                </YStack>
                <YStack gap={2}>
                   <Text fontSize={11} fontWeight="800" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing={1}>Recommended Action</Text>
                   <Text fontSize={14} fontWeight="600" color="white" numberOfLines={1}>
                     {dashboard.budgetRecommendation?.rationale.slice(0, 65)}...
                   </Text>
                </YStack>
             </XStack>
             <Button backgroundColor="#FBBF24" borderRadius={8} height={40} paddingHorizontal={20} onPress={onOpenBudget}>
                <Text fontSize={13} fontWeight="800" color="#111827">APPLY FIX</Text>
             </Button>
          </XStack>

          {/* 3. AI Insights Row */}
          <XStack gap={16} flexWrap="wrap">
             {/* Market Intel */}
             <YStack flex={1} minWidth={200} backgroundColor="white" padding={20} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={12}>
                <XStack justifyContent="space-between">
                   <Text fontSize={10} fontWeight="800" color="#64748B" textTransform="uppercase">Market Intel</Text>
                   <TrendingUp size={14} color="#1A7A7A" />
                </XStack>
                <Text fontSize={13} fontWeight="700" color="#111827">Inflation Alert: Utilities ↑4.2%</Text>
                <Text fontSize={12} color="#6B7280" lineHeight={18}>Current rates in {dashboard.summary.currency} regions indicate rising service costs.</Text>
             </YStack>

             {/* Budget Alert */}
             <YStack flex={1} minWidth={200} backgroundColor="white" padding={20} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={12}>
                <XStack justifyContent="space-between">
                   <Text fontSize={10} fontWeight="800" color="#64748B" textTransform="uppercase">Budget Alert</Text>
                   <AlertTriangle size={14} color="#DC2626" />
                </XStack>
                <Text fontSize={13} fontWeight="700" color="#111827">Food budget at 85%</Text>
                <Text fontSize={12} color="#6B7280" lineHeight={18}>You have {formatCurrency(150, dashboard.summary.currency)} remaining for the next 8 days.</Text>
             </YStack>

             {/* Goal Progress */}
             <YStack flex={1} minWidth={200} backgroundColor="white" padding={20} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={12}>
                <XStack justifyContent="space-between">
                   <Text fontSize={10} fontWeight="800" color="#64748B" textTransform="uppercase">Goal Progress</Text>
                   <Target size={14} color="#8B5CF6" />
                </XStack>
                <YStack gap={4}>
                  <Text fontSize={13} fontWeight="700" color="#111827">Emergency Fund</Text>
                  <XStack gap={8} alignItems="center">
                     <View flex={1} height={4} backgroundColor="#F1F5F9" borderRadius={2} overflow="hidden">
                        <View width="65%" height="100%" backgroundColor="#8B5CF6" />
                     </View>
                     <Text fontSize={11} fontWeight="700" color="#8B5CF6">65%</Text>
                  </XStack>
                </YStack>
             </YStack>

             {/* Habit Coach */}
             <YStack 
               flex={1} minWidth={200} backgroundColor="#F0F9FF" padding={20} borderRadius={16} 
               borderWidth={1} borderColor="#BAE6FD" gap={12} cursor="pointer"
               hoverStyle={{ backgroundColor: '#E0F2FE' }}
               onPress={onOpenHabitCoach}
             >
                <XStack justifyContent="space-between">
                   <Text fontSize={10} fontWeight="800" color="#0369A1" textTransform="uppercase">Habit Coach</Text>
                   <Sparkles size={14} color="#0369A1" />
                </XStack>
                <Text fontSize={13} fontWeight="700" color="#0369A1">Consistent Saver Badge</Text>
                <Text fontSize={12} color="#0369A1" opacity={0.8} lineHeight={18}>View your behavioral score and AI coaching insights →</Text>
             </YStack>
          </XStack>
        </YStack>

        {/* 4. Right Panel: Transactions & Controls */}
        <YStack flex={1} minWidth={340} gap={24}>
           <YStack backgroundColor="white" borderRadius={20} borderWidth={1} borderColor="$borderColor" shadowColor="rgba(0,0,0,0.06)" shadowOpacity={1} shadowRadius={20} overflow="hidden" height="100%">
              {/* Transactions Header */}
              <YStack padding={24} gap={20} borderBottomWidth={1} borderColor="#F1F5F9">
                 <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={16} fontWeight="700" color="#111827">Transactions</Text>
                    <Button size="$2" circular chromeless icon={<RefreshCw size={14} color="#64748B" />} onPress={refresh} />
                 </XStack>

                 {/* Search & Filter */}
                 <YStack gap={12}>
                    <XStack alignItems="center" backgroundColor="#F8FAFC" borderRadius={10} paddingHorizontal={12} height={40} borderWidth={1} borderColor="#E2E8F0">
                       <Search size={14} color="#94A3B8" />
                       <Input 
                         flex={1} borderWidth={0} backgroundColor="transparent" fontSize={13} 
                         placeholder="Search history..." 
                         value={searchQuery}
                         onChangeText={setSearchQuery}
                       />
                    </XStack>
                    <XStack backgroundColor="#F1F5F9" borderRadius={8} padding={3} gap={2}>
                       {(['all', 'income', 'expense'] as const).map(f => (
                         <Button 
                           key={f} flex={1} size="$2" 
                           backgroundColor={txFilter === f ? 'white' : 'transparent'}
                           shadowColor={txFilter === f ? 'rgba(0,0,0,0.05)' : 'transparent'}
                           onPress={() => setTxFilter(f)}
                         >
                            <Text fontSize={10} fontWeight="700" color={txFilter === f ? '#111827' : '#64748B'} textTransform="uppercase">{f}</Text>
                         </Button>
                       ))}
                    </XStack>
                 </YStack>
              </YStack>

              {/* Transactions List */}
              <ScrollView flex={1}>
                 <YStack gap={0}>
                    {filteredTxs.length === 0 ? (
                      <YStack padding={40} alignItems="center" gap={12}>
                         <Circle size={48} backgroundColor="#F8FAFC" alignItems="center" justifyContent="center">
                            <Search size={20} color="#CBD5E1" />
                         </Circle>
                         <Text fontSize={13} color="#94A3B8">No matching entries</Text>
                      </YStack>
                    ) : (
                      filteredTxs.map((tx: any, idx: number) => (
                        <XStack 
                          key={tx.id} justifyContent="space-between" alignItems="center" 
                          paddingHorizontal={24} paddingVertical={16} 
                          backgroundColor={idx % 2 === 0 ? 'transparent' : 'rgba(248,250,252,0.5)'}
                          borderBottomWidth={1} borderColor="rgba(0,0,0,0.03)"
                          hoverStyle={{ backgroundColor: 'rgba(241,245,249,0.5)' }}
                          cursor="pointer"
                        >
                          <XStack gap={14} alignItems="center">
                             <Circle size={36} backgroundColor={tx.type === 'income' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'}>
                                {tx.type === 'income' ? <ArrowUpRight size={16} color="#16A34A" /> : <ArrowDownRight size={16} color="#DC2626" />}
                             </Circle>
                             <YStack gap={2}>
                                <Text fontSize={13} fontWeight="600" color="#1E293B" numberOfLines={1}>{tx.description || tx.source}</Text>
                                <XStack gap={6} alignItems="center">
                                   <Text fontSize={11} color="#94A3B8">{tx.date}</Text>
                                   <View width={3} height={3} borderRadius={2} backgroundColor="#CBD5E1" />
                                   <Text fontSize={11} color="#94A3B8" textTransform="capitalize">{tx.category || 'Income'}</Text>
                                </XStack>
                             </YStack>
                          </XStack>
                          <Text fontSize={14} fontWeight="700" color={tx.type === 'income' ? '#16A34A' : '#1E293B'}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, dashboard.summary.currency)}
                          </Text>
                        </XStack>
                      ))
                    )}
                 </YStack>
              </ScrollView>

              {/* Quick Actions Footer */}
              <YStack padding={20} borderTopWidth={1} borderColor="#F1F5F9" gap={12} backgroundColor="rgba(248,250,252,0.5)">
                 <Text fontSize={11} fontWeight="800" color="#64748B" textTransform="uppercase" letterSpacing={0.5}>Quick Actions</Text>
                 <XStack gap={10} flexWrap="wrap">
                    <Button flex={1} size="$3" backgroundColor="white" borderWidth={1} borderColor="#E2E8F0" onPress={onAddExpense} icon={<Plus size={14} color="#1A7A7A" />}>
                       <Text fontSize={12} fontWeight="700" color="#1E293B">EXPENSE</Text>
                    </Button>
                    <Button flex={1} size="$3" backgroundColor="white" borderWidth={1} borderColor="#E2E8F0" onPress={onAddIncome} icon={<Plus size={14} color="#16A34A" />}>
                       <Text fontSize={12} fontWeight="700" color="#1E293B">INCOME</Text>
                    </Button>
                    <Button flex={1} size="$3" backgroundColor="white" borderWidth={1} borderColor="#E2E8F0" onPress={onAddGoal} icon={<Target size={14} color="#8B5CF6" />}>
                       <Text fontSize={12} fontWeight="700" color="#1E293B">GOAL</Text>
                    </Button>
                    <Button flex={1} size="$3" backgroundColor="white" borderWidth={1} borderColor="#E2E8F0" onPress={onAddLoan} icon={<Landmark size={14} color="#64748B" />}>
                       <Text fontSize={12} fontWeight="700" color="#1E293B">LOAN</Text>
                    </Button>
                 </XStack>
              </YStack>
           </YStack>
        </YStack>
      </XStack>

      {/* 5. Recent Activity Row */}
      <YStack backgroundColor="white" padding={28} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={20}>
         <XStack justifyContent="space-between" alignItems="center">
            <YStack gap={4}>
              <Text fontSize={16} fontWeight="700" color="#111827">Recent System Activity</Text>
              <Text fontSize={12} color="#6B7280">Background tasks and agentic processes</Text>
            </YStack>
            <Button size="$2" chromeless iconAfter={<ChevronRight size={14} />}>
               <Text fontSize={12} fontWeight="700" color="#1A7A7A">VIEW AUDIT LOG</Text>
            </Button>
         </XStack>
         <YStack gap={12}>
            {[
              { label: 'AI Budget Optimized', time: '2 hours ago', icon: Sparkles, color: '#ED6C02' },
              { label: 'Regional Rates Updated', time: '5 hours ago', icon: RefreshCw, color: '#1A7A7A' },
              { label: 'Monthly Report Generated', time: '1 day ago', icon: FileText, color: '#64748B' }
            ].map((log, i) => (
              <XStack key={i} gap={16} alignItems="center">
                 <Circle size={32} backgroundColor="rgba(0,0,0,0.03)">
                    {/* @ts-ignore */}
                    <log.icon size={14} color={log.color} />
                 </Circle>
                 <YStack gap={2}>
                    <Text fontSize={13} fontWeight="600" color="#1E293B">{log.label}</Text>
                    <Text fontSize={11} color="#94A3B8">{log.time}</Text>
                 </YStack>
              </XStack>
            ))}
         </YStack>
      </YStack>
    </YStack>
  )
}
