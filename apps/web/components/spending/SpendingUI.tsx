'use client'

import { useState } from 'react'
import ExpenseForm from '@/components/spending/ExpenseForm'
import ExpenseList from '@/components/spending/ExpenseList'
import CategoryBreakdown from '@/components/spending/CategoryBreakdown'
import SpendingChart from '@/components/spending/SpendingChart'
import MetricsRow, { Metric } from '@/components/ui/MetricsRow'
import InsightsPanel from '@/components/ui/InsightsPanel'
import FormModal from '@/components/ui/FormModal'
import { YStack, XStack, Text, Button } from 'tamagui'
import { Expense, formatCurrency } from '@stashflow/core'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'

interface SpendingUIProps {
  expenses: Expense[]
  breakdown: { category: string; amount: number }[]
  monthlyTotals: { month: string; total: number }[]
  preferredCurrency: string
  rates: Record<string, number>
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function computeSpending(
  expenses: Expense[],
  breakdown: { category: string; amount: number }[],
  preferredCurrency: string
): { metrics: Metric[]; insights: string[] } {
  const total = breakdown.reduce((s, b) => s + b.amount, 0)
  const sorted = [...breakdown].sort((a, b) => b.amount - a.amount)
  const topCat = sorted[0]
  const topCatPct = topCat && total > 0 ? ((topCat.amount / total) * 100).toFixed(0) : '0'

  const dates = expenses.map(e => new Date(e.date).getTime())
  const daySpan = dates.length > 1
    ? (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)
    : 7
  const avgWeek = total / Math.max(1, daySpan / 7)

  const now = new Date()
  const cm = now.getMonth(), cy = now.getFullYear()
  const pm = cm === 0 ? 11 : cm - 1
  const py = cm === 0 ? cy - 1 : cy
  const curTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === cm && d.getFullYear() === cy })
    .reduce((s, e) => s + e.amount, 0)
  const prevTotal = expenses
    .filter(e => { const d = new Date(e.date); return d.getMonth() === pm && d.getFullYear() === py })
    .reduce((s, e) => s + e.amount, 0)

  const diff = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0
  
  return {
    metrics: [
      { label: 'Total Spending', value: formatCurrency(total, preferredCurrency) },
      { label: 'Avg / Week',     value: formatCurrency(avgWeek, preferredCurrency) },
      { label: 'Top Category',   value: topCat ? cap(topCat.category) : 'None', sub: topCat ? `${topCatPct}% of total` : '' },
      { 
        label: 'MoM Change',     
        value: diff === 0 ? String(expenses.length) : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`,
        sub: diff === 0 ? 'transactions' : 'vs last month',
        trend: diff > 0 ? 'down' : diff < 0 ? 'up' : null
      }
    ],
    insights: [
      topCat ? `Your biggest expense is ${cap(topCat.category)}, making up ${topCatPct}% of your spending.` : 'No spending data available.',
      diff > 0 ? `Spending is up ${diff.toFixed(1)}% compared to last month.` : diff < 0 ? `Great job! You've spent ${Math.abs(diff).toFixed(1)}% less than last month.` : 'Your spending is stable this month.',
      `You have spending recorded in ${breakdown.length} different categories.`
    ]
  }
}

export default function SpendingUI({ expenses, breakdown, monthlyTotals, preferredCurrency, rates }: SpendingUIProps) {
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const pageSize = 10

  const { metrics, insights } = computeSpending(expenses, breakdown, preferredCurrency)

  const filteredExpenses = activeCategory 
    ? expenses.filter(e => e.category === activeCategory)
    : expenses

  const totalPages = Math.ceil(filteredExpenses.length / pageSize)
  const paginatedExpenses = filteredExpenses.slice((page - 1) * pageSize, page * pageSize)

  return (
    <YStack gap={32} width="100%">
      <FormModal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Log New Expense">
        <ExpenseForm />
      </FormModal>

      <MetricsRow metrics={metrics} />

      <XStack gap={32} flexWrap="wrap-reverse" alignItems="flex-start" alignSelf="flex-start" width="100%">
        <YStack flex={2.5} minWidth={400} gap={24}>
          <SpendingChart data={monthlyTotals} currency={preferredCurrency} />

          <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
            <XStack paddingHorizontal={24} paddingVertical={16} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={12}>
                <Text fontSize={15} fontWeight="700" color="$brandPrimary">Spending History</Text>
                {activeCategory && (
                  <Button size="$1" backgroundColor="$brandBg" paddingHorizontal={8} onPress={() => setActiveCategory(null)}>
                    <Text fontSize={10} fontWeight="700" color="$brandPrimary">{activeCategory.toUpperCase()} ×</Text>
                  </Button>
                )}
              </XStack>
              <Button size="$2" backgroundColor="$brandPrimary" borderRadius={8} paddingHorizontal={14} onPress={() => setFormOpen(true)} icon={<Plus size={14} color="white" />}>
                <Text fontSize={12} fontWeight="700" color="white" letterSpacing={0.5}>Add Expense</Text>
              </Button>
            </XStack>
            <ExpenseList expenses={paginatedExpenses} preferredCurrency={preferredCurrency} rates={rates} />
            {totalPages > 1 && (
              <XStack padding={16} justifyContent="center" alignItems="center" gap={20} borderTopWidth={1} borderColor="rgba(13,61,61,0.05)">
                <Button size="$2" circular disabled={page === 1} onPress={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />} />
                <Text fontSize={13} color="$brandTextSub">Page {page} of {totalPages}</Text>
                <Button size="$2" circular disabled={page === totalPages} onPress={() => setPage(p => p + 1)} icon={<ChevronRight size={16} />} />
              </XStack>
            )}
          </YStack>
        </YStack>

        <YStack flex={1} minWidth={320} gap={24}>
          <InsightsPanel title="Spending Insights" insights={insights} />
          <CategoryBreakdown data={breakdown} activeCategory={activeCategory} onSelect={(cat) => { setActiveCategory(cat); setPage(1); }} />
          <YStack backgroundColor="$brandPrimary" padding={24} borderRadius={12} gap={12}>
            <Text fontSize={16} fontWeight="700" color="$brandWhite">Spending Advice</Text>
            <Text fontSize={13} fontFamily="$mono" color="$brandWhite" opacity={0.8} lineHeight={20}>
              Detailed categorization leads to better financial clarity and easier budgeting.
            </Text>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  )
}
