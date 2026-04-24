import { createClient } from '@/utils/supabase/client'
import { FinancialService } from '@stashflow/api'

export async function fetchExpenses() {
  const supabase = createClient()
  const service = new FinancialService(supabase)
  return await service.getExpenses()
}

export async function addExpense(data: any) {
  const supabase = createClient()
  const service = new FinancialService(supabase)
  return await service.createExpense(data)
}
