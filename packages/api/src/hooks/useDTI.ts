'use client'

import { useState, useEffect, useCallback } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@stashflow/core'
import { getDTIRatio, DTIResult } from '../queries/dti'

export function useDTI(supabase: SupabaseClient<Database>) {
  const [data, setData] = useState<DTIResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchDTI = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getDTIRatio(supabase)
      setData(result)
      setError(null)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDTI()
  }, [fetchDTI])

  return { data, loading, error, refresh: fetchDTI }
}
