'use server'

import { createClient } from '@/utils/supabase/server'
import { addLoan, removeLoan } from '@/modules/loans'
import { FinancialService } from '@stashflow/api'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { 
  LoanInterestType, 
  LoanInterestBasis, 
  LoanCommercialCategory 
} from '@stashflow/core'

export async function addLoanAction(formData: FormData) {
  const loanData = {
    name: formData.get('name') as string,
    principal: Number(formData.get('principal')),
    currency: formData.get('currency') as string,
    interest_rate: Number(formData.get('interest_rate')),
    duration_months: Number(formData.get('duration_months')),
    start_date: formData.get('start_date') as string,
    lender: (formData.get('lender') as string) || undefined,
    country_code: formData.get('country_code') as string,
    commercial_category: formData.get('commercial_category') as LoanCommercialCategory,
    interest_type: formData.get('interest_type') as LoanInterestType,
    interest_basis: formData.get('interest_basis') as LoanInterestBasis,
    payment_start_date: formData.get('payment_start_date') as string || undefined
  }

  try {
    await addLoan(loanData)
  } catch (error) {
    console.error('Failed to add loan:', error)
    return { error: 'Failed to create loan' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/loans')
  return { success: true }
}

export async function removeLoanAction(id: string) {
  try {
    await removeLoan(id)
  } catch (error) {
    return { error: 'Failed to delete loan' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/loans')
  return { success: true }
}

export async function togglePaymentAction(paymentId: string, currentStatus: string, loanId: string) {
  const supabase = await createClient()
  // Using legacy queries for specific atomic updates until FinancialService is fully expanded
  const { togglePaymentStatus } = await import('@stashflow/api')

  try {
    await togglePaymentStatus(supabase, paymentId, currentStatus, loanId)
  } catch (error) {
    console.error('Failed to toggle payment status:', error)
    return { error: 'Failed to update payment' }
  }

  revalidatePath(`/dashboard/loans/${loanId}`)
  revalidatePath('/dashboard/loans')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function markAllPaidAction(loanId: string) {
  const supabase = await createClient()
  const { markAllPaid } = await import('@stashflow/api')

  try {
    await markAllPaid(supabase, loanId)
  } catch (error) {
    console.error('Failed to mark all paid:', error)
    return { error: 'Failed to update payments' }
  }

  revalidatePath(`/dashboard/loans/${loanId}`)
  revalidatePath('/dashboard/loans')
  revalidatePath('/dashboard')
  return { success: true }
}
