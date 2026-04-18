import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getLoan, getLoanPayments } from '@stashflow/api'
import { removeLoanAction } from '../actions'
import LoanDetailUI from './LoanDetailUI'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LoanDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let loan
  let payments
  try {
    loan = await getLoan(supabase, id)
    payments = await getLoanPayments(supabase, id)
  } catch (e) {
    redirect('/dashboard/loans')
  }

  if (!loan) redirect('/dashboard/loans')

  async function handleDelete() {
    'use server'
    await removeLoanAction(id)
    redirect('/dashboard/loans')
  }

  return (
    <LoanDetailUI 
      loan={loan}
      payments={payments || []}
      userEmail={user.email || ''}
      onDelete={handleDelete}
    />
  )
}
