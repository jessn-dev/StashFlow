'use client'

import React, { useState } from 'react'
import { YStack, XStack, Text, Button, Circle, Spinner } from 'tamagui'
import { Zap } from 'lucide-react-native'
import { formatCurrency } from '@stashflow/core'

// ─── Private Helpers (Internal to Module) ───────────────────────────────────

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2
    d += ` C ${cp.toFixed(1)} ${pts[i - 1].y.toFixed(1)} ${cp.toFixed(1)} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
  }
  return d
}

function compactCurrency(v: number, currency: string): string {
  const sym = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${sym}${Math.round(v / 1_000)}K`
  return `${sym}${v}`
}

// ─── Component ─────────────────────────────────────────────────────────────

interface CashFlowChartProps {
  actualData: any[]
  projectedData: any[]
  currency: string
  viewType: 'actual' | 'projected'
  onViewTypeChange: (type: 'actual' | 'projected') => void
  loading?: boolean
}

export function CashFlowChart({ 
  actualData, 
  projectedData, 
  currency, 
  viewType, 
  onViewTypeChange,
  loading 
}: CashFlowChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const activeTrend = viewType === 'actual' ? actualData : projectedData
  const isProjected = viewType === 'projected'

  if (loading) {
    return <YStack height={240} alignItems="center" justifyContent="center"><Spinner size="large" color="$brandPrimary" /></YStack>
  }

  const n = activeTrend.length
  if (n < 2) return <YStack height={240} alignItems="center" justifyContent="center"><Text color="$brandTextSub">Insufficient data</Text></YStack>
  
  const max = Math.max(...activeTrend.flatMap(t => [t.income, t.expense]), 1000) * 1.15
  const width = 600
  const height = 220
  const padding = { top: 10, right: 10, bottom: 20, left: 40 }
  const cw = width - padding.left - padding.right
  const ch = height - padding.top - padding.bottom
  const baseline = height - padding.bottom

  const xAt = (i: number) => padding.left + (i / (n - 1)) * cw
  const yAt = (v: number) => padding.top + ch - (v / max) * ch

  const incPts = activeTrend.map((t, i) => ({ x: xAt(i), y: yAt(t.income) }))
  const expPts = activeTrend.map((t, i) => ({ x: xAt(i), y: yAt(t.expense) }))

  const incPath = smoothPath(incPts)
  const expPath = smoothPath(expPts)

  const incAreaPath = [incPath, `L ${incPts[n-1].x.toFixed(1)} ${baseline}`, `L ${incPts[0].x.toFixed(1)} ${baseline}`, 'Z'].join(' ')
  const expAreaPath = [expPath, `L ${expPts[n-1].x.toFixed(1)} ${baseline}`, `L ${expPts[0].x.toFixed(1)} ${baseline}`, 'Z'].join(' ')

  return (
    <YStack gap={16}>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack gap={4}>
          <XStack alignItems="center" gap={8}>
            <Text fontSize={16} fontWeight="700" color="$brandText">Cash Flow</Text>
            {isProjected && (
              <XStack backgroundColor="rgba(78,205,196,0.1)" paddingHorizontal={8} paddingVertical={2} borderRadius={4} gap={4} alignItems="center">
                <Zap size={10} color="$brandSecondary" />
                <Text fontSize={10} fontWeight="700" color="$brandSecondary">92% Confidence</Text>
              </XStack>
            )}
          </XStack>
        </YStack>
        
        <XStack gap={8} backgroundColor="$brandBg" padding={4} borderRadius={8}>
          {(['actual', 'projected'] as const).map(type => (
            <Button 
              key={type}
              size="$1" 
              backgroundColor={viewType === type ? '$brandWhite' : 'transparent'} 
              onPress={() => onViewTypeChange(type)}
            >
              <Text fontSize={11} fontWeight="700" color={viewType === type ? '$brandText' : '$brandTextSub'}>{type.toUpperCase()}</Text>
            </Button>
          ))}
        </XStack>
      </XStack>

      <div style={{ height: 240, position: 'relative' }} onMouseLeave={() => setHoveredIndex(null)}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22C55E" stopOpacity={isProjected ? "0.12" : "0.22"} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#EF4444" stopOpacity={isProjected ? "0.08" : "0.18"} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          
          <path d={incAreaPath} fill="url(#incomeGrad)" />
          <path d={expAreaPath} fill="url(#expenseGrad)" />

          <path d={expPath} fill="none" stroke="#EF4444" strokeWidth={3} strokeDasharray={isProjected ? "6,4" : "0"} strokeLinejoin="round" />
          <path d={incPath} fill="none" stroke="#22C55E" strokeWidth={2.5} strokeDasharray={isProjected ? "8,6" : "6,4"} strokeLinejoin="round" />

          {activeTrend.map((t, i) => (
            <g key={i}>
              <rect 
                x={i === 0 ? padding.left - 10 : xAt(i) - (cw / (n-1) / 2)} 
                y="0" 
                width={cw / (n-1)} 
                height={height} 
                fill="transparent" 
                onMouseEnter={() => setHoveredIndex(i)}
              />
              <circle cx={xAt(i)} cy={yAt(t.income)} r={hoveredIndex === i ? 5 : 3} fill="white" stroke="#22C55E" strokeWidth={2} />
              <circle cx={xAt(i)} cy={yAt(t.expense)} r={hoveredIndex === i ? 6 : 4} fill="white" stroke="#EF4444" strokeWidth={2} />
            </g>
          ))}
        </svg>

        {hoveredIndex !== null && (
          <YStack 
            position="absolute" 
            top={-20} 
            left={xAt(hoveredIndex) > width / 2 ? xAt(hoveredIndex) - 220 : xAt(hoveredIndex) + 20}
            backgroundColor="$brandText" 
            padding={16} 
            borderRadius={12} 
            gap={10} 
            zIndex={100}
            minWidth={200}
          >
            <XStack justifyContent="space-between">
              <Text fontSize={11} fontWeight="800" color="rgba(255,255,255,0.4)" textTransform="uppercase">{activeTrend[hoveredIndex].month}</Text>
            </XStack>
            <YStack gap={4}>
              <Text color="white" fontSize={12}>Income: {formatCurrency(activeTrend[hoveredIndex].income, currency)}</Text>
              <Text color="white" fontSize={12}>Expense: {formatCurrency(activeTrend[hoveredIndex].expense, currency)}</Text>
            </YStack>
          </YStack>
        )}
      </div>
    </YStack>
  )
}
