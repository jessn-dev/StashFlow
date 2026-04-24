import { RegionalStrategy } from '../interface'
import { DTIRatioResult } from '../../schema'

export class SGStrategy implements RegionalStrategy {
  regionCode = 'SG'
  currency = 'SGD'

  getDTIThresholds() {
    return { healthy: 45, max: 55 } // MAS TDSR Cap is 55%
  }

  applyIncomeHaircut(source: string, amount: number) {
    const isVariable = source.toLowerCase().includes('commission') || source.toLowerCase().includes('bonus')
    return isVariable ? amount * 0.7 : amount
  }

  getRationale(dtiResult: DTIRatioResult) {
    if (dtiResult.status === 'low') return 'Your DTI is healthy for SGD standards (under 45%).'
    if (dtiResult.status === 'medium') return 'You are in the caution zone for SGD. Lenders prefer under 45%.'
    return 'High Risk: Your DTI exceeds the MAS recommended limit of 55%.'
  }
}
