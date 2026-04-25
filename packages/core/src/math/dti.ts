import { Region } from '../schema';

export interface DTIRatioResult {
  ratio: number;
  isHealthy: boolean;
  threshold: number;
  label: string;
}

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
    return {
      ratio: 0,
      isHealthy: true,
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
