'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoanForm from '@/components/loans/LoanForm'
import InstallmentList from '@/components/loans/InstallmentList'
import { YStack, XStack, Text, Button, Spinner, Heading, Circle } from 'tamagui'
import { formatCurrency, Loan } from '@stashflow/core'
import { Landmark, Plus, ArrowUpRight, Search, Filter } from 'lucide-react-native'
import FormModal from '@/components/ui/FormModal'

interface LoansUIProps {
  loans: Loan[]
  totalActiveDebt: number
  preferredCurrency: string
  rates: Record<string, number>
  onRefresh?: () => void
}

export default function LoansUI({ loans, totalActiveDebt, preferredCurrency, rates, onRefresh }: LoansUIProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const filteredLoans = loans.filter(l => {
    if (filter === 'all') return true
    return l.status === filter
  })

  return (
    <YStack gap={32} width="100%">
      <FormModal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Add New Loan">
        <LoanForm onRefresh={onRefresh} />
      </FormModal>

      {/* 1. Summary Header */}
      <XStack gap={24} flexWrap="wrap">
        <YStack flex={2} minWidth={400} backgroundColor="$brandPrimary" padding={32} borderRadius={16} shadowColor="black" shadowOpacity={0.1} shadowRadius={20} gap={16}>
           <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} fontWeight="700" color="rgba(255,255,255,0.6)" textTransform="uppercase" letterSpacing={1.5}>Total Active Debt</Text>
              <Landmark size={20} color="white" opacity={0.5} />
           </XStack>
           <Heading size="$3xl" color="white" fontWeight="900" letterSpacing={-1}>{formatCurrency(totalActiveDebt, preferredCurrency)}</Heading>
           <Text fontSize={14} color="rgba(255,255,255,0.5)">Across {loans.filter(l => l.status === 'active').length} active loan accounts</Text>
        </YStack>

        <YStack flex={1} minWidth={280} backgroundColor="$brandWhite" padding={24} borderRadius={16} borderWidth={1} borderColor="$borderColor" justifyContent="center" gap={12}>
           <Text fontSize={12} fontWeight="700" color="$brandTextSub" textTransform="uppercase">Management</Text>
           <Button backgroundColor="$brandPrimary" size="$4" onPress={() => setFormOpen(true)} icon={<Plus size={16} color="white" />}>
              <Text color="white" fontWeight="700">ADD LOAN</Text>
           </Button>
           <Text fontSize={12} color="$brandTextSub" textAlign="center">Add or import loan schedules</Text>
        </YStack>
      </XStack>

      {/* 2. Main Body */}
      <XStack gap={32} flexWrap="wrap-reverse" alignItems="flex-start">
        {/* Loan List */}
        <YStack flex={2} minWidth={500} gap={24}>
           <YStack backgroundColor="$brandWhite" borderRadius={16} shadowColor="black" shadowOpacity={0.04} shadowRadius={10} borderWidth={1} borderColor="$borderColor" overflow="hidden">
              <XStack padding={24} borderBottomWidth={1} borderColor="$borderColor" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
                 <XStack gap={16} alignItems="center">
                    <Heading size="$xs" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5} fontWeight="800">Loan Portfolios</Heading>
                    <XStack backgroundColor="$brandBg" borderRadius={8} padding={2}>
                       {(['all', 'active', 'completed'] as const).map(f => (
                         <Button key={f} size="$1" backgroundColor={filter === f ? '$brandPrimary' : 'transparent'} onPress={() => setFilter(f)} chromeless={filter !== f}>
                            <Text fontSize={10} fontWeight="700" textTransform="uppercase" color={filter === f ? 'white' : '#9ca3af'}>{f}</Text>
                         </Button>
                       ))}
                    </XStack>
                 </XStack>
                 <Search size={16} color="#9ca3af" />
              </XStack>

              <YStack>
                 {filteredLoans.length > 0 ? filteredLoans.map((loan, idx) => (
                   <XStack key={loan.id} padding={24} borderBottomWidth={idx < filteredLoans.length - 1 ? 1 : 0} borderColor="rgba(13,61,61,0.03)" alignItems="center" justifyContent="space-between" hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.01)' }} cursor="pointer" onPress={() => setSelectedLoan(loan)}>
                      <XStack gap={16} alignItems="center">
                         <Circle size={40} backgroundColor="rgba(26,122,122,0.1)">
                            <Landmark size={18} color="#1A7A7A" />
                         </Circle>
                         <YStack gap={2}>
                            <Text fontSize={15} fontWeight="700" color="$brandText">{loan.name}</Text>
                            <Text fontSize={11} color="$brandTextSub" opacity={0.6}>{loan.lender || 'Individual'} • {loan.duration_months} mo</Text>
                         </YStack>
                      </XStack>
                      <YStack alignItems="flex-end" gap={2}>
                         <Text fontSize={15} fontWeight="800" color="$brandPrimary">{formatCurrency(loan.principal, loan.currency)}</Text>
                         <Text fontSize={11} color="$brandTextSub" fontWeight="600">{loan.interest_rate}% APR</Text>
                      </YStack>
                   </XStack>
                 )) : (
                   <YStack padding={60} alignItems="center" gap={12}>
                      <Text color="$brandTextSub" fontStyle="italic">No loans found.</Text>
                   </YStack>
                 )}
              </YStack>
           </YStack>
        </YStack>

        {/* Detail Panel / Installments */}
        <YStack flex={1.2} minWidth={350} gap={24}>
           {selectedLoan ? (
             <YStack backgroundColor="$brandWhite" borderRadius={16} shadowColor="black" shadowOpacity={0.04} shadowRadius={10} borderWidth={1} borderColor="$borderColor" overflow="hidden">
                <XStack padding={20} borderBottomWidth={1} borderColor="$borderColor" backgroundColor="rgba(13,61,61,0.01)" justifyContent="space-between" alignItems="center">
                   <YStack>
                      <Text fontSize={13} fontWeight="800" color="$brandPrimary">{selectedLoan.name}</Text>
                      <Text fontSize={10} color="$brandTextSub" textTransform="uppercase" fontWeight="700">Repayment Schedule</Text>
                   </YStack>
                   <Button size="$1" circular icon={<X size={14} />} onPress={() => setSelectedLoan(null)} chromeless />
                </XStack>
                <YStack padding={0}>
                   <InstallmentList loanId={selectedLoan.id} onRefresh={() => { onRefresh?.(); }} />
                </YStack>
             </YStack>
           ) : (
             <YStack backgroundColor="$brandWhite" padding={32} borderRadius={16} borderStyle="dashed" borderWidth={1} borderColor="rgba(13,61,61,0.2)" alignItems="center" gap={16}>
                <ArrowUpRight size={32} color="#9ca3af" opacity={0.3} />
                <Text fontSize={13} color="$brandTextSub" textAlign="center">Select a loan to view its full repayment schedule and mark installments.</Text>
             </YStack>
           )}
        </YStack>
      </XStack>
    </YStack>
  )
}
