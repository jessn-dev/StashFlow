import { createClient } from '@/utils/supabase/client'

export interface OnboardingData {
  fullName: string
  preferredCurrency: string
  monthlyIncome: number
  primaryGoal?: {
    name: string
    targetAmount: number
    type: 'savings' | 'debt'
  }
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = createClient()
  
  console.log('Starting onboarding completion with data:', data)
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('Auth check failed:', authError)
    throw new Error('User not authenticated')
  }

  // 1. Upsert Profile (Ensure row exists)
  console.log('Upserting profile for user:', user.id)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: data.fullName,
      preferred_currency: data.preferredCurrency,
      budgeting_enabled: true
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Profile upsert failed:', profileError)
    throw profileError
  }

  // 2. Add Initial Income
  if (data.monthlyIncome > 0) {
    console.log('Adding initial income:', data.monthlyIncome)
    const { error: incomeError } = await supabase
      .from('incomes')
      .insert({
        user_id: user.id,
        source: 'Primary Income',
        amount: data.monthlyIncome,
        currency: data.preferredCurrency,
        frequency: 'monthly',
        date: new Date().toISOString().split('T')[0]
      })
    
    if (incomeError) {
      console.error('Income insertion failed:', incomeError)
      throw incomeError
    }
  }

  // 3. Add Primary Goal (Optional)
  if (data.primaryGoal && data.primaryGoal.name.trim()) {
    console.log('Adding primary goal:', data.primaryGoal.name)
    const { error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name: data.primaryGoal.name,
        target_amount: data.primaryGoal.targetAmount,
        current_amount: 0,
        type: data.primaryGoal.type,
        currency: data.preferredCurrency
      })
    
    if (goalError) {
      console.error('Goal insertion failed:', goalError)
      throw goalError
    }
  }

  console.log('Onboarding successfully completed')
  return { success: true }
}
