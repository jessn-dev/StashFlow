'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoanForm from '@/components/loans/LoanForm'
import InstallmentList from '@/components/loans/InstallmentList'
import { YStack, XStack, Text, Heading, Button, Spinner } from 'tamagui'
import { Loan, LoanPayment, formatCurrency } from '@stashflow/core'
import { convertCurrency, getLoanPayments } from '@stashflow/api'
import { createClient } from '@/utils/supabase/client'
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native'
import { removeLoanAction } from './actions'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

interface LoansUIProps {
  loans: Loan[]
  totalActiveDebt: number
  preferredCurrency: string
  rates?: Record<string, number>
  onRefresh?: () => void
}

export default function LoansUI({ loans: initialLoans, totalActiveDebt, preferredCurrency, rates = {}, onRefresh }: LoansUIProps) {
  const router = useRouter()
  const fmt = (amount: number, loanCurrency: string) => {
    if (loanCurrency === preferredCurrency) return formatCurrency(amount, preferredCurrency)
    const converted = convertCurrency(amount, loanCurrency, preferredCurrency, rates)
    return formatCurrency(converted, preferredCurrency)
  }

  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Sync state with props when router refreshes
  useEffect(() => {
    setLoans(initialLoans)
  }, [initialLoans])

  const filteredLoans = loans.filter(l => {
    if (statusFilter === 'all') return true
    return l.status === statusFilter
  })

  const totalPages = Math.ceil(filteredLoans.length / pageSize)
  const paginatedLoans = filteredLoans.slice((page - 1) * pageSize, page * pageSize)

  // Detail modal state
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  // Sync selected loan data if it changes in the background (e.g. status updates to completed)
  useEffect(() => {
    if (selectedLoan) {
      const updated = loans.find(l => l.id === selectedLoan.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedLoan)) {
        setSelectedLoan(updated)
      }
    }
  }, [loans, selectedLoan])

  const [detailPayments, setDetailPayments] = useState<LoanPayment[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  async function openDetail(loan: Loan) {
    setSelectedLoan(loan)
    setDetailPayments([])
    setDetailLoading(true)
    try {
      const sb = createClient()
      const payments = await getLoanPayments(sb, loan.id)
      setDetailPayments(payments)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setSelectedLoan(null)
    setDetailPayments([])
  }

  async function handleDelete() {
    if (!confirmingDeleteId) return
    setDeleting(true)
    try {
      await removeLoanAction(confirmingDeleteId)
      setLoans(prev => prev.filter(l => l.id !== confirmingDeleteId))
      closeDetail()
      setConfirmingDeleteId(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <ConfirmationModal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Loan"
        description="Are you sure you want to delete this loan and all its associated payments? This action cannot be undone."
        confirmText="Delete Loan"
        isHighRisk={true}
      />
      <XStack gap={32} flexWrap="wrap" alignItems="flex-start" alignSelf="flex-start" width="100%">
        {/* Left Column: Table */}
        <YStack flex={2.5} minWidth={400} gap={20}>
          <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
             <XStack padding={24} backgroundColor="rgba(13,61,61,0.02)" borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={12}>
               <Text fontSize={16} fontWeight="700" color="$brandPrimary">All Loan Entries</Text>
               
               <XStack backgroundColor="rgba(13,61,61,0.05)" borderRadius={8} padding={3} gap={2}>
                 {(['all', 'active', 'completed'] as const).map((status) => (
                   <Button
                     key={status}
                     size="$2"
                     backgroundColor={statusFilter === status ? '$brandPrimary' : 'transparent'}
                     onPress={() => { setStatusFilter(status); setPage(1); }}
                     borderRadius={6}
                     chromeless={statusFilter !== status}
                     paddingHorizontal={12}
                     hoverStyle={{ backgroundColor: statusFilter === status ? '$brandPrimary' : 'rgba(13,61,61,0.1)' }}
                   >
                     <Text 
                       fontSize={11} 
                       fontWeight="700" 
                       textTransform="uppercase" 
                       color={statusFilter === status ? 'white' : 'rgba(13,61,61,0.5)'}
                     >
                       {status}
                     </Text>
                   </Button>
                 ))}
               </XStack>
             </XStack>
             <div style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                   <tr>
                     {['Name', 'Lender', 'Principal', 'Monthly', 'Target End', 'Actual End', 'Status', ''].map((h, i) => (
                       <th key={h} style={{
                         padding: '11px 24px',
                         textAlign: (i >= 1 && i <= 3) ? 'right' : 'left',
                         fontSize: 11,
                         fontWeight: 700,
                         textTransform: 'uppercase',
                         letterSpacing: '0.07em',
                         color: 'rgba(13,61,61,0.4)',
                         borderBottom: '1px solid rgba(13,61,61,0.06)'
                       }}>{h}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {paginatedLoans.map((loan, idx) => (
                     <tr key={loan.id} style={{ borderBottom: idx < paginatedLoans.length - 1 ? '1px solid rgba(13,61,61,0.04)' : 'none' }}>
                       <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{loan.name}</td>
                       <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 13, color: '#6b7280' }}>{loan.lender || '—'}</td>
                       <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#DC2626' }}>{fmt(loan.principal, loan.currency)}</td>
                       <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 13, color: '#444444', fontFamily: 'monospace' }}>{fmt(loan.installment_amount, loan.currency)}</td>
                       <td style={{ padding: '16px 24px', fontSize: 13, color: '#666666' }}>{new Date(loan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                       <td style={{ padding: '16px 24px', fontSize: 13, color: loan.completed_at ? '#059669' : '#666666', fontWeight: loan.completed_at ? '600' : '400' }}>
                         {loan.completed_at ? new Date(loan.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                       </td>
                       <td style={{ padding: '16px 24px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: loan.status === 'active' ? 'rgba(5,150,105,0.1)' : 'rgba(107,114,128,0.1)',
                            color: loan.status === 'active' ? '#059669' : '#6b7280'
                          }}>{loan.status}</span>
                       </td>
                       <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                         <button
                           onClick={() => openDetail(loan)}
                           style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                         >
                           <Text fontSize={13} fontWeight="700" color="$brandAccent">Details →</Text>
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>

             {totalPages > 1 && (
              <XStack padding={16} justifyContent="center" alignItems="center" gap={20} borderTopWidth={1} borderColor="rgba(13,61,61,0.05)">
                <Button size="$2" circular disabled={page === 1} onPress={() => setPage(p => p - 1)} icon={<ChevronLeft size={16} />} />
                <Text fontSize={13} color="$brandTextSub">Page {page} of {totalPages}</Text>
                <Button size="$2" circular disabled={page === totalPages} onPress={() => setPage(p => p + 1)} icon={<ChevronRight size={16} />} />
              </XStack>
            )}
          </YStack>
        </YStack>

        {/* Right Column: Summary + Form */}
        <YStack flex={1} minWidth={320} gap={24}>
          <YStack backgroundColor="$brandWhite" padding={24} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" gap={16}>
             <Heading size="$sm" color="$brandPrimary" textTransform="uppercase" letterSpacing={1.5}>Debt Overview</Heading>
             <YStack gap={12}>
               <YStack>
                 <Text fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Total Active Debt</Text>
                 <Text fontSize={24} fontWeight="900" color="#DC2626">{formatCurrency(totalActiveDebt, preferredCurrency)}</Text>
               </YStack>
             </YStack>
          </YStack>

          <LoanForm />
        </YStack>
      </XStack>

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeDetail() }}
        >
          <div style={{ width: '100%', maxWidth: 860, maxHeight: '90vh', background: 'white', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid rgba(13,61,61,0.08)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0D3D3D' }}>{selectedLoan.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(13,61,61,0.45)', marginTop: 2 }}>
                  {selectedLoan.lender && <span style={{ fontWeight: 600, color: '#0D3D3D', opacity: 0.6 }}>{selectedLoan.lender} · </span>}
                  {selectedLoan.currency} · Created {new Date(selectedLoan.created_at!).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => setConfirmingDeleteId(selectedLoan.id)}
                  disabled={deleting}
                  style={{ background: 'none', border: '1px solid #DC2626', color: '#DC2626', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button onClick={closeDetail} style={{ all: 'unset', cursor: 'pointer', padding: 6, display: 'flex' }}>
                  <X size={20} color="rgba(13,61,61,0.4)" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, padding: '20px 28px', flexWrap: 'wrap', borderBottom: '1px solid rgba(13,61,61,0.06)' }}>
              {[
                { label: 'Principal', value: formatCurrency(selectedLoan.principal, selectedLoan.currency) },
                { label: 'Interest Rate', value: `${selectedLoan.interest_rate}%` },
                { label: 'Monthly Payment', value: formatCurrency(selectedLoan.installment_amount, selectedLoan.currency) },
                { label: 'Duration', value: `${selectedLoan.duration_months} months` },
              ].map(stat => (
                <div key={stat.label} style={{ flex: 1, minWidth: 130, background: 'rgba(13,61,61,0.03)', padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(13,61,61,0.07)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(13,61,61,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0D3D3D', marginTop: 4 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Installment table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {detailLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Spinner size="large" color="$brandAccent" />
                </div>
              ) : (
                <InstallmentList
                  loanId={selectedLoan.id}
                  installments={detailPayments}
                  currency={selectedLoan.currency}
                  installmentAmount={selectedLoan.installment_amount}
                  onSuccess={async () => {
                    await openDetail(selectedLoan);
                    onRefresh?.();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
