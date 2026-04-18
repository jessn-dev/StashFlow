'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Goal, formatCurrency } from '@stashflow/core'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { Trash2, PiggyBank, CreditCard, Calendar, Target } from 'lucide-react-native'
import { removeGoalAction } from '@/app/dashboard/goals/actions'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

interface GoalListProps {
  goals: Goal[]
}

export default function GoalList({ goals }: GoalListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmingDeleteId) return
    setDeletingId(confirmingDeleteId)
    await removeGoalAction(confirmingDeleteId)
    setDeletingId(null)
    setConfirmingDeleteId(null)
    router.refresh()
  }

  if (goals.length === 0) {
    return (
      <YStack padding={64} alignItems="center" gap={12} backgroundColor="rgba(13,61,61,0.02)" borderRadius={12} borderStyle="dashed" borderWidth={1} borderColor="rgba(13,61,61,0.1)">
        <Target size={32} color="#9ca3af" />
        <Text fontSize={16} fontWeight="700" color="$brandPrimary">No goals set yet</Text>
        <Text fontSize={13} color="$brandTextSub" textAlign="center">Define your first savings or debt payoff goal above.</Text>
      </YStack>
    )
  }

  return (
    <XStack gap={24} flexWrap="wrap">
      <ConfirmationModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Goal"
        description="Are you sure you want to delete this financial goal? This action cannot be undone."
        confirmText="Delete"
        isHighRisk={true}
      />
      {goals.map((goal) => {
        const current  = Number(goal.current_amount ?? 0)
        const target   = Number(goal.target_amount  ?? 0)
        const progress = target > 0 ? (current / target) * 100 : 0
        const Icon = goal.type === 'savings' ? PiggyBank : CreditCard
        
        return (
          <YStack key={goal.id} width={340} backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.08)" gap={16} shadowColor="black" shadowOpacity={0.03} shadowRadius={5}>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack width={40} height={40} borderRadius={8} backgroundColor="rgba(26,122,122,0.1)" alignItems="center" justifyContent="center">
                <Icon size={20} color="#1A7A7A" />
              </YStack>
              <Button 
                chromeless 
                size="$2" 
                padding={8} 
                onPress={() => setConfirmingDeleteId(goal.id)}
                disabled={deletingId === goal.id}
                icon={deletingId === goal.id ? <Spinner size="small" /> : <Trash2 size={14} color="#9ca3af" />} 
              />
            </XStack>

            <YStack gap={4}>
              <Text fontSize={16} fontWeight="700" color="$brandPrimary">{goal.name}</Text>
              <Text fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>{goal.type}</Text>
            </YStack>

            <YStack gap={8}>
              <XStack justifyContent="space-between" alignItems="flex-end">
                <Text fontSize={13} fontWeight="600" color="$brandText">
                  {formatCurrency(current, goal.currency ?? 'USD')}
                </Text>
                <Text fontSize={12} color="$brandTextSub">
                  Target: {formatCurrency(target, goal.currency ?? 'USD')}
                </Text>
              </XStack>
              
              <YStack height={8} backgroundColor="$brandBg" borderRadius={999} overflow="hidden">
                <YStack 
                  height="100%" 
                  width={`${Math.min(progress, 100)}%`} 
                  backgroundColor={progress >= 100 ? '#059669' : '$brandAccent'}
                  borderRadius={999}
                />
              </YStack>
              
              <XStack justifyContent="space-between">
                <Text fontSize={10} color="$brandTextSub" fontWeight="700">{progress.toFixed(0)}% COMPLETE</Text>
                {goal.deadline && (
                  <XStack gap={4} alignItems="center">
                    <Calendar size={10} color="#9ca3af" />
                    <Text fontSize={10} color="$brandTextSub">{new Date(goal.deadline).toLocaleDateString()}</Text>
                  </XStack>
                )}
              </XStack>
            </YStack>
          </YStack>
        )
      })}
    </XStack>
  )
}
