import { Region } from '../schema/mod.ts';
import { REGIONAL_THRESHOLDS } from '../math/dti.ts';

/**
 * Defines the contract for regional financial strategy implementations.
 * Each strategy provides region-specific constants and logic for financial health assessment.
 */
export interface RegionalStrategy {
  /** The geographic region this strategy applies to. */
  region: Region;
  /** The primary currency code (ISO 4217) for the region. */
  currency: string;
  /** The debt-to-income ratio threshold considered healthy in this region. */
  dtiThreshold: number;
  /**
   * Generates a human-readable explanation of a given DTI ratio based on regional standards.
   * @param ratio - The calculated debt-to-income ratio (0.0 to 1.0+).
   * @returns A string containing the regional rationale.
   */
  getRationale(ratio: number): string;
}

/**
 * Standard US mortgage DTI threshold. 
 * Often 43% is the maximum for Qualified Mortgages.
 */
export const US_MORTGAGE_THRESHOLD = 0.43;

/**
 * US-specific financial strategy.
 * Follows common US banking and mortgage standards.
 */
export class USStrategy implements RegionalStrategy {
  region: Region = 'US';
  currency = 'USD';
  dtiThreshold = REGIONAL_THRESHOLDS.US.healthy;

  /**
   * Evaluates DTI ratio against US lending benchmarks.
   * 
   * PSEUDOCODE:
   * 1. If ratio is below or equal to the healthy threshold, return healthy status.
   * 2. Else if ratio is below or equal to the mortgage limit (43%), return cautionary status.
   * 3. Else, return high-risk status.
   */
  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Healthy debt-to-income ratio by US standards.';
    // 43% is a critical threshold for US mortgage qualification (Qualified Mortgage rule).
    if (ratio <= US_MORTGAGE_THRESHOLD) return 'Slightly high, but may qualify for some mortgages.';
    return 'High DTI ratio. May find difficulty in securing traditional loans.';
  }
}

/**
 * Philippines-specific financial strategy.
 * Based on local banking practices in the PH.
 */
export class PHStrategy implements RegionalStrategy {
  region: Region = 'PH';
  currency = 'PHP';
  dtiThreshold = REGIONAL_THRESHOLDS.PH.healthy;

  /**
   * Evaluates DTI ratio against PH banking standards.
   * 
   * PSEUDOCODE:
   * 1. If ratio is within standard bank limits, return healthy status.
   * 2. Otherwise, return status indicating it exceeds typical limits.
   */
  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within standard Philippine bank limits for debt servicing.';
    return 'Exceeds typical debt-to-income limits for local banks.';
  }
}

/**
 * Singapore-specific financial strategy.
 * Incorporates Total Debt Servicing Ratio (TDSR) concepts.
 */
export class SGStrategy implements RegionalStrategy {
  region: Region = 'SG';
  currency = 'SGD';
  dtiThreshold = REGIONAL_THRESHOLDS.SG.healthy;

  /**
   * Evaluates DTI ratio against Singapore's TDSR framework.
   * 
   * PSEUDOCODE:
   * 1. If ratio is within TDSR limits, return healthy status.
   * 2. Otherwise, return status indicating TDSR limit breach (typically 55%).
   */
  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within Singapore TDSR (Total Debt Servicing Ratio) limits.';
    // Singapore's MAS enforces a strict TDSR limit, currently at 55%.
    return 'Exceeds TDSR limit of 55%.';
  }
}

/**
 * Japan-specific financial strategy.
 * Reflects Japanese banking standards for debt assessment.
 */
export class JPYStrategy implements RegionalStrategy {
  region: Region = 'JPY';
  currency = 'JPY';
  dtiThreshold = REGIONAL_THRESHOLDS.JPY.healthy;

  /**
   * Evaluates DTI ratio against Japan's banking norms.
   * 
   * PSEUDOCODE:
   * 1. If ratio is within standard limits, return healthy status.
   * 2. Otherwise, return status indicating limit breach.
   */
  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within standard Japan bank limits.';
    return 'Exceeds typical Japan bank limits.';
  }
}

const defaultStrategies: Record<Region, RegionalStrategy> = {
  US: new USStrategy(),
  PH: new PHStrategy(),
  SG: new SGStrategy(),
  JPY: new JPYStrategy(),
};

/**
 * Retrieves the appropriate strategy for a given region.
 * Defaults to US strategy if the region is unsupported.
 * 
 * @param region - The target region.
 * @param registry - Optional custom registry of strategies.
 * @returns The resolved RegionalStrategy.
 */
export function getRegionalStrategy(
  region: Region,
  registry: Record<Region, RegionalStrategy> = defaultStrategies
): RegionalStrategy {
  return registry[region] || registry.US;
}

/**
 * Infers the region based on a currency code.
 * Used when region is not explicitly provided but currency is known.
 * 
 * @param currency - The currency code (e.g., 'PHP', 'SGD', 'JPY').
 * @returns The inferred Region.
 */
export function getRegionByCurrency(currency: string): Region {
  if (currency === 'PHP') return 'PH';
  if (currency === 'SGD') return 'SG';
  if (currency === 'JPY') return 'JPY';
  // Defaulting to US for unknown currencies as a fallback.
  return 'US';
}
