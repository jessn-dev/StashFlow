'use client'

import { useState } from 'react'
import IncomeForm from '@/components/income/IncomeForm'
import IncomeList from '@/components/income/IncomeList'
import IncomeChart from '@/components/income/IncomeChart'
import MetricsRow, { Metric } from '@/components/ui/MetricsRow'
import InsightsPanel from '@/components/ui/InsightsPanel'
import FormModal from '@/components/ui/FormModal'
import { YStack, XStack, Text, Button } from 'tamagui'
import { Income, formatCurrency } from '@stashflow/core'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native'

interface IncomeUIProps {
  incomes: Income[]
  monthlyTotals: { month: string; total: number }[]
  preferredCurrency: string
  rates: Record<string, number>
}

function computeIncome(
  incomes: Income[],
  preferredCurrency: string
): { metrics: Metric[]; insights: string[] } {
  const total = incomes.reduce((s, i) => s + i.amount, 0)

  const sourceMap: Record<string, number> = {}
  incomes.forEach(i => { sourceMap[i.source] = (sourceMap[i.source] || 0) + i.amount })
  const topSourceEntry = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0]

  const monthSet = new Set(
    incomes.map(i => { const d = new Date(i.date); return `${d.getFullYear()}-${d.getMonth()}` })
  )
  const monthCount = Math.max(1, monthSet.size)
  const avgMonth = total / monthCount

  const now = new Date()
  const cm = now.getMonth(), cy = now.getFullYear()
  const pm = cm === 0 ? 11 : cm - 1
  const py = cm === 0 ? cy - 1 : cy
  const curTotal = incomes
    .filter(i => { const d = new Date(i.date); return d.getMonth() === cm && d.getFullYear() === cy })
    .reduce((s, i) => s + i.amount, 0)
  const prevTotal = incomes
    .filter(i => { const d = new Date(i.date); return d.getMonth() === pm && d.getFullYear() === py })
    .reduce((s, i) => s + i.amount, 0)
  const momChange = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null

  const metrics: Metric[] = [
    { label: 'Total Income', value: formatCurrency(total, preferredCurrency) },
    { label: 'Avg / Month', value: formatCurrency(avgMonth, preferredCurrency) },
    { label: 'Top Source', value: topSourceEntry ? topSourceEntry[0] : '—' },
    momChange !== null
      ? {
          label: 'MoM Change',
          value: `${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%`,
          trendPositive: momChange >= 0,
        }
      : { label: 'Entries', value: String(incomes.length) },
  ]

  const insights: string[] = []
  if (topSourceEntry && total > 0) {
    const pct = ((topSourceEntry[1] / total) * 100).toFixed(0)
    insights.push(`${topSourceEntry[0]} contributes ${pct}% of total income`)
  }
  if (momChange !== null)
    insights.push(`Income ${momChange >= 0 ? 'up' : 'down'} ${Math.abs(momChange).toFixed(1)}% vs last month`)
  const recurringCount = incomes.filter(i => i.frequency !== 'one-time').length
  if (recurringCount > 0)
    insights.push(`${recurringCount} recurring income source${recurringCount !== 1 ? 's' : ''}`)

  return { metrics, insights }
}

export default function IncomeUI({ incomes, monthlyTotals, preferredCurrency, rates }: IncomeUIProps) {
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const pageSize = 10
  const totalPages = Math.ceil(incomes.length / pageSize)
  const paginatedIncomes = incomes.slice((page - 1) * pageSize, page * pageSize)

  const { metrics, insights } = computeIncome(incomes, preferredCurrency)

  return (
    <YStack gap={32} width="100%">
      <FormModal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Log New Income">
        <IncomeForm />
      </FormModal>

      <MetricsRow metrics={metrics} />

      <XStack gap={32} flexWrap="wrap" alignItems="flex-start" width="100%">
        <YStack flex={2.5} minWidth={400} gap={24}>
          <IncomeChart data={monthlyTotals} currency={preferredCurrency} />

          <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
            <XStack paddingHorizontal={24} paddingVertical={16} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
              <Text fontSize={15} fontWeight="700" color="$brandPrimary">Income Sources</Text>
              <Button size="$2" backgroundColor="$brandPrimary" borderRadius={8} paddingHorizontal={14} onPress={() => setFormOpen(true)} icon={<Plus size={14} color="white" />}>
                <Text fontSize={12} fontWeight="700" color="white" letterSpacing={0.5}>Add Income</Text>
              </Button>
            </XStack>
            <IncomeList incomes={paginatedIncomes} preferredCurrency={preferredCurrency} rates={rates} />
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
          <InsightsPanel title="Income Insights" insights={insights} />
          <YStack backgroundColor="$brandPrimary" padding={24} borderRadius={12} gap={12}>
            <Text fontSize={16} fontWeight="700" color="$brandWhite">Income Tracking</Text>
            <Text fontSize={13} fontFamily="$mono" color="$brandWhite" opacity={0.8} lineHeight={20}>
              Tracking all sources of income provides a more accurate picture of your DTI ratio.
            </Text>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  )
}
