'use client'

import { useState } from 'react'
import GoalForm from '@/components/goals/GoalForm'
import GoalList from '@/components/goals/GoalList'
import { YStack, XStack, Text, Button } from 'tamagui'
import { Goal } from '@stashflow/core'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

interface GoalsUIProps {
  goals: Goal[]
  userEmail: string
  onRefresh?: () => void
}

export default function GoalsUI({ goals, userEmail, onRefresh }: GoalsUIProps) {
  const [page, setPage] = useState(1)
  const pageSize = 10
  const totalPages = Math.ceil(goals.length / pageSize)
  const paginatedGoals = goals.slice((page - 1) * pageSize, page * pageSize)

  return (
    <XStack gap={32} flexWrap="wrap-reverse" alignItems="flex-start">
      <YStack flex={2} minWidth={400} gap={24}>
        <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
          <XStack padding={24} borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
            <Text fontSize={15} fontWeight="700" color="$brandPrimary">Active Targets</Text>
            <Text fontSize={12} color="$brandTextSub" fontWeight="600">{goals.length} Goals</Text>
          </XStack>
          
          <GoalList goals={paginatedGoals} onRefresh={onRefresh} />

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
        <YStack backgroundColor="$brandPrimary" padding={24} borderRadius={12} gap={12}>
          <Text fontSize={16} fontWeight="700" color="$brandWhite">Goal Setting</Text>
          <Text fontSize={13} fontFamily="$mono" color="$brandWhite" opacity={0.7} lineHeight={20}>
            Your targets are integrated into your monthly budgets. Prioritize your future alongside daily spending.
          </Text>
        </YStack>

        <GoalForm onSuccess={onRefresh} />
      </YStack>
    </XStack>
  )
}
