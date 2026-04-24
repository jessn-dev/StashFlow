import { RegionalStrategy } from '../interface'
import { DTIRatioResult } from '../../schema'

export class PHStrategy implements RegionalStrategy {
  regionCode = 'PH'
  currency = 'PHP'

  getDTIThresholds() {
    return { healthy: 30, max: 40 }
  }

  applyIncomeHaircut(_source: string, amount: number) {
    return amount
  }

  getRationale(dtiResult: DTIRatioResult) {
    if (dtiResult.status === 'low') return 'Your DTI is healthy for PHP standards (under 30%).'
    if (dtiResult.status === 'medium') return 'You are in the caution zone for PHP. Lenders prefer under 30%.'
    return 'High Risk: Your DTI exceeds the PHP recommended limit of 40%.'
  }
}
