'use client'

import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import { AlertTriangle, X } from 'lucide-react-native'
import { useState } from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isHighRisk?: boolean
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isHighRisk = false
}: ConfirmationModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        padding: '20px'
      }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <YStack
        width="100%"
        maxWidth={400}
        backgroundColor="#151f2e"
        borderRadius={20}
        overflow="hidden"
        boxShadow="0 25px 80px rgba(0,0,0,0.5)"
        borderWidth={1}
        borderColor="rgba(255,255,255,0.08)"
      >
        {/* Header */}
        <XStack padding={24} justifyContent="space-between" alignItems="center" borderBottomWidth={1} borderColor="rgba(255,255,255,0.05)">
          <XStack gap={12} alignItems="center">
            {isHighRisk && <AlertTriangle size={20} color="#f87171" />}
            <Text fontSize={18} fontWeight="700" color="white">{title}</Text>
          </XStack>
          <Button
            chromeless
            padding={8}
            onPress={onClose}
            disabled={loading}
            icon={<X size={18} color="rgba(255,255,255,0.4)" />}
          />
        </XStack>

        {/* Content */}
        <YStack padding={24} gap={12}>
          <Text fontSize={15} color="rgba(255,255,255,0.7)" lineHeight={22}>
            {description}
          </Text>
        </YStack>

        {/* Footer */}
        <XStack padding={20} gap={12} backgroundColor="rgba(0,0,0,0.2)">
          <Button
            flex={1}
            backgroundColor="transparent"
            borderWidth={1}
            borderColor="rgba(255,255,255,0.1)"
            onPress={onClose}
            disabled={loading}
            hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text color="white" fontWeight="600">{cancelText}</Text>
          </Button>
          <Button
            flex={1}
            backgroundColor={isHighRisk ? '#DC2626' : '#1A7A7A'}
            onPress={handleConfirm}
            disabled={loading}
            hoverStyle={{ backgroundColor: isHighRisk ? '#EF4444' : '#239B9B' }}
            icon={loading ? <Spinner size="small" color="white" /> : undefined}
          >
            <Text color="white" fontWeight="700">{loading ? 'Processing...' : confirmText}</Text>
          </Button>
        </XStack>
      </YStack>
    </div>
  )
}
