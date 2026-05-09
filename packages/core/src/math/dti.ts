import { Region, DTIRatioResult } from '../schema/index.ts';

export const REGIONAL_THRESHOLDS: Record<Region, number> = {
  US: 0.36, // Standard 36% rule
  PH: 0.40, // Local banks usually allow up to 40%
  SG: 0.55, // TDSR (Total Debt Servicing Ratio) is capped at 55%
};

/**
 * Calculates the Debt-to-Income (DTI) ratio.
 * 
 * @param totalMonthlyDebts - Sum of all monthly debt obligations
 * @param totalGrossMonthlyIncome - Total gross monthly income
 * @param region - The region for threshold comparison (defaults to 'US')
 * @returns DTIRatioResult
 */
export function calculateDTIRatio(
  totalMonthlyDebts: number,
  totalGrossMonthlyIncome: number,
  region: Region = 'US'
): DTIRatioResult {
  if (totalGrossMonthlyIncome <= 0) {
    const isHealthy = totalMonthlyDebts <= 0;
    return {
      ratio: totalMonthlyDebts > 0 ? 1 : 0, // 100% or 0% depending on debt
      isHealthy,
      threshold: REGIONAL_THRESHOLDS[region],
      label: 'No income',
    };
  }

  const ratio = totalMonthlyDebts / totalGrossMonthlyIncome;
  const threshold = REGIONAL_THRESHOLDS[region];
  const isHealthy = ratio <= threshold;

  return {
    ratio,
    isHealthy,
    threshold,
    label: `${(ratio * 100).toFixed(1)}%`,
  };
}

export interface DTISimulationPayload {
  monthlyIncome: number;
  monthlyDebt: number;
  region?: Region;
  addLoanMonthly?: number;
  addIncomeMonthly?: number;
  payOffLoanMonthly?: number;
}

export interface DTISimulationResult {
  current: DTIRatioResult;
  projected: DTIRatioResult;
  diffPpt: number;
}

/**
 * Projects DTI ratio based on potential financial changes.
 * 
 * @param payload - Current financials and proposed changes
 * @returns DTISimulationResult
 */
export function simulateDTI(payload: DTISimulationPayload): DTISimulationResult {
  const region = payload.region || 'US';
  const current = calculateDTIRatio(payload.monthlyDebt, payload.monthlyIncome, region);

  const projectedIncome = payload.monthlyIncome + (payload.addIncomeMonthly ?? 0);
  const projectedDebt = payload.monthlyDebt + (payload.addLoanMonthly ?? 0) - (payload.payOffLoanMonthly ?? 0);

  const projected = calculateDTIRatio(Math.max(0, projectedDebt), projectedIncome, region);

  return {
    current,
    projected,
    diffPpt: projected.ratio - current.ratio,
  };
}
