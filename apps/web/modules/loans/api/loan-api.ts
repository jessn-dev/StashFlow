import { createClient } from '@/utils/supabase/client'
import { FinancialService } from '@stashflow/api'

export async function fetchLoans() {
  const supabase = createClient()
  const service = new FinancialService(supabase)
  return await service.getLoans()
}

export async function addLoan(data: any) {
  const supabase = createClient()
  const service = new FinancialService(supabase)
  return await service.createLoan(data)
}

export async function removeLoan(id: string) {
  const supabase = createClient()
  const service = new FinancialService(supabase)
  return await service.deleteLoan(id)
}
