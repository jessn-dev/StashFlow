import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getLoans, getProfile, fetchRateMap, convertCurrency } from '@stashflow/api'
import LoansUI from './LoansUI'

export default async function LoansPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }

  const [loans, profile, rates] = await Promise.all([
    getLoans(supabase),
    getProfile(supabase),
    fetchRateMap(supabase)
  ])

  const preferredCurrency = profile?.preferred_currency || 'USD'
  
  // Calculate converted total active debt
  const totalActiveDebt = (loans || [])
    .filter(l => l.status === 'active')
    .reduce((sum, loan) => {
      const amount = Number(loan.principal)
      if (isNaN(amount)) return sum
      
      const converted = convertCurrency(amount, loan.currency || 'USD', preferredCurrency, rates || {})
      return sum + (isNaN(converted) ? 0 : converted)
    }, 0)

  return (
    <LoansUI
      loans={loans || []}
      totalActiveDebt={totalActiveDebt}
      preferredCurrency={preferredCurrency}
      rates={rates || {}}
    />
  )
}
