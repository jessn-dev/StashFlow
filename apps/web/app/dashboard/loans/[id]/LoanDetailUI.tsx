'use client'

import PageLayout from '@/components/layout/PageLayout'
import InstallmentList from '@/components/loans/InstallmentList'
import { YStack, XStack, Text, Heading } from 'tamagui'
import { Loan, LoanPayment, formatCurrency } from '@stashflow/core'

interface LoanDetailUIProps {
  loan: Loan
  payments: LoanPayment[]
  userEmail: string
  onDelete: () => void
}

export default function LoanDetailUI({ loan, payments, userEmail, onDelete }: LoanDetailUIProps) {
  return (
    <PageLayout 
      title={loan.name} 
      userEmail={userEmail}
      backTo={{ label: 'Back to Loans', href: '/dashboard/loans' }}
    >
      <XStack justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={16}>
        <YStack gap={4}>
          <Text fontSize={14} color="$brandTextSub">{loan.currency} Loan • Created {new Date(loan.created_at!).toLocaleDateString()}</Text>
        </YStack>

        <form action={onDelete}>
          <button type="submit" style={{ 
            background: 'none', 
            border: '1px solid #DC2626', 
            color: '#DC2626',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}>
            Delete Loan
          </button>
        </form>
      </XStack>

      <XStack gap={16} flexWrap="wrap">
        {[
          { label: 'Principal', value: formatCurrency(loan.principal, loan.currency) },
          { label: 'Interest Rate', value: `${loan.interest_rate}%` },
          { label: 'Monthly Payment', value: formatCurrency(loan.installment_amount, loan.currency) },
          { label: 'Duration', value: `${loan.duration_months} Months` },
        ].map((stat) => (
          <YStack key={stat.label} flex={1} minWidth={150} backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.08)">
            <Text fontSize={10} fontWeight="700" color="$brandPrimary" opacity={0.5} textTransform="uppercase" letterSpacing={1}>{stat.label}</Text>
            <Text fontSize={20} fontWeight="700" color="$brandPrimary">{stat.value}</Text>
          </YStack>
        ))}
      </XStack>

      <InstallmentList 
        loanId={loan.id} 
        installments={payments || []} 
        currency={loan.currency} 
        installmentAmount={loan.installment_amount} 
      />
    </PageLayout>
  )
}
