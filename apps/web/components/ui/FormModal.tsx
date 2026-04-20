'use client'

import { YStack, XStack, Text, Button } from 'tamagui'
import { X } from 'lucide-react-native'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function FormModal({ isOpen, onClose, title, children }: FormModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        padding: '40px 20px',
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <YStack
        width="100%"
        maxWidth={540}
        backgroundColor="$brandWhite"
        borderRadius={16}
        overflow="hidden"
        borderWidth={1}
        borderColor="rgba(13,61,61,0.1)"
        boxShadow="0 20px 60px rgba(0,0,0,0.15)"
      >
        <XStack
          paddingHorizontal={24}
          paddingVertical={16}
          borderBottomWidth={1}
          borderColor="rgba(13,61,61,0.08)"
          justifyContent="space-between"
          alignItems="center"
          backgroundColor="rgba(13,61,61,0.01)"
        >
          <Text fontSize={16} fontWeight="700" color="$brandPrimary">{title}</Text>
          <Button
            chromeless
            padding={6}
            onPress={onClose}
            icon={<X size={18} color="rgba(13,61,61,0.4)" />}
          />
        </XStack>
        {children}
      </YStack>
    </div>
  )
}
