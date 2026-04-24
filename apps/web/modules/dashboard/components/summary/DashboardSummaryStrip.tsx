'use client'

import React from 'react'
import { YStack, XStack, Text, Circle, View } from 'tamagui'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Landmark, CreditCard } from 'lucide-react-native'
import { formatCurrency } from '@stashflow/core'

interface StatCardProps {
  label: string
  value: string
  sub: string
  dark?: boolean
  Icon: React.ElementType
  trend?: 'up' | 'down' | null
}

export function StatCard({ label, value, sub, dark, Icon, trend }: StatCardProps) {
  return (
    <YStack flex={1} minWidth={160} height={100}
      backgroundColor={dark ? '$brandPrimary' : '$brandWhite'}
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
          <Icon size={16} color={dark ? 'white' : '$brandPrimary'} />
        </YStack>
      </XStack>
      <XStack alignItems="center" gap={4}>
        {trend === 'up'   && <ArrowUpRight size={10} color={dark ? '#22C55E' : '#16A34A'} />}
        {trend === 'down' && <ArrowDownRight size={10} color={dark ? '#ff8a80' : '#DC2626'} />}
        <Text fontSize={11} color={dark ? 'rgba(255,255,255,0.45)' : '$brandTextSub'} numberOfLines={1}>{sub}</Text>
      </XStack>
    </YStack>
  )
}

export function DashboardSummaryStrip({ summary }: { summary: any }) {
  // Restore the Elite V7 High-Contrast Horizontal Row
  return (
    <XStack gap={16} flexWrap="wrap">
      <StatCard 
        label="Net Worth"     
        value={formatCurrency(summary.netWorth, summary.currency)}        
        sub="Total remaining value"    
        dark 
        Icon={Wallet} 
        trend={summary.netWorth >= 0 ? 'up' : 'down'} 
      />
      <StatCard 
        label="Monthly Income" 
        value={formatCurrency(summary.thisMonth.income, summary.currency)} 
        sub="Earnings this month"     
        Icon={TrendingUp}    
        trend="up" 
      />
      <StatCard 
        label="Monthly Exp"    
        value={formatCurrency(summary.thisMonth.expense, summary.currency)} 
        sub={`${summary.thisMonth.growth.toFixed(0)}% vs last month`} 
        Icon={CreditCard} 
        trend={summary.thisMonth.growth > 0 ? 'down' : 'up'} 
      />
      <StatCard 
        label="Remaining Debt" 
        value={formatCurrency(summary.totalLiabilities, summary.currency)} 
        sub="Unpaid loan balance"    
        Icon={Landmark} 
      />
    </XStack>
  )
}
