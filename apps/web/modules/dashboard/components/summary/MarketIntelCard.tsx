'use client'

import React from 'react'
import { YStack, XStack, Text, Button, Circle, View } from 'tamagui'
import { Sparkles, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react-native'

interface MarketTrend {
  name: string
  inflationRate: number
  status: 'up' | 'down' | 'stable'
  category?: string | null
  source?: string
}

export function MarketIntelCard({ trends, onRefresh }: { trends: MarketTrend[], onRefresh?: () => void }) {
  const primaryTrend = trends?.[0]

  return (
    <YStack backgroundColor="$brandWhite" padding={20} borderRadius={16} borderWidth={1} borderColor="$borderColor" gap={16} flex={1} minWidth={300}>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap={8} alignItems="center">
          <Sparkles size={16} color="#ED6C02" />
          <Text fontSize={13} fontWeight="800" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Market Intelligence</Text>
        </XStack>
        <Button circular size="$2" chromeless icon={<RefreshCw size={14} color="$brandTextSub" />} onPress={onRefresh} />
      </XStack>

      {primaryTrend ? (
        <YStack gap={12}>
          <XStack justifyContent="space-between" alignItems="flex-end">
             <YStack gap={4}>
                <Text fontSize={14} fontWeight="700" color="$brandText">{primaryTrend.name}</Text>
                <XStack gap={6} alignItems="center">
                   <View backgroundColor={primaryTrend.status === 'up' ? '#FEF2F2' : '#F0FDF4'} paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                      <Text fontSize={10} fontWeight="800" color={primaryTrend.status === 'up' ? '#DC2626' : '#16A34A'}>
                        {primaryTrend.status === 'up' ? 'RISING' : 'STABLE'}
                      </Text>
                   </View>
                   <Text fontSize={12} color="$brandTextSub">{primaryTrend.inflationRate}% YoY</Text>
                </XStack>
             </YStack>
             <YStack alignItems="flex-end">
                {primaryTrend.status === 'up' ? <TrendingUp size={24} color="#DC2626" /> : <TrendingDown size={24} color="#16A34A" />}
             </YStack>
          </XStack>

          <Text fontSize={12} color="$brandTextSub" lineHeight={18}>
            Regional shifts detected via FRED API. High volatility in {primaryTrend.category || 'essential'} sectors may impact your budget.
          </Text>
        </YStack>
      ) : (
        <YStack padding={20} alignItems="center" justifyContent="center">
          <Text fontSize={12} color="$brandTextSub">No active market signals</Text>
        </YStack>
      )}
    </YStack>
  )
}
