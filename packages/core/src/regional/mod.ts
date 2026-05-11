import { Region } from '../schema/mod.ts';
import { REGIONAL_THRESHOLDS } from '../math/dti.ts';

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
  dtiThreshold = REGIONAL_THRESHOLDS.US.healthy;

  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Healthy debt-to-income ratio by US standards.';
    if (ratio <= US_MORTGAGE_THRESHOLD) return 'Slightly high, but may qualify for some mortgages.';
    return 'High DTI ratio. May find difficulty in securing traditional loans.';
  }
}

export class PHStrategy implements RegionalStrategy {
  region: Region = 'PH';
  currency = 'PHP';
  dtiThreshold = REGIONAL_THRESHOLDS.PH.healthy;

  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within standard Philippine bank limits for debt servicing.';
    return 'Exceeds typical debt-to-income limits for local banks.';
  }
}

export class SGStrategy implements RegionalStrategy {
  region: Region = 'SG';
  currency = 'SGD';
  dtiThreshold = REGIONAL_THRESHOLDS.SG.healthy;

  getRationale(ratio: number): string {
    if (ratio <= this.dtiThreshold) return 'Within Singapore TDSR (Total Debt Servicing Ratio) limits.';
    return 'Exceeds TDSR limit of 55%.';
  }
}

export class JPYStrategy implements RegionalStrategy {
  region: Region = 'JPY';
  currency = 'JPY';
  dtiThreshold = REGIONAL_THRESHOLDS.JPY.healthy;

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

export function getRegionalStrategy(
  region: Region,
  registry: Record<Region, RegionalStrategy> = defaultStrategies
): RegionalStrategy {
  return registry[region] || registry.US;
}

export function getRegionByCurrency(currency: string): Region {
  if (currency === 'PHP') return 'PH';
  if (currency === 'SGD') return 'SG';
  if (currency === 'JPY') return 'JPY';
  return 'US';
}
