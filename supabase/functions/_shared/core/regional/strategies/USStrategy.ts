import { RegionalStrategy } from '../interface'
import { DTIRatioResult } from '../../schema'

export class USStrategy implements RegionalStrategy {
  regionCode = 'US'
  currency = 'USD'

  getDTIThresholds() {
    return { healthy: 36, max: 43 }
  }

  applyIncomeHaircut(_source: string, amount: number) {
    return amount // Standard US rules usually take 100% of verifiable income
  }

  getRationale(dtiResult: DTIRatioResult) {
    if (dtiResult.status === 'low') return 'Your DTI is healthy for US standards (under 36%).'
    if (dtiResult.status === 'medium') return 'You are in the caution zone for US lenders. Lenders prefer under 36%.'
    return 'High Risk: Your DTI exceeds the US recommended limit of 43%.'
  }
}
