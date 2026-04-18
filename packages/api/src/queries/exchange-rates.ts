import { SupabaseClient } from '@supabase/supabase-js'
import { Database, ExchangeRate } from '@stashflow/core'

export interface RateMap {
  [pair: string]: number
}

/**
 * Fetches all exchange rates and builds a lookup map (e.g. { 'USD_EUR': 0.92 })
 */
export async function fetchRateMap(supabase: SupabaseClient<Database>): Promise<RateMap> {
  const { data, error } = await supabase.from('exchange_rates').select('*')
  if (error) throw error

  const map: RateMap = {}
  data.forEach((r: ExchangeRate) => {
    map[`${r.base}_${r.target}`] = Number(r.rate)
  })
  return map
}

/**
 * Converts an amount from source to target currency using the provided rate map.
 * Supports direct lookup and multi-step via USD as bridge.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: RateMap
): number {
  const val = Number(amount)
  if (isNaN(val)) return 0
  if (from === to) return val
  if (!rates || Object.keys(rates).length === 0) return val

  // 1. Direct lookup
  const directKey = `${from}_${to}`
  if (rates[directKey]) return val * rates[directKey]

  // 2. Inverse lookup
  const inverseKey = `${to}_${from}`
  if (rates[inverseKey]) return val / rates[inverseKey]

  // 3. Bridge via USD
  if (from !== 'USD' && to !== 'USD') {
    const toUsdKey = `${from}_USD`
    const fromUsdKey = `USD_${to}`
    
    let amountInUsd = val
    if (rates[toUsdKey]) {
      amountInUsd = val * rates[toUsdKey]
    } else if (rates[`USD_${from}`]) {
      amountInUsd = val / rates[`USD_${from}`]
    } else {
      return val // Fallback
    }

    if (rates[fromUsdKey]) {
      return amountInUsd * rates[fromUsdKey]
    } else if (rates[`${to}_USD`]) {
      return amountInUsd / rates[`${to}_USD`]
    }
  }

  return val // Fallback to 1:1 if rate not found
}
