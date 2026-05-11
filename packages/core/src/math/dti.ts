import { Region, DTIRatioResult } from '../schema/mod.ts';

/**
 * Regional thresholds for Debt-to-Income (DTI) health status.
 * 
 * Defines what is considered 'healthy' (ideal) and 'max' (upper limit) for various 
 * financial jurisdictions.
 */
export const REGIONAL_THRESHOLDS: Record<Region, { healthy: number; max: number }> = {
  US: { healthy: 0.36, max: 0.43 },
  PH: { healthy: 0.30, max: 0.40 },
  SG: { healthy: 0.45, max: 0.55 },
  JPY: { healthy: 0.30, max: 0.45 },
};

/**
 * Calculates the Debt-to-Income (DTI) ratio and evaluates financial health.
 * 
 * The DTI ratio is a key metric used by lenders to determine the borrowing capacity 
 * of an individual. It represents the percentage of gross monthly income that goes 
 * toward paying monthly debt obligations.
 * 
 * @param totalMonthlyDebts - Sum of all monthly debt obligations (e.g., mortgages, car loans, credit cards).
 * @param totalGrossMonthlyIncome - Total gross monthly income before taxes and deductions.
 * @param region - The region for threshold comparison. Defaults to 'US'.
 * @returns A DTIRatioResult object containing the calculated ratio and a health assessment.
 */
export function calculateDTIRatio(
  totalMonthlyDebts: number,
  totalGrossMonthlyIncome: number,
  region: Region = 'US'
): DTIRatioResult {
  // PSEUDOCODE: DTI Calculation Flow
  // 1. Check for edge case: No income.
  //    a. If there is debt but no income, the ratio is effectively 100% (max risk).
  //    b. If there is no debt and no income, the ratio is 0% (healthy).
  // 2. Perform division: Debts / Income.
  // 3. Compare the result against regional 'healthy' thresholds.
  // 4. Return the ratio and a human-readable label.

  if (totalGrossMonthlyIncome <= 0) {
    // EDGE CASE: Handling Zero/Negative Income. 
    // If the user has debt but zero income, they are at extreme risk (ratio = 1).
    // If they have neither, they are technically 'healthy' as they have no obligations.
    const isHealthy = totalMonthlyDebts <= 0;
    return {
      ratio: totalMonthlyDebts > 0 ? 1 : 0, 
      isHealthy,
      threshold: REGIONAL_THRESHOLDS[region].healthy,
      label: 'No income',
    };
  }

  const ratio = totalMonthlyDebts / totalGrossMonthlyIncome;
  const limits = REGIONAL_THRESHOLDS[region];
  const isHealthy = ratio <= limits.healthy;

  return {
    ratio,
    isHealthy,
    threshold: limits.healthy,
    label: `${(ratio * 100).toFixed(1)}%`,
  };
}

/**
 * Payload for simulating changes to DTI ratio.
 */
export interface DTISimulationPayload {
  /** Baseline gross monthly income */
  monthlyIncome: number;
  /** Baseline total monthly debt */
  monthlyDebt: number;
  /** Regional context for thresholds */
  region?: Region;
  /** Proposed additional monthly loan obligation */
  addLoanMonthly?: number;
  /** Proposed increase in monthly income */
  addIncomeMonthly?: number;
  /** Amount of monthly debt to be paid off */
  payOffLoanMonthly?: number;
}

/**
 * Results of a DTI simulation.
 */
export interface DTISimulationResult {
  /** The DTI ratio based on current financials */
  current: DTIRatioResult;
  /** The projected DTI ratio after simulation changes */
  projected: DTIRatioResult;
  /** The difference in percentage points between current and projected */
  diffPpt: number;
}

/**
 * Simulates how potential financial changes (e.g., a new loan, a raise) 
 * would impact the user's Debt-to-Income ratio.
 * 
 * @param payload - Current financials and proposed changes.
 * @returns A DTISimulationResult comparing current vs. projected states.
 */
export function simulateDTI(payload: DTISimulationPayload): DTISimulationResult {
  // PSEUDOCODE: DTI Simulation
  // 1. Calculate the 'Current' DTI using the baseline figures.
  // 2. Apply deltas:
  //    a. Projected Income = Current Income + Increase
  //    b. Projected Debt = Current Debt + New Loan - Paid Off Debt
  // 3. Calculate the 'Projected' DTI using adjusted figures.
  // 4. Calculate the difference (delta) in percentage points.

  const region = payload.region || 'US';
  const current = calculateDTIRatio(payload.monthlyDebt, payload.monthlyIncome, region);

  const projectedIncome = payload.monthlyIncome + (payload.addIncomeMonthly ?? 0);
  const projectedDebt = payload.monthlyDebt + (payload.addLoanMonthly ?? 0) - (payload.payOffLoanMonthly ?? 0);

  // We use Math.max(0, ...) to ensure debt doesn't become negative if simulation inputs are unrealistic.
  const projected = calculateDTIRatio(Math.max(0, projectedDebt), projectedIncome, region);

  return {
    current,
    projected,
    diffPpt: projected.ratio - current.ratio,
  };
}

