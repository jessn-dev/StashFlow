import { Region } from '../schema';
import { REGIONAL_THRESHOLDS } from '../math/dti';

export interface RegionalStrategy {
  region: Region;
  currency: string;
  dtiThreshold: number;
  getRationale(ratio: number): string;
}

export const US_MORTGAGE_THRESHOLD = 0.43;

export class USStrategy implements RegionalStrategy {
  region: Region = 'US';
  currency = 'USD';
  dtiThreshold = REGIONAL_THRESHOLDS.US;

  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Healthy debt-to-income ratio by US standards.';
    if (ratio <= US_MORTGAGE_THRESHOLD) return 'Slightly high, but may qualify for some mortgages.';
    return 'High DTI ratio. May find difficulty in securing traditional loans.';
  }
}

export class PHStrategy implements RegionalStrategy {
  region: Region = 'PH';
  currency = 'PHP';
  dtiThreshold = REGIONAL_THRESHOLDS.PH;

  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within standard Philippine bank limits for debt servicing.';
    return 'Exceeds typical debt-to-income limits for local banks.';
  }
}

export class SGStrategy implements RegionalStrategy {
  region: Region = 'SG';
  currency = 'SGD';
  dtiThreshold = REGIONAL_THRESHOLDS.SG;

  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within Singapore TDSR (Total Debt Servicing Ratio) limits.';
    return 'Exceeds TDSR limit of 55%.';
  }
}

const defaultStrategies: Record<Region, RegionalStrategy> = {
  US: new USStrategy(),
  PH: new PHStrategy(),
  SG: new SGStrategy(),
};

export function getRegionalStrategy(
  region: Region,
  registry: Record<Region, RegionalStrategy> = defaultStrategies
): RegionalStrategy {
  return registry[region] || registry.US;
}

export function getRegionByCurrency(currency: string): Region {
  if (currency === 'PHP') return 'PH';
  if (currency === 'SGD') return 'SG';
  return 'US';
}
