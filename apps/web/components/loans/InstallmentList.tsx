'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { togglePaymentAction, markAllPaidAction } from '@/app/dashboard/loans/actions'
import { LoanPayment, formatCurrency } from '@stashflow/core'
import { YStack, XStack, Text, Button, Spinner } from 'tamagui'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

interface InstallmentListProps {
  loanId: string
  installments: LoanPayment[]
  currency: string
  installmentAmount: number
  onSuccess?: () => void
}

export default function InstallmentList({ loanId, installments, currency, installmentAmount, onSuccess }: InstallmentListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showMarkAllModal, setShowMarkAllModal] = useState(false)

  async function handleToggle(paymentId: string, currentStatus: string) {
    setLoadingId(paymentId)
    await togglePaymentAction(paymentId, currentStatus as any, loanId)
    setLoadingId(null)
    onSuccess?.()
    router.refresh()
  }

  const handleMarkAllPaid = async () => {
    await markAllPaidAction(loanId)
    onSuccess?.()
    router.refresh()
  }

  return (
    <YStack 
      backgroundColor="$brandWhite" 
      borderWidth={1} 
      borderColor="rgba(13,61,61,0.08)" 
      borderRadius={12} 
      overflow="hidden"
      shadowColor="black"
      shadowOpacity={0.04}
      shadowRadius={10}
    >
      <ConfirmationModal
        isOpen={showMarkAllModal}
        onClose={() => setShowMarkAllModal(false)}
        onConfirm={handleMarkAllPaid}
        title="Mark All as Paid"
        description="Are you sure you want to mark all remaining installments as paid? This action will update your loan balance and cannot be undone in bulk."
        confirmText="Yes, Mark All Paid"
        isHighRisk={true}
      />

      <XStack paddingHorizontal={28} paddingVertical={20} borderBottomWidth={1} borderColor="rgba(13,61,61,0.07)" justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="700" color="$brandText">Repayment Schedule</Text>
        <Button
          size="$2"
          backgroundColor="rgba(5,150,105,0.08)"
          borderColor="rgba(5,150,105,0.2)"
          borderWidth={1}
          hoverStyle={{ backgroundColor: 'rgba(5,150,105,0.15)' }}
          onPress={() => setShowMarkAllModal(true)}
        >
          <Text color="#059669" fontSize={11} fontWeight="700" textTransform="uppercase">Mark All Paid</Text>
        </Button>
      </XStack>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(13,61,61,0.02)' }}>
              <th style={headerStyle}>Due Date</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Amount</th>
              <th style={headerStyle}>Status</th>
              <th style={{ ...headerStyle, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst, idx) => (
              <tr key={inst.id} style={{ borderBottom: idx < installments.length - 1 ? '1px solid rgba(13,61,61,0.05)' : 'none' }}>
                <td style={cellStyle}>
                  {new Date(inst.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>
                  {formatCurrency(installmentAmount, currency)}
                </td>
                <td style={cellStyle}>
                   <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: inst.status === 'paid' ? 'rgba(5,150,105,0.1)' : 'rgba(107,114,128,0.1)',
                    color: inst.status === 'paid' ? '#059669' : '#6b7280'
                  }}>
                    {inst.status}
                  </span>
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <Button
                      size="$2"
                      circular={false}
                      borderRadius={4}
                      backgroundColor={inst.status === 'paid' ? '$brandBg' : '$brandPrimary'}
                      onPress={() => handleToggle(inst.id, inst.status ?? 'pending')}
                      disabled={loadingId === inst.id}
                      hoverStyle={{ backgroundColor: inst.status === 'paid' ? 'rgba(13,61,61,0.08)' : '$brandSecondary' }}
                    >
                    {loadingId === inst.id ? (
                      <Spinner size="small" />
                    ) : (
                      <Text color={inst.status === 'paid' ? '$brandPrimary' : '$brandWhite'} fontSize={12} fontWeight="600">
                        {inst.status === 'paid' ? 'Undo' : 'Mark Paid'}
                      </Text>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </YStack>
  )
}

const headerStyle = {
  padding: '12px 24px',
  textAlign: 'left' as const,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  color: 'rgba(13,61,61,0.4)',
}

const cellStyle = {
  padding: '12px 24px',
  fontSize: 13,
  color: '#444444',
}
