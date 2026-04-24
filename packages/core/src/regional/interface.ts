import { ExpenseCategory, DTIRatioResult } from '../schema'

export interface RegionalStrategy {
  regionCode: string
  currency: string
  
  // DTI Thresholds
  getDTIThresholds(): {
    healthy: number
    max: number
  }

  // Income Haircuts (e.g. for variable income)
  applyIncomeHaircut(source: string, amount: number): number

  // Regional Rationale
  getRationale(dtiResult: DTIRatioResult): string
}
