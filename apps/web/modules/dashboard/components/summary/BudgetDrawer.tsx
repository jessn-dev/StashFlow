'use client'

import React, { useState } from 'react'
import { YStack, XStack, Text, Button, Circle, ScrollView, Spinner, Theme, View, Label, Input } from 'tamagui'
import { Sparkles, X, ChevronRight, AlertTriangle, Zap, Target } from 'lucide-react-native'
import { formatCurrency } from '@stashflow/core'

interface BudgetDrawerProps {
  isOpen: boolean
  onClose: () => void
  recommendation: any
  currency: string
}

export function BudgetDrawer({ isOpen, onClose, recommendation, currency }: BudgetDrawerProps) {
  if (!isOpen) return null

  return (
    <YStack 
      position="absolute" right={0} top={0} bottom={0} width={420} 
      backgroundColor="white" zIndex={1000} shadowColor="black" shadowOpacity={0.2} shadowRadius={30}
    >
      <XStack padding={24} justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="#F3F4F6">
        <YStack gap={4}>
          <XStack alignItems="center" gap={8}>
            <Sparkles size={18} color="#ED6C02" />
            <Text fontSize={18} fontWeight="800" color="#111827">Smart Budget</Text>
          </XStack>
          <Text fontSize={12} color="#6B7280">AI-optimized for your regional economy</Text>
        </YStack>
        <Button circular size="$3" chromeless icon={<X size={20} />} onPress={onClose} />
      </XStack>

      <ScrollView flex={1} padding={24}>
        <YStack gap={24}>
          {/* AI Rationale */}
          <YStack backgroundColor="rgba(237,108,2,0.04)" padding={20} borderRadius={16} gap={12} borderWidth={1} borderColor="rgba(237,108,2,0.1)">
            <Text fontSize={14} color="#B45309" fontWeight="600" lineHeight={22}>
              {recommendation?.rationale}
            </Text>
          </YStack>

          {/* Allocation List */}
          <YStack gap={16}>
            <Text fontSize={12} fontWeight="800" color="#6B7280" textTransform="uppercase" letterSpacing={1}>Recommended Allocations</Text>
            {Object.entries(recommendation?.allocations || {}).map(([cat, amt]: any) => (
              <XStack key={cat} justifyContent="space-between" alignItems="center">
                <XStack gap={12} alignItems="center">
                  <Circle size={8} backgroundColor="#0D3D3D" />
                  <Text fontSize={14} fontWeight="600" textTransform="capitalize" color="#111827">{cat}</Text>
                </XStack>
                <Text fontSize={14} fontWeight="700" color="#111827">{formatCurrency(amt, currency)}</Text>
              </XStack>
            ))}
          </YStack>

          {/* Strategy Alerts */}
          <YStack gap={12}>
             {recommendation?.alerts?.map((alert: any, i: number) => (
               <XStack key={i} backgroundColor={alert.type === 'danger' ? '#FEF2F2' : '#FFFBEB'} padding={16} borderRadius={12} gap={12}>
                 {alert.type === 'danger' ? <AlertTriangle size={18} color="#DC2626" /> : <Zap size={18} color="#D97706" />}
                 <Text fontSize={13} color={alert.type === 'danger' ? '#991B1B' : '#92400E'} flex={1} fontWeight="500">
                   {alert.message}
                 </Text>
               </XStack>
             ))}
          </YStack>
        </YStack>
      </ScrollView>

      <YStack padding={24} borderTopWidth={1} borderColor="#F3F4F6">
        <Button size="$5" backgroundColor="#0D3D3D" borderRadius={12} onPress={onClose}>
          <Text color="white" fontWeight="700">Apply Recommendations</Text>
        </Button>
      </YStack>
    </YStack>
  )
}
